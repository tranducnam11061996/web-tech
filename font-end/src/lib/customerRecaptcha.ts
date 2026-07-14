"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadCustomerRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
  if (!siteKey || typeof document === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Không thể tải hệ thống chống bot. Hãy kiểm tra kết nối hoặc trình chặn nội dung."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function getCustomerRecaptchaToken(action = "customer_register") {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
  if (!siteKey) return "";
  await loadCustomerRecaptcha();
  if (!window.grecaptcha) throw new Error("Hệ thống chống bot chưa sẵn sàng. Vui lòng thử lại.");
  return new Promise<string>((resolve, reject) =>
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(siteKey, { action })
        .then((token) => token ? resolve(token) : reject(new Error("Không thể tạo mã xác minh chống bot. Vui lòng thử lại.")), reject);
    }),
  );
}

export function getRegistrationRecaptchaToken() {
  return getCustomerRecaptchaToken("customer_register");
}
