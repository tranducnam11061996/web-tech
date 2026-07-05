'use server';

import pool from '@/lib/db';

export async function searchProducts(query: string, page: number = 1, limit: number = 20) {
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (query) {
      whereClause += ' AND (proName LIKE ? OR id LIKE ? OR storeSKU LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(id) as total FROM idv_sell_product_store ${whereClause}`;
    const [countRows] = await pool.query(countQuery, params);
    const total = (countRows as any[])[0]?.total || 0;

    const sql = `
      SELECT id, proName, storeSKU
      FROM idv_sell_product_store
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    return {
      data: rows as any[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        pageSize: limit
      }
    };
  } catch (error) {
    console.error('Failed to search products:', error);
    return { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit } };
  }
}
