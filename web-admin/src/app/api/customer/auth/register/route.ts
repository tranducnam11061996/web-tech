import { assertCustomerOrigin, CustomerAuthError, discardRegistrationChallenge, registerCustomer } from '@/lib/customerAccounts';
import { isCustomerEmailAvailable, sendCustomerOtp } from '@/lib/customerEmail';
import { customerError, customerOk, setCustomerRegistration } from '@/lib/customerRoute';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';
import { customerRegistrationSchema } from '@/lib/commerceValidation';
import { parseJson } from '@/lib/publicRequest';

export async function POST(request: Request) {
  try {
    assertCustomerOrigin(request);
    if (!isCustomerEmailAvailable()) throw new CustomerAuthError(503, 'EMAIL_UNAVAILABLE', 'Hệ thống email chưa sẵn sàng. Vui lòng thử lại sau.');
    const payload = await parseJson(request, customerRegistrationSchema, 16_384);
    if (String(payload.website || '').trim()) return customerOk({ verificationRequired: true });
    await verifyCustomerCaptcha(request, payload.recaptchaToken, 'customer_register');
    const result = await registerCustomer(request, payload);
    let sent = false;
    try { sent = await sendCustomerOtp({ to: result.email, code: result.code, purpose: 'verify_email' }); }
    catch (error) { await discardRegistrationChallenge(result.token); throw error; }
    if (!sent) {
      await discardRegistrationChallenge(result.token);
      throw new CustomerAuthError(503, 'EMAIL_UNAVAILABLE', 'Không thể gửi mã xác minh. Vui lòng thử lại sau.');
    }
    return setCustomerRegistration(customerOk({ email: result.email, verificationRequired: true, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt }, 201), result.token, 10 * 60);
  } catch (error) { return customerError(error); }
}
