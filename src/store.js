/**
 * In-memory task store.
 * Note: Data is kept in-memory and will reset when the application restarts.
 */

let currentId = 1;

// Seed realistic initial tasks for immediate usability
let tasks = [
  {
    id: currentId++,
    title: 'Set up local container environment',
    description: 'Verify Node.js runtime and test scripts before building the container image.',
    priority: 'high',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: currentId++,
    title: 'Establish automated testing baseline',
    description: 'Validate /health and task CRUD operations using Node.js built-in test runner.',
    priority: 'medium',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: currentId++,
    title: 'Prepare Kubernetes manifest definitions',
    description: 'Draft deployment and service configurations for staging cluster deployment.',
    priority: 'low',
    status: 'todo',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['todo', 'in-progress', 'completed'];

function getAll({ status, priority, search } = {}) {
  let result = [...tasks];

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

  // Sort by newest first by default
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getById(id) {
  const numericId = Number(id);
  return tasks.find(t => t.id === numericId) || null;
}

function create({ title, description = '', priority = 'medium', status = 'todo' }) {
  const now = new Date().toISOString();
  const newTask = {
    id: currentId++,
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    priority: priority.toLowerCase(),
    status: status.toLowerCase(),
    createdAt: now,
    updatedAt: now
  };

  tasks.push(newTask);
  return newTask;
}

function update(id, updates) {
  const numericId = Number(id);
  const taskIndex = tasks.findIndex(t => t.id === numericId);
  if (taskIndex === -1) return null;

  const existing = tasks[taskIndex];
  const updatedTask = {
    ...existing,
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    ...(updates.priority !== undefined ? { priority: updates.priority.toLowerCase() } : {}),
    ...(updates.status !== undefined ? { status: updates.status.toLowerCase() } : {}),
    updatedAt: new Date().toISOString()
  };

  tasks[taskIndex] = updatedTask;
  return updatedTask;
}

function remove(id) {
  const numericId = Number(id);
  const taskIndex = tasks.findIndex(t => t.id === numericId);
  if (taskIndex === -1) return false;

  tasks.splice(taskIndex, 1);
  return true;
}

function reset(initialSeed = []) {
  currentId = 1;
  if (initialSeed.length > 0) {
    tasks = initialSeed.map(item => ({
      ...item,
      id: currentId++
    }));
  } else {
    tasks = [];
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
  reset
};
