"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { customerFetch } from "@/lib/customer";
import { getCustomerRecaptchaToken } from "@/lib/customerRecaptcha";
import { KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthNotice,
  PasswordInput,
  PasswordRequirements,
  authInputClass,
  passwordChecks,
} from "./CustomerAuthShared";

export function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "confirm">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const recaptchaToken = await getCustomerRecaptchaToken("password_reset_request");
      await customerFetch("/api/customer/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email, recaptchaToken }),
      });
      setStep("confirm");
      setSuccess("Nếu email tồn tại, mã xác thực đã được gửi.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể gửi mã xác thực.",
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!passwordChecks(password).every((item) => item.valid)) {
      setError("Mật khẩu chưa đáp ứng đầy đủ các yêu cầu bảo mật.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      const recaptchaToken = await getCustomerRecaptchaToken("password_reset_confirm");
      await customerFetch("/api/customer/auth/forgot-password/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code, password, recaptchaToken }),
      });
      router.replace("/tai-khoan/dang-nhap");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể đặt lại mật khẩu.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#080a10] text-white">
      <Header />
      <main
        id="main-content"
        className="relative isolate min-h-[680px] overflow-hidden px-4 py-12"
      >
        <div className="auth-grid" aria-hidden="true" />
        <section className="relative z-10 mx-auto max-w-lg rounded-[26px] border border-[#2b3c54] bg-[#0d111a]/95 p-6 shadow-[0_30px_90px_rgba(0,52,100,.25)] sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded-[14px] border border-[#64c8ff]/35 bg-[#64c8ff]/10 text-[#83d3ff]">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-6 font-mono text-[10px] font-black uppercase tracking-[.2em] text-[#73caff]">
            ACCOUNT RECOVERY
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.035em]">
            {step === "email" ? "Quên mật khẩu?" : "Tạo mật khẩu mới"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {step === "email"
              ? "Nhập email tài khoản để nhận mã xác thực."
              : "Nhập OTP và mật khẩu mới có ít nhất 8 ký tự."}
          </p>
          {step === "email" ? (
            <form onSubmit={requestCode} className="mt-7" aria-busy={busy}>
              <label
                htmlFor="forgot-email"
                className="text-sm font-semibold text-slate-200"
              >
                Email
              </label>
              <div className="relative mt-2">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="forgot-email"
                  required
                  type="email"
                  maxLength={255}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={authInputClass}
                  placeholder="ban@example.com"
                />
              </div>
              <button
                disabled={busy}
                className="auth-primary-button mt-5 w-full rounded-xl py-3.5 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? "Đang gửi..." : "Gửi mã xác thực"}
              </button>
              <AuthNotice error={error} success={success} />
            </form>
          ) : (
            <form onSubmit={reset} className="mt-7 space-y-5" aria-busy={busy}>
              <label
                htmlFor="forgot-code"
                className="block text-sm font-semibold text-slate-200"
              >
                Mã xác thực
              </label>
              <input
                id="forgot-code"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className={`${authInputClass} -mt-3 text-center font-mono tracking-[.35em]`}
                placeholder="000000"
              />
              <div>
                <label
                  htmlFor="forgot-password"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Mật khẩu mới
                </label>
                <PasswordInput
                  id="forgot-password"
                  minLength={8}
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  describedBy="forgot-password-hint"
                />
              </div>
              <div>
                <label
                  htmlFor="forgot-confirm"
                  className="block text-sm font-semibold text-slate-200"
                >
                  Nhập lại mật khẩu
                </label>
                <PasswordInput
                  id="forgot-confirm"
                  minLength={8}
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                  invalid={Boolean(confirm && confirm !== password)}
                />
              </div>
              <PasswordRequirements password={password} id="forgot-password-hint" />
              <button
                disabled={busy}
                className="auth-primary-button w-full rounded-xl py-3.5 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
              </button>
              <AuthNotice error={error} success={success} />
            </form>
          )}
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link
              href="/tai-khoan/dang-nhap"
              className="font-bold text-[#73caff] hover:text-white"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
