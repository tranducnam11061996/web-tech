import { assertCustomerOrigin, CustomerAuthError, releaseRegistrationResendCooldown, resendCustomerVerification } from '@/lib/customerAccounts';
import { isCustomerEmailAvailable, sendCustomerOtp } from '@/lib/customerEmail';
import { customerError, customerOk } from '@/lib/customerRoute';
import { recaptchaTokenSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';
import { z } from 'zod';

const schema = z.object({ recaptchaToken: recaptchaTokenSchema }).strict();
export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    if (!isCustomerEmailAvailable()) throw new CustomerAuthError(503, 'EMAIL_UNAVAILABLE', 'Hệ thống email chưa sẵn sàng.');
    const payload = await parseJson(request, schema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'otp_resend_ip', key: requestIp(request), limit: 10, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, payload.recaptchaToken, 'otp_resend'),
    ]);
    const result = await resendCustomerVerification(request);
    let sent = false;
    try { sent = await sendCustomerOtp({ to: result.email, code: result.code, purpose: 'verify_email' }); }
    catch (error) { await releaseRegistrationResendCooldown(request); throw error; }
    if (!sent) { await releaseRegistrationResendCooldown(request); throw new CustomerAuthError(503, 'EMAIL_UNAVAILABLE', 'Không thể gửi mã xác minh. Vui lòng thử lại.'); }
    return customerOk({ sent: true, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt });
  } catch (error) { return customerError(error); }
}
