import { NextRequest } from 'next/server';
import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import {
  getProductCardAttributeEditorData,
  saveProductCardAttributeRules,
} from '@/lib/productCardAttributes';
import { invalidateSearchCache } from '@/lib/searchCache';

function parseCategoryId(request: NextRequest) {
  const value = Number(request.nextUrl.searchParams.get('categoryId') || 0);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

export async function GET(request: NextRequest) {
  try {
    return ok(await getProductCardAttributeEditorData(parseCategoryId(request)));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdminWrite();
    const payload = await request.json();
    const categoryId = Number(payload?.categoryId || request.nextUrl.searchParams.get('categoryId') || 0);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return ok(await getProductCardAttributeEditorData(), 'Missing category; returned default editor data');
    }
    const rules = Array.isArray(payload?.rules) ? payload.rules : [];
    const data = await saveProductCardAttributeRules(categoryId, rules);
    invalidateSearchCache();
    return ok(data, 'Saved product card attribute rules');
  } catch (error) {
    return fail(error);
  }
}
