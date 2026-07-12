import { assertCustomerOrigin, createCustomerAddress, listCustomerAddresses } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { customerAddressSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
export async function GET(request: Request) { try { return customerOk({ items: await listCustomerAddresses(request) }); } catch (error) { return customerError(error); } }
export async function POST(request: Request) { try { assertCustomerOrigin(request); await consumeRateLimit({ scope: 'customer_address_ip', key: requestIp(request), limit: 30, windowSeconds: 900 }); const body=await parseJson(request, customerAddressSchema, 16_000); return customerOk({ id: await createCustomerAddress(request, body) }, 201); } catch (error) { return customerError(error); } }
