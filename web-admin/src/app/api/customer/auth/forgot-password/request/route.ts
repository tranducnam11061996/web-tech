import { assertCustomerOrigin, CustomerAuthError, requestPasswordReset } from '@/lib/customerAccounts';
import { isCustomerEmailAvailable, sendCustomerOtp } from '@/lib/customerEmail';
import { customerError, customerOk } from '@/lib/customerRoute';
import { passwordResetRequestSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';

export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    if (!isCustomerEmailAvailable()) throw new CustomerAuthError(503, 'EMAIL_UNAVAILABLE', 'Hệ thống email chưa sẵn sàng.');
    const payload = await parseJson(request, passwordResetRequestSchema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'password_reset_ip', key: requestIp(request), limit: 10, windowSeconds: 900, blockSeconds: 900 }),
      consumeRateLimit({ scope: 'password_reset_email', key: payload.email, limit: 3, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, payload.recaptchaToken, 'password_reset_request'),
    ]);
    const result = await requestPasswordReset(request, payload);
    if (result.code) await sendCustomerOtp({ to: result.email, code: result.code, purpose: 'password_reset' });
    return customerOk({ sent: true });
  } catch (error) { return customerError(error); }
}
