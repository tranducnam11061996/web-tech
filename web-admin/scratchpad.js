const mysql = require('mysql2/promise');

async function describe() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hanoi23_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [urls] = await pool.query('DESCRIBE idv_url');
    console.log('--- idv_url schema ---');
    console.log(urls);
    
    const [sample] = await pool.query('SELECT * FROM idv_url WHERE request_path LIKE "%laptop-msi-gaming-katana-15%" OR target_path LIKE "%70977%" LIMIT 5');
    console.log('--- Sample data ---');
    console.log(sample);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
describe();
