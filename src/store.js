const mongoose = require('mongoose');
const { Task, VALID_PRIORITIES, VALID_STATUSES } = require('./models/Task');
const { Counter, getNextSequence, setSequence } = require('./models/Counter');

/**
 * Checks if Mongoose is currently connected to MongoDB.
 * @returns {boolean}
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// In-memory test double implementation for isolated unit testing
const testDoubleStore = {
  currentId: 1,
  tasks: [],

  getAll({ status, priority, search } = {}) {
    let result = [...this.tasks];

    if (status && status !== 'all') {
      result = result.filter(t => t.status.toLowerCase() === status.toLowerCase());
    }

    if (priority && priority !== 'all') {
      result = result.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getById(id) {
    const numericId = Number(id);
    return this.tasks.find(t => t.id === numericId) || null;
  },

  create({ title, description = '', priority = 'medium', status = 'todo', createdBy = 'Anonymous' }) {
    const now = new Date().toISOString();
    const newTask = {
      id: this.currentId++,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      priority: priority.toLowerCase(),
      status: status.toLowerCase(),
      createdBy: createdBy.trim(),
      createdAt: now,
      updatedAt: now
    };
    this.tasks.push(newTask);
    return newTask;
  },

  update(id, updates) {
    const numericId = Number(id);
    const index = this.tasks.findIndex(t => t.id === numericId);
    if (index === -1) return null;

    const existing = this.tasks[index];
    const updatedTask = {
      ...existing,
      ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
      ...(updates.priority !== undefined ? { priority: updates.priority.toLowerCase() } : {}),
      ...(updates.status !== undefined ? { status: updates.status.toLowerCase() } : {}),
      updatedAt: new Date().toISOString()
    };
    this.tasks[index] = updatedTask;
    return updatedTask;
  },

  remove(id) {
    const numericId = Number(id);
    const index = this.tasks.findIndex(t => t.id === numericId);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    return true;
  },

  reset(initialSeed = []) {
    this.currentId = 1;
    if (initialSeed.length > 0) {
      this.tasks = initialSeed.map(item => ({
        ...item,
        id: item.id || this.currentId++
      }));
    } else {
      this.tasks = [];
    }
  }
};

let explicitTestDouble = null;

function isTestEnvironment() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.execArgv.some(arg => arg.includes('test'))
  );
}

/**
 * Returns true if test double mode is currently active.
 * Only allowed in test environment; production and development never fall back to mock data.
 * @returns {boolean}
 */
function isTestDoubleActive() {
  if (explicitTestDouble !== null) return explicitTestDouble;
  return isTestEnvironment() && !isDbConnected();
}

function enableTestDouble() {
  explicitTestDouble = true;
}

function disableTestDouble() {
  explicitTestDouble = false;
}

/**
 * Ensures a valid storage backend is ready. Throws 503 error if database is unavailable
 * and test double is not explicitly active.
 */
function assertReady() {
  if (isDbConnected()) return;
  if (isTestDoubleActive()) return;

  const error = new Error('Database is unavailable');
  error.name = 'DatabaseConnectionError';
  error.status = 503;
  throw error;
}

/**
 * Retrieves tasks with optional filtering and keyword search.
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
async function getAll({ status, priority, search } = {}) {
  assertReady();

  if (isTestDoubleActive() && !isDbConnected()) {
    return testDoubleStore.getAll({ status, priority, search });
  }

  const filter = {};

  if (status && status !== 'all') {
    filter.status = status.toLowerCase();
  }

  if (priority && priority !== 'all') {
    filter.priority = priority.toLowerCase();
  }

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } }
    ];
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
  return tasks.map(t => {
    delete t._id;
    delete t.__v;
    return t;
  });
}

/**
 * Retrieves a single task by numeric ID or MongoDB ObjectId.
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  assertReady();

  if (isTestDoubleActive() && !isDbConnected()) {
    return testDoubleStore.getById(id);
  }

  const numericId = Number(id);
  let query;
  if (!Number.isNaN(numericId) && numericId > 0 && Number.isInteger(numericId)) {
    query = { id: numericId };
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    query = { _id: id };
  } else {
    return null;
  }

  const task = await Task.findOne(query).lean();
  if (!task) return null;
  delete task._id;
  delete task.__v;
  return task;
}

/**
 * Creates and persists a new task document in MongoDB Atlas.
 * @param {Object} taskData
 * @returns {Promise<Object>}
 */
async function create({ title, description = '', priority = 'medium', status = 'todo', createdBy }) {
  assertReady();

  if (isTestDoubleActive() && !isDbConnected()) {
    return testDoubleStore.create({ title, description, priority, status, createdBy });
  }

  const nextId = await getNextSequence('taskId');
  const taskDoc = await Task.create({
    id: nextId,
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    priority: priority.toLowerCase(),
    status: status.toLowerCase(),
    createdBy: createdBy.trim()
  });

  const taskObj = taskDoc.toObject();
  delete taskObj._id;
  delete taskObj.__v;
  return taskObj;
}

/**
 * Updates an existing task by ID.
 * @param {number|string} id
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
async function update(id, updates) {
  assertReady();

  if (isTestDoubleActive() && !isDbConnected()) {
    return testDoubleStore.update(id, updates);
  }

  const numericId = Number(id);
  let query;
  if (!Number.isNaN(numericId) && numericId > 0 && Number.isInteger(numericId)) {
    query = { id: numericId };
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    query = { _id: id };
  } else {
    return null;
  }

  const task = await Task.findOne(query);
  if (!task) return null;

  if (updates.title !== undefined) task.title = updates.title.trim();
  if (updates.description !== undefined) task.description = updates.description.trim();
  if (updates.priority !== undefined) task.priority = updates.priority.toLowerCase();
  if (updates.status !== undefined) task.status = updates.status.toLowerCase();

  await task.save();
  const obj = task.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
}

/**
 * Removes a task by ID.
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  assertReady();

  if (isTestDoubleActive() && !isDbConnected()) {
    return testDoubleStore.remove(id);
  }

  const numericId = Number(id);
  let query;
  if (!Number.isNaN(numericId) && numericId > 0 && Number.isInteger(numericId)) {
    query = { id: numericId };
  } else if (mongoose.Types.ObjectId.isValid(id)) {
    query = { _id: id };
  } else {
    return false;
  }

  const result = await Task.deleteOne(query);
  return result.deletedCount > 0;
}

/**
 * Resets storage state. Clears database collections or in-memory double.
 * @param {Array} [initialSeed=[]]
 * @returns {Promise<void>}
 */
async function reset(initialSeed = []) {
  if (isDbConnected()) {
    await Task.deleteMany({});
    await Counter.deleteMany({});

    let maxId = 0;
    if (initialSeed.length > 0) {
      for (let i = 0; i < initialSeed.length; i++) {
        const item = initialSeed[i];
        const taskId = item.id || (i + 1);
        if (taskId > maxId) maxId = taskId;
        await Task.create({
          id: taskId,
          title: item.title,
          description: item.description || '',
          priority: item.priority || 'medium',
          status: item.status || 'todo',
          createdBy: item.createdBy || 'Test User',
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date()
        });
      }
    }
    await setSequence('taskId', maxId);
    return;
  }

  if (isTestDoubleActive()) {
    testDoubleStore.reset(initialSeed);
  }
}

module.exports = {
  VALID_PRIORITIES,
  VALID_STATUSES,
  getAll,
  getById,
  create,
  update,
  remove,
  reset,
  isDbConnected,
  isTestDoubleActive,
  enableTestDouble,
  disableTestDouble
};
