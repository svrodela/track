const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { db } = require('./fire');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ================================
   HOME
================================ */

app.get('/', (req, res) => {
  res.send(`
  <h2>API IoT Mantenimiento Predictivo</h2>

  <ul>
    <li>POST /telemetry</li>
    <li>GET /devices</li>
    <li>GET /last/:device</li>
    <li>GET /history/:device</li>
    <li>GET /grafica/:device</li>
    <li>POST /device/status</li>
    <li>GET /device/status/:device</li>
    
     <li>GANADO/li>
    <li>POST /livestock/telemetry</li>
    <li>GET /livestock/devices</li>
    <li>GET /livestock/last/:device</li>
    <li>GET /livestock/history/:device</li>
    <li>GET /livestock/analysis/:device</li>
 </ul>
  `);
});


app.post('/telemetry', async (req, res) => {

  try {

    const {
      rms,
      peak,
      crest,
      kurtosis,
      freq,
      temp
    } = req.body;

    if (
      rms === undefined ||
      peak === undefined ||
      crest === undefined ||
      kurtosis === undefined ||
      freq === undefined ||
      temp === undefined
    ) {
      return res.status(400).json({
        status: "error",
        message: "faltan datos"
      });
    }

    const data = {
      rms: Number(rms),
      peak: Number(peak),
      crest: Number(crest),
      kurtosis: Number(kurtosis),
      freq: Number(freq),
      temp: Number(temp),
      timestamp: new Date()
    };

    const doc = await db.collection("telemetry").add(data);

    res.json({
      status: "ok",
      id: doc.id,
      data: data
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      error: error.message
    });

  }

});

// obtener toda la telemetría

app.get('/telemetry', async (req, res) => {

  try {

    const snapshot = await db
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    let data = [];

    snapshot.forEach(doc => {

      data.push({
        id: doc.id,
        ...doc.data()
      });

    });

    res.json({
      status: "ok",
      total: data.length,
      data: data
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      error: error.message
    });

  }

});

//grafica 20 registros

// gráfica últimos 20 registros formato array

app.get('/grafica', async (req, res) => {

  try {

    const snapshot = await db
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    let data = [];

    snapshot.forEach(doc => {

      const d = doc.data();

      data.push({

        rms: d.rms,
        peak: d.peak,
        crest: d.crest,
        kurtosis: d.kurtosis,
        freq: d.freq,
        temp: d.temp,

        timestamp: {
          _seconds: d.timestamp._seconds,
          _nanoseconds: d.timestamp._nanoseconds
        }

      });

    });

    // ordenar cronológicamente
    data.reverse();

    res.json(data);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      error: error.message
    });

  }

});


//lista de dispositivos

app.get('/devices', async (req, res) => {

  try {

    const snapshot = await db.collection('devices').get();

    let devices = [];

    snapshot.forEach(doc => {

      devices.push(doc.id);

    });

    res.send(devices);

  } catch (error) {

    res.status(500).send(error);

  }

});

//ultimo registro

app.get('/last/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('devices')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let data = [];

    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});

//historial

app.get('/history/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('devices')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    let data = [];

    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});

// gráficas

app.get('/grafica/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('devices')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    let data = [];

    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});

//estado del dispositivo

app.post('/device/status', async (req, res) => {

  try {

    const { device_id, status } = req.body;

    const data = {
      status: status,
      timestamp: new Date()
    };

    await db
      .collection('devices')
      .doc(device_id)
      .collection('status')
      .add(data);

    res.send({
      status: "ok",
      device: device_id
    });

  } catch (error) {

    res.status(500).send(error);

  }

});

//consulta el estado

app.get('/device/status/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('devices')
      .doc(device)
      .collection('status')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let data = [];

    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});

//// TELEMETRIA PARA GANADO
app.post('/livestock/telemetry', async (req, res) => {

  try {

    const {
      deviceId,
      ax,
      ay,
      az,
      pitch,
      roll,
      magnitud
    } = req.body;

    if (
      !deviceId ||
      ax === undefined ||
      ay === undefined ||
      az === undefined ||
      pitch === undefined ||
      roll === undefined ||
      magnitud === undefined
    ) {
      return res.status(400).json({
        status: "error",
        message: "faltan datos"
      });
    }

    const data = {
      ax: Number(ax),
      ay: Number(ay),
      az: Number(az),
      pitch: Number(pitch),
      roll: Number(roll),
      magnitud: Number(magnitud),
      timestamp: new Date()
    };

    const doc = await db
      .collection("livestock")
      .doc(deviceId)
      .collection("telemetry")
      .add(data);

    res.json({
      status: "ok",
      id: doc.id,
      data: data
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "error",
      error: error.message
    });

  }

});
app.get('/livestock/last/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('livestock')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let data = [];

    snapshot.forEach(doc => data.push(doc.data()));

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});

app.get('/livestock/history/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('livestock')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    let data = [];

    snapshot.forEach(doc => data.push(doc.data()));

    res.send(data);

  } catch (error) {

    res.status(500).send(error);

  }

});


app.get('/livestock/analysis/:device', async (req, res) => {

  try {

    const device = req.params.device;

    const snapshot = await db
      .collection('livestock')
      .doc(device)
      .collection('telemetry')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    let registros = [];

    snapshot.forEach(doc => registros.push(doc.data()));

    if (registros.length === 0) {
      return res.json({ status: "sin datos" });
    }

    // lógica simple
    let inmovil = registros.filter(r => r.magnitud < 0.5);
    let acostado = registros.filter(r => Math.abs(r.roll) > 45);

    const porcentajeInmovil = (inmovil.length / registros.length) * 100;
    const porcentajeAcostado = (acostado.length / registros.length) * 100;

    let estado = "NORMAL";

    if (porcentajeInmovil > 70 && porcentajeAcostado > 50) {
      estado = "POSTRADA";
    } else if (porcentajeInmovil > 50) {
      estado = "INACTIVA";
    }

    res.json({
      total: registros.length,
      porcentajeInmovil,
      porcentajeAcostado,
      estado
    });

  } catch (error) {

    res.status(500).send(error);

  }

});

app.get('/livestock/devices', async (req, res) => {

  try {

    const snapshot = await db.collection('livestock').get();

    let devices = [];

    snapshot.forEach(doc => devices.push(doc.id));

    res.send(devices);

  } catch (error) {

    res.status(500).send(error);

  }

});
//arrancar servidor

app.listen(PORT, () => {

  console.log(`Servidor IoT corriendo en puerto ${PORT}`);

});