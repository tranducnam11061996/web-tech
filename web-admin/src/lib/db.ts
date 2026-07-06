import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

declare global {
  var mysqlPool: mysql.Pool | undefined;
}

function readEnvValue(filePath: string, key: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      if (trimmed.slice(0, index).trim() !== key) continue;

      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return value;
    }
  } catch {
    return undefined;
  }
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    readEnvValue(path.resolve(process.cwd(), '.env'), 'DATABASE_URL') ||
    readEnvValue(path.resolve(process.cwd(), '..', '.env'), 'DATABASE_URL')
  );
}

function createPoolConfig(): mysql.PoolOptions {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hanoi23_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

const pool = global.mysqlPool || mysql.createPool(createPoolConfig());

if (process.env.NODE_ENV !== 'production') {
  global.mysqlPool = pool;
}

export default pool;
