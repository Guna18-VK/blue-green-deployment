const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Environment variables
const APP_VERSION = process.env.APP_VERSION || 'v1';
const ENVIRONMENT = process.env.ENVIRONMENT || 'blue';

// Middleware
// Allow requests from file:// (local dev), localhost, and any deployed origin
app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins in dev
  methods: ['GET']
}));
app.use(express.json());
app.use(morgan('combined')); // HTTP request logging

// ─── Routes ────────────────────────────────────────────────────────────────

// Health check endpoint — used by Blue-Green validation step
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: APP_VERSION,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main API endpoint
app.get('/api/message', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/message — version: ${APP_VERSION}, env: ${ENVIRONMENT}`);
  res.status(200).json({
    message: `Hello from Backend ${APP_VERSION}`,
    version: APP_VERSION,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend ${APP_VERSION} running on port ${PORT} [${ENVIRONMENT} environment]`);
});
