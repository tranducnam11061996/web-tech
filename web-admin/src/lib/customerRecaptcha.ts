import { CustomerAuthError } from '@/lib/customerAccounts';
import { PublicRequestError } from '@/lib/publicRequest';

type RecaptchaResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
};

const ACTION_PATTERN = /^[a-z0-9_/]{3,64}$/;

export async function verifyCustomerCaptcha(request: Request, token: unknown, action: string) {
  if (!ACTION_PATTERN.test(action)) throw new Error(`Invalid reCAPTCHA action: ${action}`);
  const bypass = process.env.NODE_ENV !== 'production' && process.env.RECAPTCHA_DEVELOPMENT_BYPASS === 'true';
  if (bypass) return { score: 1, bypassed: true };

  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) throw new PublicRequestError(503, 'BOT_PROTECTION_UNAVAILABLE', 'Hệ thống chống bot chưa được cấu hình.');
  const value = String(token || '').trim();
  if (!value || value.length > 4096) throw new PublicRequestError(400, 'BOT_VERIFICATION_FAILED', 'Không thể xác minh yêu cầu. Vui lòng thử lại.');

  const body = new URLSearchParams({ secret, response: value });
  const forwarded = String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim();
  if (forwarded && forwarded !== 'unknown') body.set('remoteip', forwarded);
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) throw new PublicRequestError(503, 'BOT_PROTECTION_UNAVAILABLE', 'Không thể kết nối hệ thống chống bot. Vui lòng thử lại.');
  const result = await response.json() as RecaptchaResponse;
  const thresholdKey = `RECAPTCHA_SCORE_${action.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const minimumScore = Math.min(1, Math.max(0, Number(process.env[thresholdKey] || process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5)));
  const allowedHosts = String(process.env.RECAPTCHA_ALLOWED_HOSTNAMES || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  const hostnameAllowed = allowedHosts.length === 0 || allowedHosts.includes(String(result.hostname || '').toLowerCase());
  const challengedAt = result.challenge_ts ? Date.parse(result.challenge_ts) : 0;
  const tokenFresh = challengedAt > 0 && Math.abs(Date.now() - challengedAt) <= 120_000;
  const accepted = Boolean(result.success && result.action === action && Number(result.score || 0) >= minimumScore && hostnameAllowed && tokenFresh);

  if (process.env.RECAPTCHA_SHADOW_MODE === 'true') {
    console.info('[recaptcha]', { action, accepted, score: result.score, hostname: result.hostname });
    return { score: Number(result.score || 0), shadow: true };
  }
  if (!accepted) throw new PublicRequestError(400, 'BOT_VERIFICATION_FAILED', 'Không thể xác minh yêu cầu. Vui lòng thử lại.');
  return { score: Number(result.score || 0) };
}

export async function verifyRegistrationCaptcha(request: Request, token: unknown) {
  try {
    return await verifyCustomerCaptcha(request, token, 'customer_register');
  } catch (error) {
    if (error instanceof PublicRequestError) throw new CustomerAuthError(error.status, error.code, error.message);
    throw error;
  }
}
