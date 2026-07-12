import { assertCustomerOrigin, loginCustomer } from '@/lib/customerAccounts';
import { customerError, customerOk, setCustomerSession } from '@/lib/customerRoute';
import { customerLoginSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';

export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    const payload = await parseJson(request, customerLoginSchema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'customer_login_ip', key: requestIp(request), limit: 30, windowSeconds: 900, blockSeconds: 900 }),
      consumeRateLimit({ scope: 'customer_login_identifier', key: payload.identifier.toLowerCase(), limit: 10, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, payload.recaptchaToken, 'customer_login'),
    ]);
    const result = await loginCustomer(request, payload);
    return setCustomerSession(customerOk({ user: result.user }), result.session.token, result.session.maxAgeSeconds);
  } catch (error) { return customerError(error); }
}
