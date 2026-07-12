'use client';

declare global { interface Window { grecaptcha?: { ready(callback: () => void): void; execute(siteKey: string, options: { action: string }): Promise<string> } } }
let loading: Promise<void> | null = null;

export async function getAdminLoginRecaptchaToken() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || '';
  if (!siteKey) return '';
  if (!window.grecaptcha) {
    loading ||= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Không thể tải hệ thống chống bot.'));
      document.head.appendChild(script);
    });
    await loading;
  }
  if (!window.grecaptcha) throw new Error('Hệ thống chống bot chưa sẵn sàng.');
  return new Promise((resolve, reject) => window.grecaptcha!.ready(() => window.grecaptcha!.execute(siteKey, { action: 'admin_login' }).then(resolve, reject)));
}
