const mongoose = require('mongoose');

/**
 * Sanitizes a MongoDB connection URI or string containing a URI by masking passwords.
 * Example: mongodb+srv://admin:secretPass@cluster.net -> mongodb+srv://admin:*****@cluster.net
 *
 * @param {string} input - URI or error message text
 * @returns {string} Sanitized string safe for terminal logging
 */
function sanitizeMongoUri(input) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/(mongodb(?:\+srv)?:\/\/[^:@\s]+):([^@\s]+)@/gi, '$1:*****@');
}

/**
 * Sanitizes an Error or string for safe logging without exposing secrets.
 * @param {Error|string} err
 * @returns {string}
 */
function sanitizeError(err) {
  if (!err) return '';
  const message = typeof err === 'string' ? err : (err.message || String(err));
  return sanitizeMongoUri(message);
}

/**
 * Connects to MongoDB Atlas using Mongoose.
 * Validates the connection string, applies database name if configured,
 * and logs progress without exposing credentials.
 *
 * @param {Object} [options]
 * @param {string} [options.uri] - Override MONGODB_URI
 * @param {string} [options.database] - Override MONGODB_DATABASE
 * @param {boolean} [options.silent=false] - Suppress console logs
 * @param {number} [options.serverSelectionTimeoutMS=5000]
 * @param {number} [options.connectTimeoutMS=10000]
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(options = {}) {
  const uri = options.uri !== undefined ? options.uri : process.env.MONGODB_URI;
  const dbName = options.database !== undefined ? options.database : process.env.MONGODB_DATABASE;
  const silent = Boolean(options.silent);

  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    const errorMsg = 'MONGODB_URI environment variable is not defined. Please set MONGODB_URI in your .env file or environment.';
    if (!silent) {
      console.error(`[database] Error: ${errorMsg}`);
    }
    const err = new Error(errorMsg);
    err.code = 'ERR_MISSING_MONGODB_URI';
    throw err;
  }

  const cleanUri = uri.trim();
  const safeUri = sanitizeMongoUri(cleanUri);

  if (!silent) {
    const dbTarget = dbName ? ` (database: "${dbName.trim()}")` : '';
    console.log(`[database] Connecting to MongoDB Atlas: ${safeUri}${dbTarget}...`);
  }

  const connectOptions = {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
    connectTimeoutMS: options.connectTimeoutMS || 10000
  };

  if (dbName && typeof dbName === 'string' && dbName.trim() !== '') {
    connectOptions.dbName = dbName.trim();
  }

  try {
    const conn = await mongoose.connect(cleanUri, connectOptions);
    if (!silent) {
      const host = conn.connection.host || 'cluster';
      const activeDb = conn.connection.name || dbName || 'default';
      console.log(`[database] MongoDB connected successfully to host: ${host} (db: ${activeDb})`);
    }
    return conn;
  } catch (err) {
    const safeErrorMsg = sanitizeError(err);
    if (!silent) {
      console.error(`[database] MongoDB connection failure: ${safeErrorMsg}`);
    }
    const connectionError = new Error(`Database connection failed: ${safeErrorMsg}`);
    connectionError.code = err.code || 'ERR_DB_CONNECTION';
    connectionError.originalError = err;
    throw connectionError;
  }
}

/**
 * Disconnects cleanly from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Returns the current database connection state and metadata.
 * @returns {{ state: string, readyState: number, isConnected: boolean, host: string|null, name: string|null }}
 */
function getDatabaseStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const readyState = mongoose.connection.readyState;
  return {
    state: stateMap[readyState] || 'unknown',
    readyState,
    isConnected: readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  sanitizeMongoUri,
  sanitizeError
};
