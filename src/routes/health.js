const express = require('express');
const router = express.Router();
const packageJson = require('../../package.json');
const { getDatabaseStatus } = require('../db');
const store = require('../store');

const startTime = Date.now();

// GET /health - Main application and database health check
router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const dbStatus = getDatabaseStatus();

  // Healthy if DB connected, or in test environment using isolated test double
  const isHealthy = dbStatus.isConnected || store.isTestDoubleActive();
  const statusCode = isHealthy ? 200 : 503;
  const statusString = isHealthy ? 'ok' : 'degraded';

  res.status(statusCode).json({
    status: statusString,
    app: 'TaskFlow',
    version: packageJson.version || '1.0.0',
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.state,
      connected: dbStatus.isConnected
    }
  });
});

// GET /health/ready - Readiness probe for Kubernetes / load balancers
router.get('/ready', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isReady = dbStatus.isConnected || store.isTestDoubleActive();

  if (isReady) {
    return res.status(200).json({
      status: 'ready',
      database: dbStatus.state,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    database: dbStatus.state,
    error: 'Database connection is not established',
    timestamp: new Date().toISOString()
  });
});

// GET /health/live - Basic liveness probe
router.get('/live', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'alive',
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
