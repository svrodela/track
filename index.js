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
  </ul>
  `);
});


app.post('/telemetry', async (req, res) => {

  try {

    const {
      device_id,
      rms,
      peak,
      freq,
      temp
    } = req.body;

    const data = {
      rms: Number(rms),
      peak: Number(peak),
      freq: Number(freq),
      temp: Number(temp),
      timestamp: new Date()
    };

    await db
      .collection('devices')
      .doc(device_id)
      .collection('telemetry')
      .add(data);

    res.send({
      status: "ok",
      device: device_id,
      data
    });

  } catch (error) {

    console.error(error);

    res.status(500).send({
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

//arrancar servidor

app.listen(PORT, () => {

  console.log(`Servidor IoT corriendo en puerto ${PORT}`);

});