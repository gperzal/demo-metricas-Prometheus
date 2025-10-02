const express = require('express');
const client = require('prom-client');
const app = express();
const port = 8080;

// Crea un registro para las métricas
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Crea un contador para las peticiones HTTP
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

app.get('/', (req, res) => {
  httpRequestCounter.inc({ method: 'GET', path: '/', status_code: 200 });
  res.send('¡Hola, Mundo!');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`App escuchando en el puerto ${port}`);
});