import { assertCustomerOrigin, verifyCustomerEmail } from '@/lib/customerAccounts';
import { clearCustomerRegistration, clearCustomerSession, customerError, customerOk } from '@/lib/customerRoute';
import { otpSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';

export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    const payload = await parseJson(request, otpSchema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'verify_email_ip', key: requestIp(request), limit: 20, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, payload.recaptchaToken, 'verify_email'),
    ]);
    const result = await verifyCustomerEmail(request, payload);
    return clearCustomerSession(clearCustomerRegistration(customerOk(result)));
  } catch (error) { return customerError(error); }
}
