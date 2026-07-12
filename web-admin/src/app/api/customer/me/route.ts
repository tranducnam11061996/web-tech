import { assertCustomerOrigin, requireCustomerSession, updateCustomerProfile } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { customerProfileSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
export async function GET(request: Request) { try { return customerOk({ user: await requireCustomerSession(request) }); } catch (error) { return customerError(error); } }
export async function PATCH(request: Request) { try { assertCustomerOrigin(request); const body=await parseJson(request,customerProfileSchema,12_000); return customerOk({ user: await updateCustomerProfile(request,body) }); } catch(error){ return customerError(error); } }
