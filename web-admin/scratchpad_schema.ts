import pool from './src/lib/db';

async function describeTables() {
  try {
    const [comboSet] = await pool.query('DESCRIBE combo_set');
    console.log('--- combo_set ---');
    console.log(comboSet);
    
    const [comboSetProduct] = await pool.query('DESCRIBE combo_set_product');
    console.log('--- combo_set_product ---');
    console.log(comboSetProduct);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

describeTables();
