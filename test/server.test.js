const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startServer, bindServer, DEFAULT_PORT } = require('../src/server');
const app = require('../src/app');

describe('Server & Port Selection Tests', () => {
  const activeServers = [];

  afterEach(async () => {
    while (activeServers.length > 0) {
      const s = activeServers.pop();
      await new Promise(resolve => s.close(resolve));
    }
  });

  it('should successfully bind to an open port', async () => {
    const result = await startServer({
      port: 0,
      isExplicitPort: false,
      silent: true,
      setupShutdown: false,
      exitOnError: false
    });
    activeServers.push(result.server);

    assert.ok(result.port > 0, 'Port should be bound to a valid number');
    assert.equal(typeof result.mode, 'string');
    assert.equal(typeof result.isWatchMode, 'boolean');
  });

  it('should fall back to next port if initial port is occupied and explicitPort is false', async () => {
    // Occupy an initial port with a dummy server
    const dummyServer = http.createServer((req, res) => res.end('occupied'));
    await new Promise(resolve => dummyServer.listen(0, resolve));
    const occupiedPort = dummyServer.address().port;
    activeServers.push(dummyServer);

    // Now start server targeting occupiedPort without explicit requirement
    const result = await startServer({
      port: occupiedPort,
      isExplicitPort: false,
      maxAttempts: 5,
      silent: true,
      setupShutdown: false,
      exitOnError: false
    });
    activeServers.push(result.server);

    assert.equal(result.port, occupiedPort + 1, 'Should have fallen back to occupiedPort + 1');
  });

  it('should fail with EADDRINUSE if explicit port is occupied', async () => {
    const dummyServer = http.createServer((req, res) => res.end('occupied'));
    await new Promise(resolve => dummyServer.listen(0, resolve));
    const occupiedPort = dummyServer.address().port;
    activeServers.push(dummyServer);

    await assert.rejects(
      async () => {
        await startServer({
          port: occupiedPort,
          isExplicitPort: true,
          silent: true,
          setupShutdown: false,
          exitOnError: false
        });
      },
      (err) => {
        assert.equal(err.code, 'EADDRINUSE');
        assert.match(err.message, /already in use/i);
        assert.match(err.message, /explicit PORT/i);
        return true;
      }
    );
  });

  it('should reject when an invalid port is provided', async () => {
    await assert.rejects(
      async () => {
        await startServer({
          port: 'invalid-port',
          exitOnError: false,
          silent: true,
          setupShutdown: false
        });
      },
      (err) => {
        assert.match(err.message, /Invalid PORT/i);
        return true;
      }
    );
  });

  it('should reject when all ports in fallback range are occupied', async () => {
    // Occupy 2 consecutive ports
    const dummy1 = http.createServer((req, res) => res.end('d1'));
    await new Promise(resolve => dummy1.listen(0, resolve));
    const port1 = dummy1.address().port;
    activeServers.push(dummy1);

    const dummy2 = http.createServer((req, res) => res.end('d2'));
    await new Promise(resolve => dummy2.listen(port1 + 1, resolve));
    activeServers.push(dummy2);

    await assert.rejects(
      async () => {
        await startServer({
          port: port1,
          isExplicitPort: false,
          maxAttempts: 1, // Only check port1 and port1 + 1
          silent: true,
          setupShutdown: false,
          exitOnError: false
        });
      },
      (err) => {
        assert.equal(err.code, 'EADDRINUSE');
        assert.match(err.message, /No available ports found/i);
        return true;
      }
    );
  });

  it('should log incoming HTTP requests when NODE_ENV is development', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const logs = [];
    const origLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      origLog(...args);
    };

    try {
      const server = await bindServer(app, 0);
      activeServers.push(server);
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/health`);
      assert.equal(res.status, 200);

      // Give event loop tick for finish event to log
      await new Promise(resolve => setTimeout(resolve, 50));

      const reqLog = logs.find(l => l.includes('GET /health 200'));
      assert.ok(reqLog, 'Expected [dev] GET /health 200 <duration>ms log');
      assert.match(reqLog, /\[dev\] GET \/health 200 \d+(\.\d+)?ms/);
    } finally {
      console.log = origLog;
      process.env.NODE_ENV = origEnv;
    }
  });
});
