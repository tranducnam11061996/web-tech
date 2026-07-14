"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { FieldError } from "@/components/forms/FieldError";
import { CustomerApiError, customerFetch, useCustomerSession } from "@/lib/customer";
import { getCustomerRecaptchaToken } from "@/lib/customerRecaptcha";
import { apiErrorSummary } from "@/lib/storefrontApi";
import { focusFirstInvalidField, validateEmail, validateVietnamPhone, type FieldErrors } from "@/lib/storefrontValidation";
import {
  AtSign,
  Check,
  Fingerprint,
  LockKeyhole,
  Mail,
  Phone,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AuthNotice,
  PasswordInput,
  REGISTRATION_LOGIN_HINT,
  SoonLabel,
  authInputClass,
} from "./CustomerAuthShared";

type LoginMode = "email" | "phone";

const providers = [
  { mark: "G", name: "Google" },
  { mark: "f", name: "Facebook" },
  { mark: "Z", name: "Zalo" },
  { mark: "⌘", name: "GitHub" },
];

const WELCOME_DURATION = 6000;

function LoginWelcomeModal({ name }: { name: string }) {
  const router = useRouter();
  const accountRef = useRef<HTMLButtonElement>(null);
  const cartRef = useRef<HTMLButtonElement>(null);
  const navigated = useRef(false);
  const go = useCallback((path: string) => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace(path);
  }, [router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    accountRef.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => go("/tai-khoan"), WELCOME_DURATION);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); go("/tai-khoan"); }
      if (event.key !== "Tab") return;
      const first = cartRef.current; const last = accountRef.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [go]);

  return <div className="registration-success-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) go("/tai-khoan"); }}>
    <section className="registration-success-dialog" role="dialog" aria-modal="true" aria-labelledby="login-welcome-title" aria-describedby="login-welcome-description">
      <span className="registration-success-scan" aria-hidden="true" />
      <div className="registration-success-orbit" aria-hidden="true"><span /><Check className="h-8 w-8" strokeWidth={3} /></div>
      <p className="font-mono text-[10px] font-black uppercase tracking-[.22em] text-[#70cbff]">ACCESS GRANTED // TRUCTIEPGAME</p>
      <h2 id="login-welcome-title" className="mt-3 text-3xl font-black tracking-[-.04em] text-white">Chào mừng {name}</h2>
      <p id="login-welcome-description" className="mt-3 text-sm leading-6 text-slate-300">Bạn đã đăng nhập thành công. Chọn điểm đến hoặc hệ thống sẽ mở trang tài khoản sau 6 giây.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button ref={cartRef} type="button" onClick={() => go("/gio-hang")} className="rounded-xl border border-[#3b6b8b] bg-[#0b1c2a] px-4 py-3 text-sm font-black text-[#8bd7ff] transition hover:border-[#69c9ff] hover:text-white"><ShoppingCart className="mr-2 inline h-4 w-4" />Đến giỏ hàng</button>
        <button ref={accountRef} type="button" onClick={() => go("/tai-khoan")} className="auth-primary-button rounded-xl px-4 py-3 text-sm font-black text-white">Thông tin tài khoản</button>
      </div>
      <div className="registration-success-timer" aria-hidden="true"><span /></div>
    </section>
  </div>;
}

export function LoginPage({
  favoriteProductId = null,
  returnTo = null,
}: {
  favoriteProductId?: number | null;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const { reload } = useCustomerSession();
  const [mode, setMode] = useState<LoginMode>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [favoriteContinuationError, setFavoriteContinuationError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const identifierError = mode === "email" ? validateEmail(identifier) : validateVietnamPhone(identifier);
  const passwordError = password ? "" : "Vui lòng nhập mật khẩu.";
  const visibleIdentifierError = fieldErrors.identifier || (touched.identifier ? identifierError : "");
  const visiblePasswordError = fieldErrors.password || (touched.password ? passwordError : "");

  const completeLoginContinuation = useCallback(async () => {
    if (favoriteProductId) {
      await customerFetch(`/api/customer/favorites/${favoriteProductId}`, { method: "PUT" });
    }
    router.replace(returnTo || "/yeu-thich");
  }, [favoriteProductId, returnTo, router]);

  useEffect(() => {
    try {
      const hint = window.sessionStorage.getItem(REGISTRATION_LOGIN_HINT);
      if (!hint) return;
      window.sessionStorage.removeItem(REGISTRATION_LOGIN_HINT);
      const data = JSON.parse(hint) as { email?: string; registered?: boolean };
      if (data.email) {
        setIdentifier(data.email);
        setMode("email");
      }
      if (data.registered)
        setSuccess("Đăng ký thành công. Hãy đăng nhập để tiếp tục.");
    } catch {
      window.sessionStorage.removeItem(REGISTRATION_LOGIN_HINT);
    }
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFavoriteContinuationError("");
    setFieldErrors({});
    setTouched({ identifier: true, password: true });
    const clientErrors: FieldErrors = {};
    if (identifierError) clientErrors.identifier = identifierError;
    if (passwordError) clientErrors.password = passwordError;
    if (Object.keys(clientErrors).length) {
      setError("Vui lòng sửa các trường được đánh dấu bên dưới.");
      window.setTimeout(() => focusFirstInvalidField(formRef.current, clientErrors));
      return;
    }
    setBusy(true);
    try {
      const recaptchaToken = await getCustomerRecaptchaToken("customer_login");
      await customerFetch("/api/customer/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password, rememberMe, recaptchaToken }),
      });
      const nextUser = await reload();
      if (favoriteProductId || returnTo) {
        try {
          await completeLoginContinuation();
        } catch (reason) {
          setSuccess("Đăng nhập thành công.");
          setFavoriteContinuationError(
            reason instanceof Error ? reason.message : "Không thể lưu sản phẩm yêu thích.",
          );
        }
      } else {
        setWelcomeName(nextUser?.name?.trim() || "bạn");
      }
    } catch (reason) {
      if (reason instanceof CustomerApiError) setFieldErrors(reason.fields);
      setError(apiErrorSummary(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-login-page min-h-screen bg-[#07090e] text-white">
      <Header />
      <main
        id="main-content"
        className="auth-login-stage relative isolate overflow-hidden px-4 py-8 sm:py-12"
      >
        <div className="auth-grid" aria-hidden="true" />
        <div className="mx-auto grid min-h-[690px] max-w-[1280px] overflow-hidden rounded-[28px] border border-[#263246] bg-[#0b0e15]/95 shadow-[0_40px_120px_rgba(0,40,90,.34)] lg:grid-cols-[.94fr_1.06fr]">
          <section
            className="auth-login-hero relative hidden overflow-hidden border-r border-[#29405e] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14"
            aria-labelledby="login-hero-title"
          >
            <div className="auth-beam" aria-hidden="true" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] border border-[#6ac7ff]/40 bg-[#6ac7ff]/10 text-[#91d6ff]">
                <Fingerprint className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#7dccff]">
                TRUCTIEPGAME IDENTITY NODE
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  SECURE ACCESS // ONLINE
                </p>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-[#8ad2ff]">
                Chào mừng bạn trở lại
              </p>
              <h1
                id="login-hero-title"
                className="mt-4 max-w-md text-5xl font-black leading-[.98] tracking-[-.045em] text-white xl:text-6xl"
              >
                Đăng nhập.
                <br />
                <span className="auth-stroke-text">Mở thế giới công nghệ.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Theo dõi đơn hàng, lưu địa chỉ giao nhận và tiếp tục hành trình
                mua sắm trên mọi thiết bị.
              </p>
            </div>
            <div className="auth-terminal relative z-10">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-mono text-[10px] tracking-[.2em] text-[#64c3ff]">
                  ACCOUNT CONSOLE
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_#34d399]" />
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 p-4 text-xs">
                <span className="font-mono text-slate-600">01</span>
                <span className="text-slate-300">
                  Đăng nhập bảo mật bằng email hoặc điện thoại
                </span>
                <span className="font-mono text-slate-600">02</span>
                <span className="text-slate-300">
                  Phiên hoạt động được kiểm soát riêng tư
                </span>
                <span className="font-mono text-slate-600">03</span>
                <span className="text-slate-300">
                  Lịch sử mua hàng luôn sẵn sàng
                </span>
              </div>
            </div>
          </section>
          <section className="relative flex items-center bg-[radial-gradient(circle_at_100%_0%,rgba(36,121,190,.13),transparent_35%),#0d1018] p-6 sm:p-10 xl:p-14">
            <div className="mx-auto w-full max-w-[500px]">
              <div className="mb-8 lg:hidden">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-[14px] border border-[#6ac7ff]/40 bg-[#6ac7ff]/10 text-[#91d6ff]">
                  <Fingerprint className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-xs font-black uppercase tracking-[.24em] text-[#7dccff]">
              TrucTiepGAME account
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-slate-500">
                Access portal / 01
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-[-.04em]">
                Đăng nhập
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Nhập thông tin để truy cập tài khoản của bạn.
              </p>
              <div
                className="mt-7 grid grid-cols-2 rounded-xl border border-[#262e3b] bg-[#090c12] p-1"
                role="tablist"
                aria-label="Chọn phương thức đăng nhập"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "email"}
                  onClick={() => {
                    setMode("email");
                    setIdentifier("");
                    setFieldErrors({});
                    setTouched({});
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${mode === "email" ? "bg-[#182337] text-[#8bd2ff] shadow-inner" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "phone"}
                  onClick={() => {
                    setMode("phone");
                    setIdentifier("");
                    setFieldErrors({});
                    setTouched({});
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${mode === "phone" ? "bg-[#182337] text-[#8bd2ff] shadow-inner" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Điện thoại
                </button>
              </div>
              <form
                ref={formRef}
                onSubmit={submit}
                noValidate
                className="mt-6 space-y-5"
                aria-busy={busy}
              >
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-semibold text-slate-200"
                >
                  {mode === "email" ? "Email" : "Số điện thoại"}{" "}
                  <span className="text-[#62c4ff]">*</span>
                </label>
                <div className="relative -mt-3">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {mode === "email" ? (
                      <AtSign className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <input
                    id="login-identifier"
                    name="identifier"
                    required
                    maxLength={255}
                    aria-invalid={Boolean(visibleIdentifierError) || undefined}
                    aria-describedby={visibleIdentifierError ? "login-identifier-error" : undefined}
                    type={mode === "email" ? "email" : "tel"}
                    inputMode={mode === "email" ? "email" : "tel"}
                    autoComplete={mode === "email" ? "email" : "tel"}
                    value={identifier}
                    onChange={(event) => { setIdentifier(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.identifier; return next; }); }}
                    onBlur={() => setTouched((current) => ({ ...current, identifier: true }))}
                    placeholder={
                      mode === "email" ? "ban@example.com" : "09xx xxx xxx"
                    }
                    className={authInputClass}
                  />
                </div>
                <FieldError id="login-identifier-error" message={visibleIdentifierError} />
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Mật khẩu <span className="text-[#62c4ff]">*</span>
                </label>
                <div className="-mt-3">
                  <PasswordInput
                    id="login-password"
                    name="password"
                    value={password}
                    onChange={(value) => { setPassword(value); setFieldErrors((current) => { const next = { ...current }; delete next.password; return next; }); }}
                    onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                    invalid={Boolean(visiblePasswordError)}
                    describedBy={visiblePasswordError ? "login-password-error" : undefined}
                    autoComplete="current-password"
                  />
                </div>
                <FieldError id="login-password-error" message={visiblePasswordError} />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 accent-[#399de2]"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <Link
                    href="/tai-khoan/quen-mat-khau"
                    className="font-semibold text-[#72c9ff] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <button
                  disabled={busy}
                  className="auth-primary-button w-full rounded-xl py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy ? "Đang xác thực..." : "Đăng nhập"}
                </button>
                <div id="login-form-error"><AuthNotice error={error} success={success} /></div>
              </form>
              {favoriteContinuationError ? (
                <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/5 p-4" role="alert">
                  <p className="text-sm font-bold text-amber-100">{favoriteContinuationError}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Tài khoản đã đăng nhập. Bạn có thể thử lưu lại hoặc mở danh sách hiện có.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setFavoriteContinuationError("");
                        try {
                          await completeLoginContinuation();
                        } catch (reason) {
                          setFavoriteContinuationError(reason instanceof Error ? reason.message : "Không thể lưu sản phẩm yêu thích.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-100 disabled:opacity-60"
                    >
                      {busy ? "Đang thử lại..." : "Thử lưu lại"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.replace("/yeu-thich")}
                      className="rounded-lg border border-slate-500 px-3 py-2 text-xs font-bold text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      Mở danh sách yêu thích
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                disabled
                aria-describedby="future-auth-note"
                className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#33435a] bg-[#101723] py-3 text-sm font-semibold text-slate-500"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Đăng nhập bằng OTP <SoonLabel />
              </button>
              <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-[.16em] text-slate-600">
                <span className="h-px flex-1 bg-[#28303c]" />
                Hoặc đăng nhập với
                <span className="h-px flex-1 bg-[#28303c]" />
              </div>
              <p id="future-auth-note" className="sr-only">
                Các phương thức đăng nhập này đang được phát triển và chưa thể
                sử dụng.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    disabled
                    className="group flex cursor-not-allowed items-center justify-between rounded-xl border border-[#2b3340] bg-[#0a0d13] px-4 py-3 text-sm text-slate-500"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-lg border border-[#343e4d] font-black text-slate-400">
                        {provider.mark}
                      </span>
                      {provider.name}
                    </span>
                    <span className="text-[9px] font-bold uppercase">
                      Sắp ra mắt
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-7 text-center text-sm text-slate-400">
                Chưa có tài khoản?{" "}
                <Link
                  href="/tai-khoan/dang-ky"
                  className="font-bold text-[#72c9ff] hover:text-white"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      {welcomeName ? <LoginWelcomeModal name={welcomeName} /> : null}
    </div>
  );
}
