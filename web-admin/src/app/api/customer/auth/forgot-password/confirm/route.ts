import { assertCustomerOrigin, confirmPasswordReset } from '@/lib/customerAccounts';
import { customerError, customerOk } from '@/lib/customerRoute';
import { passwordResetConfirmSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';

export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    const payload = await parseJson(request, passwordResetConfirmSchema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'password_confirm_ip', key: requestIp(request), limit: 10, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, payload.recaptchaToken, 'password_reset_confirm'),
    ]);
    return customerOk(await confirmPasswordReset(payload));
  } catch (error) { return customerError(error); }
}
