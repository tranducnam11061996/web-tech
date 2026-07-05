import { Suspense } from 'react';
import { CategoryFilter } from '@/components/categories/CategoryFilter';
import { CategoryTable, CategoryNode } from '@/components/categories/CategoryTable';
import pool from '@/lib/db';

async function getCategories(page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;

    // Count root categories
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM idv_seller_category WHERE parentId = 0'
    );
    const totalItems = (countResult as any[])[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch root categories
    const [rootRows] = await pool.query(`
      SELECT 
        c.id, c.name, c.is_featured, c.status, c.proCount, c.ordering, c.url
      FROM idv_seller_category c
      WHERE c.parentId = 0
      ORDER BY c.ordering DESC, c.id DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    const rootCategories = rootRows as any[];

    if (rootCategories.length === 0) {
      return {
        categories: [],
        pagination: { currentPage: page, totalPages, totalItems, pageSize: limit }
      };
    }

    const rootIds = rootCategories.map(c => c.id);
    const placeholders = rootIds.map(() => '?').join(',');

    // Fetch direct children
    const [childRows] = await pool.query(`
      SELECT 
        c.id, c.name, c.is_featured, c.status, c.proCount, c.ordering, c.parentId, c.url
      FROM idv_seller_category c
      WHERE c.parentId IN (${placeholders})
      ORDER BY c.ordering DESC, c.id DESC
    `, rootIds);

    const childrenByParent: Record<number, any[]> = {};
    for (const child of (childRows as any[])) {
      if (!childrenByParent[child.parentId]) childrenByParent[child.parentId] = [];
      childrenByParent[child.parentId].push(child);
    }

    const mapToNode = (row: any, isChild = false): CategoryNode => {
      const node: CategoryNode = {
        id: row.id.toString(),
        name: row.name,
        isFeatured: row.is_featured === 1,
        isVisible: row.status === 1,
        productCount: row.proCount || 0,
        sequence: row.ordering || 0,
        frontEndUrl: row.url ? `http://localhost:3001/${row.url}` : '#',
      };
      
      if (!isChild && childrenByParent[row.id]) {
        node.children = childrenByParent[row.id].map((c: any) => mapToNode(c, true));
      }
      
      return node;
    };

    const categories = rootCategories.map(c => mapToNode(c, false));

    return {
      categories,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit
      }
    };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return {
      categories: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit }
    };
  }
}

export default async function CategoriesPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const pageStr = searchParams?.page;
  const limitStr = searchParams?.limit;
  
  const page = typeof pageStr === 'string' ? parseInt(pageStr, 10) || 1 : 1;
  const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) || 20 : 20;

  const { categories, pagination } = await getCategories(page, limit);

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        <Suspense fallback={<div className="h-40 bg-gray-900/50 animate-pulse rounded-lg mb-4"></div>}>
          <CategoryFilter />
        </Suspense>
        
        <div className="flex-1 min-h-0 mt-2">
          <Suspense fallback={<div className="h-full bg-gray-900/50 animate-pulse rounded-lg"></div>}>
            <CategoryTable categories={categories} pagination={pagination} />
          </Suspense>
        </div>
      </div>

    </div>
  );
}
