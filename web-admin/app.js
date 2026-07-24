'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Passenger loads this CommonJS startup file directly. */

const { createServer } = require('node:http');
const next = require('next');

const defaultPort = 3000;
const configuredPort = Number.parseInt(process.env.PORT || String(defaultPort), 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : defaultPort;
const host = process.env.APP_HOST || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
  dir: __dirname,
  hostname: host,
  port,
});
const handle = app.getRequestHandler();

let server;
let shuttingDown = false;

async function start() {
  await app.prepare();
  server = createServer((request, response) => handle(request, response));
  server.listen(port, host, () => {
    console.log(`[web-admin] listening on ${host}:${port} (${dev ? 'development' : 'production'})`);
  });
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[web-admin] received ${signal}; draining requests`);

  if (!server) {
    process.exit(0);
    return;
  }

  const timeout = setTimeout(() => process.exit(1), 25_000);
  timeout.unref();
  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      console.error('[web-admin] shutdown failed', error);
      process.exit(1);
      return;
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('[web-admin] startup failed', error);
  process.exit(1);
});
