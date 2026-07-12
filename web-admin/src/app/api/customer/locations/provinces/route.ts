import { getCustomerProvinces } from '@/lib/customerAccounts'; import { customerError, customerOk } from '@/lib/customerRoute';
export async function GET() { try { return customerOk({ items: await getCustomerProvinces() }); } catch (error) { return customerError(error); } }
