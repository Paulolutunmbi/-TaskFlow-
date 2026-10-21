const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const store = require('../src/store');

describe('Tasks API (/api/tasks)', () => {
  let server;
  let baseUrl;

  before((_, done) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  // Reset store to known state before each test
  beforeEach(async () => {
    const now = Date.now();
    await store.reset([
      {
        title: 'Initial Seed Task 1',
        description: 'First seed task description',
        priority: 'high',
        status: 'todo',
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString()
      },
      {
        title: 'Initial Seed Task 2',
        description: 'Second seed task description',
        priority: 'medium',
        status: 'completed',
        createdAt: new Date(now - 10000).toISOString(),
        updatedAt: new Date(now - 10000).toISOString()
      }
    ]);
  });

  describe('GET /api/tasks', () => {
    it('should return 200 OK and an array of all tasks', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.ok(Array.isArray(data), 'Result must be an array');
      assert.equal(data.length, 2);
      assert.equal(data[0].title, 'Initial Seed Task 1');
    });

    it('should filter tasks by status', async () => {
      const res = await fetch(`${baseUrl}/api/tasks?status=completed`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.length, 1);
      assert.equal(data[0].status, 'completed');
      assert.equal(data[0].title, 'Initial Seed Task 2');
    });

    it('should filter tasks by priority', async () => {
      const res = await fetch(`${baseUrl}/api/tasks?priority=high`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.length, 1);
      assert.equal(data[0].priority, 'high');
      assert.equal(data[0].title, 'Initial Seed Task 1');
    });

    it('should search tasks by keyword', async () => {
      const res = await fetch(`${baseUrl}/api/tasks?search=First`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.length, 1);
      assert.equal(data[0].title, 'Initial Seed Task 1');
    });

    it('should return 400 for invalid status filter', async () => {
      const res = await fetch(`${baseUrl}/api/tasks?status=unknown-status`);
      assert.equal(res.status, 400);

      const data = await res.json();
      assert.ok(data.error.includes('Invalid status filter'));
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return 200 and the task for an existing ID', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/1`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.id, 1);
      assert.equal(data.title, 'Initial Seed Task 1');
    });

    it('should return 404 for a non-existent task ID', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/9999`);
      assert.equal(res.status, 404);

      const data = await res.json();
      assert.ok(data.error);
    });

    it('should return 400 for an invalid ID format', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/invalid-id`);
      assert.equal(res.status, 400);

      const data = await res.json();
      assert.ok(data.error);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task and return 201 Created', async () => {
      const payload = {
        title: 'New Deployment Step',
        description: 'Verify deployment artifact integrity',
        priority: 'high',
        status: 'todo'
      };

      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id > 0);
      assert.equal(data.title, payload.title);
      assert.equal(data.description, payload.description);
      assert.equal(data.priority, payload.priority);
      assert.equal(data.status, payload.status);
      assert.ok(data.createdAt);
      assert.ok(data.updatedAt);
    });

    it('should use default priority (medium) and status (todo) if not provided', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Task with defaults' })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.priority, 'medium');
      assert.equal(data.status, 'todo');
      assert.equal(data.description, '');
    });

    it('should return 400 when title is missing or empty', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Title is required'));
    });

    it('should return 400 when title exceeds 100 characters', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'a'.repeat(101) })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('100 characters'));
    });

    it('should return 400 for invalid priority', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Valid Title', priority: 'critical' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Invalid priority'));
    });

    it('should return 400 for invalid status', async () => {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Valid Title', status: 'archived' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Invalid status'));
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task details and return 200 OK', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'low',
        status: 'in-progress'
      };

      const res = await fetch(`${baseUrl}/api/tasks/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, 1);
      assert.equal(data.title, 'Updated Title');
      assert.equal(data.description, 'Updated Description');
      assert.equal(data.priority, 'low');
      assert.equal(data.status, 'in-progress');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/8888`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Should Fail' })
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.ok(data.error);
    });

    it('should return 400 when empty body is sent', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('At least one field'));
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task and return 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/1`, {
        method: 'DELETE'
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, 1);

      // Verify task is gone
      const checkRes = await fetch(`${baseUrl}/api/tasks/1`);
      assert.equal(checkRes.status, 404);
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const res = await fetch(`${baseUrl}/api/tasks/9999`, {
        method: 'DELETE'
      });

      assert.equal(res.status, 404);
    });
  });
});
