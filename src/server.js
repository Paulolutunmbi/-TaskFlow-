const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` TaskFlow Application running on port ${PORT}`);
  console.log(` Web UI:        http://localhost:${PORT}/`);
  console.log(` Health Check:  http://localhost:${PORT}/health`);
  console.log(` API Endpoint:  http://localhost:${PORT}/api/tasks`);
  console.log(`===============================================`);
});

// Handle graceful shutdown signals (SIGINT, SIGTERM)
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down TaskFlow...`);
  server.close(() => {
    console.log('TaskFlow HTTP server closed.');
    process.exit(0);
  });

  // Force close after 5 seconds if still pending
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
