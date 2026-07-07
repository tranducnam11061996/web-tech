import pool from '../src/lib/db';
import { ensureProductSearchInfrastructure } from '../src/lib/searchInfrastructure';

async function main() {
  const counts = await ensureProductSearchInfrastructure();
  if (counts.missingCount !== 0 || counts.productCount !== counts.searchCount) {
    throw new Error(`Search data is incomplete: ${JSON.stringify(counts)}`);
  }
  console.log(`Search migration completed: ${counts.searchCount} products indexed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
