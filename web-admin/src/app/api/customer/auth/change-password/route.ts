import { assertCustomerOrigin, changeCustomerPassword } from '@/lib/customerAccounts';
import { clearCustomerSession, customerError, customerOk } from '@/lib/customerRoute';
import { customerPasswordChangeSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
export async function POST(request: Request) { try { assertCustomerOrigin(request); await consumeRateLimit({scope:'change_password_ip',key:requestIp(request),limit:10,windowSeconds:900}); const body=await parseJson(request,customerPasswordChangeSchema,12_000); await changeCustomerPassword(request,body); return clearCustomerSession(customerOk({changed:true})); } catch(error){ return customerError(error); } }
