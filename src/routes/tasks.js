const express = require('express');
const router = express.Router();
const store = require('../store');

// GET /api/tasks - List tasks with optional query filters
router.get('/', (req, res) => {
  const { status, priority, search } = req.query;

  // Validate filter values if provided
  if (status && status !== 'all' && !store.VALID_STATUSES.includes(status.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid status filter. Allowed values: ${store.VALID_STATUSES.join(', ')}`
    });
  }

  if (priority && priority !== 'all' && !store.VALID_PRIORITIES.includes(priority.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid priority filter. Allowed values: ${store.VALID_PRIORITIES.join(', ')}`
    });
  }

  const tasks = store.getAll({ status, priority, search });
  res.status(200).json(tasks);
});

// GET /api/tasks/:id - Get single task
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Task ID must be a positive number' });
  }

  const task = store.getById(id);
  if (!task) {
    return res.status(404).json({ error: `Task with ID ${id} not found` });
  }

  res.status(200).json(task);
});

// POST /api/tasks - Create new task
router.post('/', (req, res) => {
  const { title, description, priority, status } = req.body || {};

  // Validate title
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required and must not be empty' });
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length > 100) {
    return res.status(400).json({ error: 'Title must not exceed 100 characters' });
  }

  // Validate description
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  if (description && description.trim().length > 500) {
    return res.status(400).json({ error: 'Description must not exceed 500 characters' });
  }

  // Validate priority
  const taskPriority = (priority || 'medium').toLowerCase();
  if (!store.VALID_PRIORITIES.includes(taskPriority)) {
    return res.status(400).json({
      error: `Invalid priority. Allowed values: ${store.VALID_PRIORITIES.join(', ')}`
    });
  }

  // Validate status
  const taskStatus = (status || 'todo').toLowerCase();
  if (!store.VALID_STATUSES.includes(taskStatus)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${store.VALID_STATUSES.join(', ')}`
    });
  }

  const newTask = store.create({
    title: trimmedTitle,
    description: description || '',
    priority: taskPriority,
    status: taskStatus
  });

  res.status(201).json(newTask);
});

// PUT /api/tasks/:id - Update existing task
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Task ID must be a positive number' });
  }

  const existingTask = store.getById(id);
  if (!existingTask) {
    return res.status(404).json({ error: `Task with ID ${id} not found` });
  }

  const { title, description, priority, status } = req.body || {};

  if (
    title === undefined &&
    description === undefined &&
    priority === undefined &&
    status === undefined
  ) {
    return res.status(400).json({
      error: 'At least one field (title, description, priority, status) must be provided for update'
    });
  }

  const updates = {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ error: 'Title must not exceed 100 characters' });
    }
    updates.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }
    if (description.trim().length > 500) {
      return res.status(400).json({ error: 'Description must not exceed 500 characters' });
    }
    updates.description = description.trim();
  }

  if (priority !== undefined) {
    const p = String(priority).toLowerCase();
    if (!store.VALID_PRIORITIES.includes(p)) {
      return res.status(400).json({
        error: `Invalid priority. Allowed values: ${store.VALID_PRIORITIES.join(', ')}`
      });
    }
    updates.priority = p;
  }

  if (status !== undefined) {
    const s = String(status).toLowerCase();
    if (!store.VALID_STATUSES.includes(s)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${store.VALID_STATUSES.join(', ')}`
      });
    }
    updates.status = s;
  }

  const updatedTask = store.update(id, updates);
  res.status(200).json(updatedTask);
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Task ID must be a positive number' });
  }

  const existingTask = store.getById(id);
  if (!existingTask) {
    return res.status(404).json({ error: `Task with ID ${id} not found` });
  }

  store.remove(id);
  res.status(200).json({
    message: 'Task deleted successfully',
    id
  });
});

module.exports = router;
