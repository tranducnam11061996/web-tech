const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'D:/web-tech/web-admin/.env' });

async function check() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hanoi23_db',
    });
    const [c] = await pool.query('SHOW COLUMNS FROM idv_attribute_category');
    console.log('--- idv_attribute_category ---');
    console.log(c.map(r => r.Field).join(', '));
    const [a] = await pool.query('SHOW COLUMNS FROM idv_attribute');
    console.log('--- idv_attribute ---');
    console.log(a.map(r => r.Field).join(', '));
    const [v] = await pool.query('SHOW COLUMNS FROM idv_attribute_value');
    console.log('--- idv_attribute_value ---');
    console.log(v.map(r => r.Field).join(', '));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();

