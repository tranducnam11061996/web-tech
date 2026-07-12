module.exports = {
  apps: [
    {
      name: 'web-admin-api', cwd: 'D:/web-tech/web-admin', script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000', instances: 2, exec_mode: 'cluster', max_memory_restart: '1200M',
      env: { NODE_ENV: 'production', DB_CONNECTION_LIMIT: '12' },
    },
    {
      name: 'storefront', cwd: 'D:/web-tech/font-end', script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001', instances: 1, max_memory_restart: '1000M', env: { NODE_ENV: 'production' },
    },
    {
      name: 'background-worker', cwd: 'D:/web-tech/web-admin', script: 'node_modules/tsx/dist/cli.mjs',
      args: 'scripts/background-worker.ts', instances: 1, max_memory_restart: '512M', env: { NODE_ENV: 'production', DB_CONNECTION_LIMIT: '2' },
    },
  ],
};
