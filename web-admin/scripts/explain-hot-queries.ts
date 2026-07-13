import { createHash } from 'crypto';
import pool from '../src/lib/db';
import { effectivePublicCategoryScope, loadEnabledPublicCategoryScope } from '../src/lib/publicCategoryScope';

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
  const [newsCategoryRows] = await pool.query(`
    SELECT category_id AS categoryId FROM idv_article_category
    WHERE status=1 AND article_type='article'
    GROUP BY category_id ORDER BY COUNT(*) DESC LIMIT 1
  `);
  const [newsRows] = await pool.query(`SELECT url FROM idv_seller_news WHERE status=1 ORDER BY id DESC LIMIT 1`);
  const [parentCategoryRows] = await pool.query(`
    SELECT parent.id AS categoryId
    FROM idv_seller_category parent
    WHERE parent.status=1 AND EXISTS (
      SELECT 1 FROM idv_seller_category child WHERE child.parentId=parent.id AND child.status=1
    )
    ORDER BY parent.id LIMIT 1
  `);

  const categoryId = Number((categoryRows as any[])[0]?.categoryId || 0);
  const parentCategoryId = Number((parentCategoryRows as any[])[0]?.categoryId || categoryId);
  const parentCategoryScope = effectivePublicCategoryScope(await loadEnabledPublicCategoryScope(parentCategoryId));
  const collectionId = Number((collectionRows as any[])[0]?.collectionId || 0);
  const newsCategoryId = Number((newsCategoryRows as any[])[0]?.categoryId || 0);
  const newsSlug = String((newsRows as any[])[0]?.url || 'missing-news');
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
      name: 'Enabled category descendants',
      query: `
        EXPLAIN WITH RECURSIVE category_scope AS (
          SELECT id,0 depth,CAST(CONCAT(',',id,',') AS CHAR(12000)) visited
          FROM idv_seller_category WHERE id=? AND status=1
          UNION ALL
          SELECT child.id,scope.depth+1,CONCAT(scope.visited,child.id,',')
          FROM category_scope scope
          JOIN idv_seller_category child ON child.parentId=scope.id AND child.status=1
          WHERE scope.depth<32 AND LOCATE(CONCAT(',',child.id,','),scope.visited)=0
        ) SELECT DISTINCT id FROM category_scope ORDER BY id
      `,
      params: [parentCategoryId],
    },
    {
      name: 'Category descendant product list',
      query: `
        EXPLAIN SELECT DISTINCT p.id,pr.price
        FROM idv_sell_product_store p
        JOIN idv_sell_product_price pr ON pr.id=p.id AND pr.isOn=1
        JOIN idv_product_category pc FORCE INDEX (idx_webtech_category_product)
          ON pc.pro_id=p.id AND pc.category_id IN (?)
        ORDER BY p.id DESC LIMIT 24
      `,
      params: [parentCategoryScope],
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
    {
      name: 'News list',
      query: 'EXPLAIN SELECT id,title FROM idv_seller_news WHERE status=1 ORDER BY createDate DESC,id DESC LIMIT 20',
      params: [],
    },
    {
      name: 'News detail',
      query: 'EXPLAIN SELECT id,title FROM idv_seller_news WHERE url=? AND status=1 LIMIT 1',
      params: [newsSlug],
    },
    {
      name: 'News category membership',
      query: `
        EXPLAIN SELECT n.id
        FROM (
          SELECT id AS article_id FROM idv_seller_news WHERE catId=?
          UNION DISTINCT
          SELECT article_id FROM idv_article_category FORCE INDEX (idx_webtech_news_category_article)
          WHERE category_id=? AND status=1 AND article_type='article'
        ) membership
        JOIN idv_seller_news n ON n.id=membership.article_id
        WHERE n.status=1 ORDER BY n.createDate DESC,n.id DESC LIMIT 20
      `,
      params: [newsCategoryId, newsCategoryId],
    },
  ];

  console.log(`[db:explain-hot] categoryId=${categoryId}, parentCategoryId=${parentCategoryId}, collectionId=${collectionId}, newsCategoryId=${newsCategoryId}`);
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
