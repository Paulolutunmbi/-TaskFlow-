const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { Task, VALID_PRIORITIES, VALID_STATUSES } = require('../src/models/Task');
const { Counter, getNextSequence } = require('../src/models/Counter');
const { sanitizeMongoUri, sanitizeError, connectDB } = require('../src/db');
const store = require('../src/store');
const app = require('../src/app');

describe('Database & Mongoose Integration Tests', () => {
  describe('Credential Sanitization', () => {
    it('should mask passwords in mongodb+srv URIs', () => {
      const rawUri = 'mongodb+srv://adminUser:SuperSecret123@cluster0.abcde.mongodb.net/taskflow?retryWrites=true&w=majority';
      const sanitized = sanitizeMongoUri(rawUri);
      assert.ok(!sanitized.includes('SuperSecret123'), 'Sanitized URI must not contain the password');
      assert.ok(sanitized.includes('adminUser:*****@'), 'Password should be masked with asterisks');
      assert.ok(sanitized.includes('cluster0.abcde.mongodb.net'), 'Hostname must be preserved');
    });

    it('should mask passwords in standard mongodb:// URIs', () => {
      const rawUri = 'mongodb://appUser:MyPassWord999@10.0.0.5:27017/taskflow';
      const sanitized = sanitizeMongoUri(rawUri);
      assert.ok(!sanitized.includes('MyPassWord999'));
      assert.ok(sanitized.includes('appUser:*****@'));
    });

    it('should handle URIs without passwords without corruption', () => {
      const rawUri = 'mongodb://localhost:27017/taskflow';
      const sanitized = sanitizeMongoUri(rawUri);
      assert.equal(sanitized, rawUri);
    });

    it('should sanitize errors containing credentials', () => {
      const errorMsg = 'Failed to connect to mongodb+srv://dbUser:VerySecretPass@cluster.mongodb.net/test';
      const sanitized = sanitizeError(new Error(errorMsg));
      assert.ok(!sanitized.includes('VerySecretPass'));
      assert.ok(sanitized.includes('dbUser:*****@'));
    });
  });

  describe('connectDB Connection Handling', () => {
    it('should throw ERR_MISSING_MONGODB_URI when MONGODB_URI is not provided', async () => {
      await assert.rejects(
        async () => {
          await connectDB({ uri: '', silent: true });
        },
        (err) => {
          assert.equal(err.code, 'ERR_MISSING_MONGODB_URI');
          assert.match(err.message, /MONGODB_URI environment variable is not defined/i);
          return true;
        }
      );
    });

    it('should fail with sanitized error and not expose password on unreachable host', async () => {
      const fakeUriWithSecret = 'mongodb://fakeUser:SecretPassword123@127.0.0.1:65534/test?connectTimeoutMS=100';
      await assert.rejects(
        async () => {
          await connectDB({
            uri: fakeUriWithSecret,
            serverSelectionTimeoutMS: 500,
            connectTimeoutMS: 500,
            silent: true
          });
        },
        (err) => {
          assert.ok(!err.message.includes('SecretPassword123'), 'Error message must not expose password');
          assert.ok(err.message.includes('fakeUser:*****@') || err.message.includes('Database connection failed'));
          return true;
        }
      );
    });
  });

  describe('Mongoose Task Model Schema Validation', () => {
    it('should validate a valid task document', async () => {
      const doc = new Task({
        id: 1,
        title: 'Valid Task Title',
        description: 'Valid description text',
        priority: 'high',
        status: 'todo'
      });

      const err = await doc.validate().catch(e => e);
      assert.equal(err, undefined);
      assert.equal(doc.id, 1);
      assert.equal(doc.title, 'Valid Task Title');
    });

    it('should fail validation when title is missing or empty string', async () => {
      const docEmpty = new Task({
        id: 2,
        title: '   ',
        priority: 'medium',
        status: 'todo'
      });

      const err = await docEmpty.validate().catch(e => e);
      assert.ok(err, 'Expected validation error for empty title');
      assert.ok(err.errors.title);
      assert.match(err.errors.title.message, /Title is required/i);
    });

    it('should fail validation when title exceeds 100 characters', async () => {
      const docLong = new Task({
        id: 3,
        title: 'A'.repeat(101),
        priority: 'medium',
        status: 'todo'
      });

      const err = await docLong.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors.title);
      assert.match(err.errors.title.message, /100 characters/i);
    });

    it('should fail validation when description exceeds 500 characters', async () => {
      const docLongDesc = new Task({
        id: 4,
        title: 'Title',
        description: 'B'.repeat(501),
        priority: 'medium',
        status: 'todo'
      });

      const err = await docLongDesc.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors.description);
      assert.match(err.errors.description.message, /500 characters/i);
    });

    it('should fail validation for invalid priority enum', async () => {
      const docBadPriority = new Task({
        id: 5,
        title: 'Title',
        priority: 'urgent',
        status: 'todo'
      });

      const err = await docBadPriority.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors.priority);
      assert.match(err.errors.priority.message, /Invalid priority/i);
    });

    it('should fail validation for invalid status enum', async () => {
      const docBadStatus = new Task({
        id: 6,
        title: 'Title',
        priority: 'medium',
        status: 'archived'
      });

      const err = await docBadStatus.validate().catch(e => e);
      assert.ok(err);
      assert.ok(err.errors.status);
      assert.match(err.errors.status.message, /Invalid status/i);
    });

    it('should transform task to remove _id and __v in toJSON', () => {
      const doc = new Task({
        id: 7,
        title: 'Transform Test',
        priority: 'low',
        status: 'todo'
      });

      const json = doc.toJSON();
      assert.equal(json._id, undefined);
      assert.equal(json.__v, undefined);
      assert.equal(json.id, 7);
      assert.equal(json.title, 'Transform Test');
    });
  });

  describe('Database Failure & Non-Fallback Guarantees', () => {
    let server;
    let baseUrl;

    before((_, done) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        done();
      });
    });

    after((_, done) => {
      store.enableTestDouble(); // restore for other tests
      server.close(done);
    });

    it('should return 503 Service Unavailable when database is disconnected and test double is disabled', async () => {
      store.disableTestDouble();

      try {
        const res = await fetch(`${baseUrl}/api/tasks`);
        assert.equal(res.status, 503);

        const data = await res.json();
        assert.equal(data.error, 'Database service unavailable');
      } finally {
        store.enableTestDouble();
      }
    });

    it('should return 503 on /health/ready when database is disconnected and test double is disabled', async () => {
      store.disableTestDouble();

      try {
        const res = await fetch(`${baseUrl}/health/ready`);
        assert.equal(res.status, 503);

        const data = await res.json();
        assert.equal(data.status, 'not_ready');
        assert.ok(data.error);
      } finally {
        store.enableTestDouble();
      }
    });

    it('should return 200 on /health/live regardless of database connection state', async () => {
      const res = await fetch(`${baseUrl}/health/live`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.status, 'alive');
      assert.ok(data.uptime);
    });
  });
});
