const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

describe('GET /health endpoint', () => {
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

  it('should return HTTP 200 OK and application health metadata', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(contentType && contentType.includes('application/json'), 'Content-Type must be application/json');

    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.app, 'TaskFlow');
    assert.ok(typeof data.version === 'string', 'Version should be a string');
    assert.ok(typeof data.uptime === 'string', 'Uptime should be a string');
    assert.ok(typeof data.timestamp === 'string', 'Timestamp should be an ISO string');
    assert.ok(typeof data.environment === 'string', 'Environment should be reported');
  });
});
