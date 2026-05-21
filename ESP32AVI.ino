#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#define SDA_PIN 10
#define SCL_PIN 9

// LED indicador
#define LED_PIN 2

// =======================
// WIFI
// =======================
const char* ssid = "Edificio C1";
const char* password = "";

// Endpoint
const char* serverName = "https://track-1-v9ut.onrender.com/telemetry";

// =======================
// MPU6050
// =======================
Adafruit_MPU6050 mpu;

// Variables globales sensores
sensors_event_t a, g, t;

// Variables aceleración
float ax, ay, az;

// Variables cálculo
float magnitud;
float pitch, roll;

// =======================
// CONTROL TIEMPO
// =======================
unsigned long lastSend = 0;
unsigned long interval = 3000; // 3 segundos

void setup() {

  pinMode(LED_PIN, OUTPUT);

  Serial.begin(115200);
  delay(1000);

  // =======================
  // I2C
  // =======================
  Wire.begin(SDA_PIN, SCL_PIN);

  // =======================
  // WIFI
  // =======================
  WiFi.begin(ssid, password);

  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado");
  Serial.println(WiFi.localIP());

  // =======================
  // MPU6050
  // =======================
  if (!mpu.begin()) {
    Serial.println("Error iniciando MPU6050");

    while (1) {
      delay(10);
    }
  }

  Serial.println("MPU6050 listo");

  // Configuración sensor
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
}

void loop() {

  // Esperar intervalo
  if (millis() - lastSend < interval) {
    return;
  }

  lastSend = millis();

  // Leer sensores
  mpu.getEvent(&a, &g, &t);

  // =======================
  // ACELERACIÓN
  // =======================
  ax = a.acceleration.x;
  ay = a.acceleration.y;
  az = a.acceleration.z;

  // Magnitud vibración
  magnitud = sqrt(ax * ax + ay * ay + az * az);

  // Validar lectura
  if (isnan(magnitud) || magnitud < 0.2) {
    Serial.println("Lectura inválida");
    return;
  }

  // =======================
  // ANGULOS
  // =======================
  pitch = atan2(ax, sqrt(ay * ay + az * az)) * 180.0 / PI;

  roll = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI;

  // =======================
  // DEBUG SERIAL
  // =======================
  Serial.println("========== DATOS ==========");

  Serial.print("AX: ");
  Serial.println(ax);

  Serial.print("AY: ");
  Serial.println(ay);

  Serial.print("AZ: ");
  Serial.println(az);

  Serial.print("Magnitud: ");
  Serial.println(magnitud);

  Serial.print("Pitch: ");
  Serial.println(pitch);

  Serial.print("Roll: ");
  Serial.println(roll);

  Serial.print("Temperatura: ");
  Serial.println(t.temperature);

  // =======================
  // ENVIO
  // =======================
  sendData();
}

void sendData() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado");
    return;
  }

  HTTPClient http;

  http.begin(serverName);

  http.addHeader("Content-Type", "application/json");

  // =======================
  // VARIABLES TIPO TRACTIAN
  // =======================

  // RMS aproximado
  float rms = magnitud;

  // Peak máximo eje
  float peak = max(max(abs(ax), abs(ay)), abs(az));

  // Crest Factor = Peak / RMS
  float crest = 0;

  if (rms > 0.001) {
    crest = peak / rms;
  }

  // Kurtosis simplificada
  float mean = (abs(ax) + abs(ay) + abs(az)) / 3.0;

  float variance =
    (
      pow(ax - mean, 2) +
      pow(ay - mean, 2) +
      pow(az - mean, 2)
    ) / 3.0;

  float stddev = sqrt(variance);

  float kurtosis = 0;

  if (stddev > 0.001) {

    kurtosis =
      (
        pow((ax - mean) / stddev, 4) +
        pow((ay - mean) / stddev, 4) +
        pow((az - mean) / stddev, 4)
      ) / 3.0;
  }

  // Frecuencia aproximada usando giroscopio
  float freq = abs(g.gyro.z);

  // Temperatura MPU6050
  float temp = t.temperature;

  // Timestamp UNIX simple
  unsigned long seconds = millis() / 1000;

  // =======================
  // JSON
  // =======================

String json = "{";

  json += "\"rms\":";
  json += String(rms, 2);
  json += ",";

  json += "\"peak\":";
  json += String(peak, 2);
  json += ",";

  json += "\"crest\":";
  json += String(crest, 2);
  json += ",";

  json += "\"kurtosis\":";
  json += String(kurtosis, 2);
  json += ",";

  json += "\"freq\":";
  json += String(freq, 2);
  json += ",";

  json += "\"temp\":";
  json += String(temp, 2);
  json += ",";

  json += "\"timestamp\":{";

  json += "\"_seconds\":";
  json += String(seconds);
  json += ",";

  json += "\"_nanoseconds\":842000000";

  json += "}";

  json += "}";

 

  // =======================
  // DEBUG JSON
  // =======================

  Serial.println("JSON enviado:");
  Serial.println(json);

  // =======================
  // POST
  // =======================

  int httpResponseCode = http.POST(json);

  Serial.print("HTTP Response: ");
  Serial.println(httpResponseCode);

  String response = http.getString();

  Serial.println("Respuesta servidor:");
  Serial.println(response);

  // =======================
  // LED OK
  // =======================

  if (httpResponseCode == 200) {

    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
  }

  http.end();
}
