import { fail, ok } from '@/lib/admin/common';
import { listAdminStorefrontCustomers } from '@/lib/admin/storefrontCustomers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return ok(await listAdminStorefrontCustomers(request.nextUrl.searchParams));
  } catch (error) {
    return fail(error);
  }
}
