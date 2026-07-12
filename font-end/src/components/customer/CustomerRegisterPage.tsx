"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CustomerApiError, customerFetch } from "@/lib/customer";
import {
  getCustomerRecaptchaToken,
  getRegistrationRecaptchaToken,
  loadCustomerRecaptcha,
} from "@/lib/customerRecaptcha";
import {
  ArrowRight,
  AtSign,
  Check,
  Fingerprint,
  MailCheck,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AuthNotice,
  PasswordInput,
  PasswordRequirements,
  REGISTRATION_LOGIN_HINT,
  authInputClass,
  passwordChecks,
} from "./CustomerAuthShared";

const SUCCESS_DURATION = 6000;

function RegistrationSuccessModal({ email }: { email: string }) {
  const router = useRouter();
  const actionRef = useRef<HTMLButtonElement>(null);
  const navigatedRef = useRef(false);
  const goToLogin = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace("/tai-khoan/dang-nhap");
  }, [router]);

  useEffect(() => {
    actionRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(goToLogin, SUCCESS_DURATION);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        goToLogin();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        actionRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goToLogin]);

  return (
    <div className="registration-success-backdrop">
      <section
        className="registration-success-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-success-title"
        aria-describedby="registration-success-description"
      >
        <span className="registration-success-scan" aria-hidden="true" />
        <div className="registration-success-orbit" aria-hidden="true">
          <span />
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[.22em] text-[#70cbff]">
          IDENTITY CREATED // ACCESS READY
        </p>
        <h2
          id="registration-success-title"
          className="mt-3 text-3xl font-black tracking-[-.04em] text-white"
        >
          Đăng ký thành công
        </h2>
        <p
          id="registration-success-description"
          className="mt-3 text-sm leading-6 text-slate-300"
        >
          Tài khoản <strong className="text-white">{email}</strong> đã được xác
          minh. Bạn sẽ được chuyển sang màn đăng nhập sau 6 giây.
        </p>
        <button
          ref={actionRef}
          type="button"
          onClick={goToLogin}
          className="auth-primary-button mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white"
        >
          Đăng nhập ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="registration-success-timer" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}

export function RegisterPage() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [website, setWebsite] = useState("");
  const [rateLimitUntil, setRateLimitUntil] = useState(0);

  useEffect(() => {
    if (step !== "verify" && rateLimitUntil <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, rateLimitUntil]);
  useEffect(() => {
    void loadCustomerRecaptcha().catch(() => undefined);
  }, []);
  const applyChallenge = (value: {
    expiresAt?: number;
    resendAvailableAt?: number;
  }) => {
    setExpiresAt(Number(value.expiresAt || 0));
    setResendAvailableAt(Number(value.resendAvailableAt || 0));
    setNow(Date.now());
  };
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const rateLimitSeconds = Math.max(0, Math.ceil((rateLimitUntil - now) / 1000));
  const clockText = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const register = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!passwordChecks(form.password).every((item) => item.valid)) {
      setError("Mật khẩu chưa đáp ứng đầy đủ các yêu cầu bảo mật.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      const recaptchaToken = await getRegistrationRecaptchaToken();
      const result = (await customerFetch("/api/customer/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, website, recaptchaToken }),
      })) as { expiresAt?: number; resendAvailableAt?: number };
      applyChallenge(result);
      setCode("");
      setStep("verify");
      setSuccess(`Mã xác minh đã được gửi tới ${form.email}.`);
    } catch (reason) {
      if (reason instanceof CustomerApiError && reason.retryAfter > 0) setRateLimitUntil(Date.now() + reason.retryAfter * 1000);
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tạo yêu cầu đăng ký.",
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const recaptchaToken = await getCustomerRecaptchaToken("verify_email");
      await customerFetch("/api/customer/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ code, recaptchaToken }),
      });
      window.sessionStorage.setItem(
        REGISTRATION_LOGIN_HINT,
        JSON.stringify({ email: form.email, registered: true }),
      );
      setCompleted(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể xác minh mã OTP.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || resendSeconds > 0) return;
    setError("");
    setSuccess("");
    setCode("");
    setBusy(true);
    try {
      const recaptchaToken = await getCustomerRecaptchaToken("otp_resend");
      const result = (await customerFetch(
        "/api/customer/auth/resend-verification",
        { method: "POST", body: JSON.stringify({ recaptchaToken }) },
      )) as { expiresAt?: number; resendAvailableAt?: number };
      applyChallenge(result);
      setSuccess("Mã xác minh mới đã được gửi.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể gửi lại mã xác minh.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-register-page min-h-screen bg-[#07090e] text-white">
      <Header />
      <main
        id="main-content"
        className="auth-register-stage relative isolate overflow-hidden px-4 py-10 sm:py-14"
      >
        <div className="auth-register-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <header className="text-center">
            <div className="auth-register-emblem mx-auto grid h-16 w-16 place-items-center rounded-[18px] text-[#9bddff]">
              <UserRound className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="mt-5 font-mono text-[10px] font-black uppercase tracking-[.26em] text-[#70caff]">
            NEW PLAYER PROFILE // TRUCTIEPGAME
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">
              Tạo tài khoản mới
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
              Lưu địa chỉ, theo dõi đơn hàng và mua sắm nhanh hơn trong một hồ
              sơ bảo mật.
            </p>
          </header>
          <section
            className="auth-register-card mt-9 overflow-hidden rounded-[26px] border border-[#293b55] bg-[#0d111a]/95"
            aria-labelledby="register-form-title"
          >
            <div className="flex items-center justify-between border-b border-[#263448] px-5 py-4 sm:px-8">
              <div>
                <p
                  id="register-form-title"
                  className="text-sm font-bold text-white"
                >
                  {step === "form" ? "Thông tin tài khoản" : "Xác minh email"}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[.17em] text-slate-600">
                  STEP {step === "form" ? "01 / 02" : "02 / 02"}
                </p>
              </div>
              <div
                className="flex items-center gap-2"
                aria-label={`Bước ${step === "form" ? "1" : "2"} trên 2`}
              >
                <span className="h-1.5 w-16 rounded-full bg-[#4bb5f5] shadow-[0_0_12px_rgba(75,181,245,.6)]" />
                <span
                  className={`h-1.5 w-16 rounded-full ${step === "verify" ? "bg-[#4bb5f5] shadow-[0_0_12px_rgba(75,181,245,.6)]" : "bg-[#222a37]"}`}
                />
              </div>
            </div>
            {step === "form" ? (
              <form
                onSubmit={register}
                className="space-y-5 p-5 sm:p-8"
                aria-busy={busy}
              >
                <label
                  htmlFor="register-name"
                  className="block text-xs font-black uppercase tracking-[.12em] text-slate-400"
                >
                  Họ và tên <span className="text-[#64c7ff]">*</span>
                </label>
                <div className="relative -mt-3">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="register-name"
                    required
                    minLength={2}
                    maxLength={150}
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nguyễn Văn An"
                    className={authInputClass}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-xs font-black uppercase tracking-[.12em] text-slate-400"
                    >
                      Email <span className="text-[#64c7ff]">*</span>
                    </label>
                    <div className="relative mt-2">
                      <AtSign
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        id="register-email"
                        required
                        type="email"
                        maxLength={255}
                        autoComplete="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="ban@example.com"
                        className={authInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="register-phone"
                      className="block text-xs font-black uppercase tracking-[.12em] text-slate-400"
                    >
                      Số điện thoại <span className="text-[#64c7ff]">*</span>
                    </label>
                    <div className="relative mt-2">
                      <Phone
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        id="register-phone"
                        required
                        type="tel"
                        maxLength={16}
                        pattern="(?:0|\+84)[0-9\s.-]{9,14}"
                        inputMode="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="09xx xxx xxx"
                        className={authInputClass}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="register-password"
                      className="block text-xs font-black uppercase tracking-[.12em] text-slate-400"
                    >
                      Mật khẩu <span className="text-[#64c7ff]">*</span>
                    </label>
                    <PasswordInput
                      id="register-password"
                      minLength={8}
                      value={form.password}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, password: value }))
                      }
                      autoComplete="new-password"
                      describedBy="register-password-hint"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="register-confirm"
                      className="block text-xs font-black uppercase tracking-[.12em] text-slate-400"
                    >
                      Nhập lại mật khẩu{" "}
                      <span className="text-[#64c7ff]">*</span>
                    </label>
                    <PasswordInput
                      id="register-confirm"
                      minLength={8}
                      value={form.confirm}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, confirm: value }))
                      }
                      autoComplete="new-password"
                      invalid={Boolean(
                        form.confirm && form.confirm !== form.password,
                      )}
                    />
                  </div>
                </div>
                <PasswordRequirements password={form.password} id="register-password-hint" />
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="register-website">Website</label>
                  <input id="register-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-[#2c394c] bg-[#0a0e16] p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className="h-5 w-5 text-[#77caff]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-300">
                        Được bảo vệ bởi reCAPTCHA
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Hệ thống tự động phát hiện hành vi bất thường và giới hạn yêu cầu spam.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  disabled={busy || rateLimitSeconds > 0}
                  className="auth-primary-button flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy ? "Đang gửi mã xác minh..." : rateLimitSeconds > 0 ? `Thử lại sau ${clockText(rateLimitSeconds)}` : "Đăng ký ngay"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <AuthNotice error={error} success={success} />
              </form>
            ) : (
              <form onSubmit={verify} className="p-5 sm:p-8" aria-busy={busy}>
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#56bffb]/40 bg-[#56bffb]/10 text-[#80d0ff]">
                    <MailCheck className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-2xl font-black">
                    Kiểm tra email của bạn
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Nhập mã 6 chữ số đã gửi tới{" "}
                    <strong className="text-slate-200">{form.email}</strong>
                  </p>
                  <label
                    htmlFor="registration-code"
                    className="mt-7 block text-left text-xs font-black uppercase tracking-[.12em] text-slate-400"
                  >
                    Mã xác minh
                  </label>
                  <input
                    id="registration-code"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="auth-otp-input mt-2 w-full rounded-xl border border-[#314158] bg-[#080c13] px-4 py-4 text-center font-mono text-2xl font-black tracking-[.48em] text-white outline-none focus:border-[#55b8ff] focus:ring-2 focus:ring-[#55b8ff]/20"
                  />
                  <p
                    className={`mt-3 text-xs ${remainingSeconds > 0 ? "text-slate-500" : "text-amber-300"}`}
                  >
                    {remainingSeconds > 0
                      ? `Mã còn hiệu lực trong ${clockText(remainingSeconds)}.`
                      : "Mã đã hết hạn. Hãy gửi lại mã mới."}
                  </p>
                  <button
                    disabled={
                      busy || code.length !== 6 || remainingSeconds === 0
                    }
                    className="auth-primary-button mt-6 w-full rounded-xl py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {busy ? "Đang xác minh..." : "Xác minh tài khoản"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || resendSeconds > 0}
                    onClick={() => void resend()}
                    className="mt-4 text-sm font-bold text-[#70caff] transition hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
                  >
                    {resendSeconds > 0
                      ? `Gửi lại mã sau ${clockText(resendSeconds)}`
                      : "Gửi lại mã xác minh"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStep("form");
                      setCode("");
                      setError("");
                      setSuccess("");
                    }}
                    className="mt-4 block w-full text-sm text-slate-500 hover:text-slate-300"
                  >
                    Sửa thông tin đăng ký
                  </button>
                  <AuthNotice error={error} success={success} />
                </div>
              </form>
            )}
            <div className="border-t border-[#263448] bg-[#090d14] px-5 py-5 text-center text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link
                href="/tai-khoan/dang-nhap"
                className="font-bold text-[#74caff] hover:text-white"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </section>
          <p className="mt-6 text-center text-xs leading-5 text-slate-600">
            Bằng việc đăng ký, bạn xác nhận đồng ý với điều khoản sử dụng và
          chính sách bảo mật của TrucTiepGAME.
          </p>
        </div>
      </main>
      <Footer />
      {completed ? <RegistrationSuccessModal email={form.email} /> : null}
    </div>
  );
}
