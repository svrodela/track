#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <arduinoFFT.h>

#define SAMPLES 128
#define SAMPLING_FREQ 500

#define SDA_PIN 8
#define SCL_PIN 9

double vReal[SAMPLES];
double vImag[SAMPLES];

ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, SAMPLES, SAMPLING_FREQ);

Adafruit_MPU6050 mpu;

const char* ssid = "";
const char* password = "";

const char* serverName = "https://track-1-v9ut.onrender.com/telemetry";

float rms;
float peak;
float crestFactor;
float kurtosis;
float dominantFreq;
float temp;

void setup() {

  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  WiFi.begin(ssid, password);

  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado");

  if (!mpu.begin()) {
    Serial.println("Error iniciando MPU6050");
    while (1);
  }

  Serial.println("MPU6050 listo");
}

void loop() {

  sensors_event_t a, g, t;

  double sumSq = 0;
  double sumFourth = 0;

  peak = 0;

  for (int i = 0; i < SAMPLES; i++) {

    mpu.getEvent(&a, &g, &t);

    double vibration = sqrt(
      a.acceleration.x * a.acceleration.x +
      a.acceleration.y * a.acceleration.y +
      a.acceleration.z * a.acceleration.z
    );

    vReal[i] = vibration;
    vImag[i] = 0;

    sumSq += vibration * vibration;
    sumFourth += pow(vibration, 4);

    if (vibration > peak) {
      peak = vibration;
    }

    delayMicroseconds(1000000 / SAMPLING_FREQ);
  }

  // RMS
  rms = sqrt(sumSq / SAMPLES);

  // Crest Factor
  crestFactor = peak / rms;

  // Kurtosis
  kurtosis = (sumFourth / SAMPLES) / pow(rms, 4);

  // FFT
  FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);
  FFT.compute(FFTDirection::Forward);
  FFT.complexToMagnitude();

  dominantFreq = FFT.majorPeak();
  // Temperatura
  mpu.getEvent(&a, &g, &t);
  temp = t.temperature;

  Serial.println("------ Datos Vibración ------");

  Serial.print("RMS: ");
  Serial.println(rms);

  Serial.print("Peak: ");
  Serial.println(peak);

  Serial.print("Crest Factor: ");
  Serial.println(crestFactor);

  Serial.print("Kurtosis: ");
  Serial.println(kurtosis);

  Serial.print("Frecuencia dominante: ");
  Serial.println(dominantFreq);

  Serial.print("Temperatura: ");
  Serial.println(temp);

  sendData();

  delay(5000);
}

void sendData() {

  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String json = "{";

    json += "\"rms\":" + String(rms, 3) + ",";
    json += "\"peak\":" + String(peak, 3) + ",";
    json += "\"crest\":" + String(crestFactor, 3) + ",";
    json += "\"kurtosis\":" + String(kurtosis, 3) + ",";
    json += "\"freq\":" + String(dominantFreq, 2) + ",";
    json += "\"temp\":" + String(temp, 2);

    json += "}";

    Serial.println("Enviando:");
    Serial.println(json);

    int httpResponseCode = http.POST(json);

    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);

    String response = http.getString();
    Serial.println(response);

    http.end();
  }
}