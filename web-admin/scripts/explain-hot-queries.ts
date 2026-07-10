import { createHash } from 'crypto';
import pool from '../src/lib/db';

type Plan = {
  name: string;
  query: string;
  params: unknown[];
};

async function main() {
  const [categoryRows] = await pool.query(
    `
      SELECT pc.category_id AS categoryId
      FROM idv_product_category pc
      JOIN idv_seller_category c ON c.id = pc.category_id
      GROUP BY pc.category_id
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `,
  );
  const [collectionRows] = await pool.query(
    `
      SELECT csp.special_cat_id AS collectionId
      FROM idv_category_special_product csp
      JOIN idv_category_special c ON c.id = csp.special_cat_id
      GROUP BY csp.special_cat_id
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `,
  );

  const categoryId = Number((categoryRows as any[])[0]?.categoryId || 0);
  const collectionId = Number((collectionRows as any[])[0]?.collectionId || 0);
  const samplePath = '/san-pham-khong-ton-tai';
  const samplePathIndex = createHash('md5').update(samplePath).digest('hex');

  const plans: Plan[] = [
    {
      name: 'Root slug resolver',
      query: 'EXPLAIN SELECT id_path, url_type FROM idv_url WHERE request_path_index = ? AND request_path = ? LIMIT 1',
      params: [samplePathIndex, samplePath],
    },
    {
      name: 'Category product list',
      query: `
        EXPLAIN
        SELECT p.id
        FROM idv_product_category pc
        JOIN idv_sell_product_price pr ON pr.id = pc.pro_id AND pr.isOn = 1
        JOIN idv_sell_product_store p ON p.id = pc.pro_id
        WHERE pc.category_id = ?
        ORDER BY pc.pro_id DESC
        LIMIT 24
      `,
      params: [categoryId],
    },
    {
      name: 'Collection product list',
      query: `
        EXPLAIN
        SELECT csp.id, csp.product_id
        FROM idv_category_special_product csp
        JOIN idv_sell_product_price pr ON pr.id = csp.product_id AND pr.isOn = 1
        WHERE csp.special_cat_id = ?
        ORDER BY csp.ordering ASC, csp.id DESC
        LIMIT 24
      `,
      params: [collectionId],
    },
    {
      name: 'Attribute product filter',
      query: `
        EXPLAIN
        SELECT pa.pro_id
        FROM idv_product_attribute pa
        WHERE pa.attr_id = (SELECT id FROM idv_attribute LIMIT 1)
        LIMIT 24
      `,
      params: [],
    },
  ];

  console.log(`[db:explain-hot] categoryId=${categoryId}, collectionId=${collectionId}`);
  for (const plan of plans) {
    const [rows] = await pool.query(plan.query, plan.params);
    console.log(`\n[db:explain-hot] ${plan.name}`);
    console.table(rows);
  }
}

main()
  .catch((error) => {
    console.error('[db:explain-hot] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
