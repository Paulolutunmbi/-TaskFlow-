require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB, getDatabaseStatus } = require('./db');

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * Checks if Node.js was started with watch mode (--watch flag or npm run dev).
 */
function isWatchModeActive() {
  return Boolean(
    process.env.WATCH_REPORT_DEPENDENCIES ||
    process.env.npm_lifecycle_event === 'dev' ||
    process.execArgv.some(arg => arg.startsWith('--watch'))
  );
}

/**
 * Determines runtime environment / mode.
 */
function getMode() {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  const isDev = isWatchModeActive() || process.env.npm_lifecycle_event === 'dev';
  return isDev ? 'development' : 'production';
}

/**
 * Attempts to bind an http.Server instance to a specific port.
 * Returns a Promise that resolves with the server when listening,
 * or rejects when an error (such as EADDRINUSE) occurs.
 */
function bindServer(appInstance, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);

    function onError(err) {
      server.removeListener('listening', onListening);
      reject(err);
    }

    function onListening() {
      server.removeListener('error', onError);
      resolve(server);
    }

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

/**
 * Attaches graceful shutdown handlers to the server instance and database.
 */
function setupGracefulShutdown(server) {
  let isShuttingDown = false;

  async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Gracefully shutting down TaskFlow...`);

    server.close(async (err) => {
      if (err) {
        console.error('Error during HTTP server shutdown:', err.message);
      } else {
        console.log('TaskFlow HTTP server closed.');
      }

      try {
        await disconnectDB();
        console.log('MongoDB connection closed cleanly.');
      } catch (dbErr) {
        console.error('Error disconnecting from MongoDB:', dbErr.message);
      }

      process.exit(err ? 1 : 0);
    });

    // Force close after 5 seconds if still pending
    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 5000).unref();
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

/**
 * Prints the development/startup banner with connection details.
 */
function printStartupBanner({ port, mode, isWatchMode, dbStatus }) {
  const localUrl = `http://localhost:${port}/`;
  const healthUrl = `http://localhost:${port}/health`;
  const readyUrl = `http://localhost:${port}/health/ready`;
  const apiUrl = `http://localhost:${port}/api/tasks`;
  const dbLabel = dbStatus && dbStatus.isConnected
    ? `MongoDB Atlas (${dbStatus.host || 'connected'})`
    : `Disconnected / Test Double (${dbStatus ? dbStatus.state : 'unconnected'})`;

  console.log(`==================================================`);
  console.log(` TaskFlow Server`);
  console.log(`--------------------------------------------------`);
  console.log(` Environment:     ${mode}`);
  console.log(` Port:            ${port}`);
  console.log(` Local URL:       ${localUrl}`);
  console.log(` Health Check:    ${healthUrl}`);
  console.log(` Readiness Check: ${readyUrl}`);
  console.log(` API Endpoint:    ${apiUrl}`);
  console.log(` Database:        ${dbLabel}`);
  console.log(` File Watching:   ${isWatchMode ? 'enabled' : 'disabled'}`);
  console.log(`==================================================`);
}

/**
 * Starts the server with database connection and automatic/explicit port selection.
 */
async function startServer(options = {}) {
  const isExplicitPort = options.isExplicitPort !== undefined
    ? options.isExplicitPort
    : Boolean(process.env.PORT);

  const rawPort = options.port !== undefined
    ? options.port
    : (process.env.PORT || DEFAULT_PORT);

  const basePort = parseInt(rawPort, 10);
  if (isNaN(basePort) || basePort < 0 || basePort > 65535) {
    const errorMsg = `Invalid PORT: "${rawPort}". Port must be an integer between 0 and 65535.`;
    if (options.exitOnError !== false) {
      console.error(`[server] Error: ${errorMsg}`);
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  const maxAttempts = options.maxAttempts !== undefined
    ? options.maxAttempts
    : parseInt(process.env.PORT_RANGE || process.env.MAX_PORT_ATTEMPTS || DEFAULT_MAX_ATTEMPTS, 10);

  const silent = Boolean(options.silent);
  const appInstance = options.app || app;
  const isWatchMode = options.isWatchMode !== undefined ? options.isWatchMode : isWatchModeActive();
  const mode = options.mode || getMode();

  // Set NODE_ENV if not explicitly configured
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = mode;
  }

  // Determine whether to connect to MongoDB:
  // In development/production, DB connection is required before serving traffic.
  // In test mode, only connect if explicit or if MONGODB_URI is provided.
  const shouldConnectDb = options.connectDb !== undefined
    ? options.connectDb
    : (mode !== 'test' || Boolean(options.mongoUri || process.env.MONGODB_URI));

  if (shouldConnectDb) {
    try {
      await connectDB({
        uri: options.mongoUri,
        database: options.mongoDatabase,
        silent
      });
    } catch (err) {
      if (options.exitOnError !== false) {
        console.error(`[server] Startup failed due to database error: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  }

  let server;
  let selectedPort;

  if (isExplicitPort) {
    try {
      server = await bindServer(appInstance, basePort);
      selectedPort = server.address().port;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        const errorMsg = `Port ${basePort} is already in use. An explicit PORT was configured, so automatic fallback is disabled.`;
        if (options.exitOnError !== false) {
          console.error(`[server] Error: ${errorMsg}`);
          process.exit(1);
        }
        const customErr = new Error(errorMsg);
        customErr.code = 'EADDRINUSE';
        throw customErr;
      }
      if (options.exitOnError !== false) {
        console.error(`[server] Failed to bind to port ${basePort}: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  } else {
    let currentPort = basePort;
    const maxPort = basePort + maxAttempts;

    while (currentPort <= maxPort) {
      try {
        server = await bindServer(appInstance, currentPort);
        selectedPort = server.address().port;
        break;
      } catch (err) {
        if (err.code === 'EADDRINUSE') {
          if (currentPort < maxPort) {
            if (!silent) {
              console.log(`[server] Port ${currentPort} is occupied, trying port ${currentPort + 1}...`);
            }
            currentPort++;
          } else {
            const errorMsg = `No available ports found in range ${basePort}-${maxPort}. Terminating.`;
            if (options.exitOnError !== false) {
              console.error(`[server] Error: ${errorMsg}`);
              process.exit(1);
            }
            const customErr = new Error(errorMsg);
            customErr.code = 'EADDRINUSE';
            throw customErr;
          }
        } else {
          if (options.exitOnError !== false) {
            console.error(`[server] Failed to bind to port ${currentPort}: ${err.message}`);
            process.exit(1);
          }
          throw err;
        }
      }
    }
  }

  const dbStatus = getDatabaseStatus();

  if (!silent) {
    printStartupBanner({ port: selectedPort, mode, isWatchMode, dbStatus });
  }

  if (options.setupShutdown !== false) {
    setupGracefulShutdown(server);
  }

  return { server, port: selectedPort, mode, isWatchMode, dbStatus };
}

// Automatically start if executed directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[server] Startup failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  startServer,
  bindServer,
  isWatchModeActive,
  getMode,
  printStartupBanner,
  DEFAULT_PORT,
  DEFAULT_MAX_ATTEMPTS
};
