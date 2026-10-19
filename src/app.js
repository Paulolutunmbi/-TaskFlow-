const express = require('express');
const path = require('path');
const healthRouter = require('./routes/health');
const tasksRouter = require('./routes/tasks');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.use('/health', healthRouter);

// Tasks REST API
app.use('/api/tasks', tasksRouter);

// 404 handler for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Fallback for client-side HTML routing
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Centralized error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled server error:', err.message);
  }

  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
