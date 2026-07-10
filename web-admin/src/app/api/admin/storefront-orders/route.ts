import { fail, ok } from '@/lib/admin/common';
import { listAdminStorefrontOrders } from '@/lib/storefrontOrders';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) { try { return ok(await listAdminStorefrontOrders(request.nextUrl.searchParams)); } catch (error) { return fail(error); } }
