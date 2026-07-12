import { assertCustomerOrigin, logoutCustomer } from '@/lib/customerAccounts';
import { clearCustomerSession, customerError, customerOk } from '@/lib/customerRoute';
export async function POST(request: Request) { try { assertCustomerOrigin(request); await logoutCustomer(request); return clearCustomerSession(customerOk({ loggedOut: true })); } catch (error) { return customerError(error); } }
