import { listCustomerOrders } from '@/lib/customerAccounts'; import { customerError, customerOk } from '@/lib/customerRoute';
export async function GET(request: Request) { try { return customerOk(await listCustomerOrders(request, new URL(request.url).searchParams)); } catch (error) { return customerError(error); } }
