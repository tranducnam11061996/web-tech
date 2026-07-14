"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";

export const REGISTRATION_LOGIN_HINT = "hacom.customer.registration-login-hint";
export const authInputClass =
  "auth-field-input w-full rounded-xl border border-[#303746] bg-[#090c13]/90 px-11 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#55b8ff] focus:ring-2 focus:ring-[#55b8ff]/20";

export function AuthNotice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <div className="min-h-0" aria-live="polite">
      {error ? (
        <p
          className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder = "Nhập mật khẩu",
  describedBy,
  invalid,
  minLength,
  name,
  onBlur,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
  minLength?: number;
  name?: string;
  onBlur?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative mt-2">
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      >
        ◆
      </span>
      <input
        id={id}
        name={name}
        required
        minLength={minLength}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={`${authInputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function SoonLabel() {
  return (
    <span className="rounded-md border border-[#40516c] bg-[#162033] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.16em] text-[#80caff]">
      Sắp ra mắt
    </span>
  );
}

export const passwordChecks = (password: string) => [
  {
    label: "Từ 8 đến 128 ký tự",
    valid: password.length >= 8 && password.length <= 128,
  },
  { label: "Có ít nhất 1 chữ hoa", valid: /[A-Z]/.test(password) },
  { label: "Có ít nhất 1 chữ thường", valid: /[a-z]/.test(password) },
  { label: "Có ít nhất 1 chữ số", valid: /\d/.test(password) },
  {
    label: "Có ít nhất 1 ký tự đặc biệt",
    valid: /[^A-Za-z0-9\s]/.test(password),
  },
];

export function PasswordRequirements({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  return (
    <ul
      id={id}
      className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2"
      aria-label="Yêu cầu mật khẩu"
    >
      {passwordChecks(password).map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-2 ${item.valid ? "text-emerald-300" : "text-slate-500"}`}
        >
          <span
            className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${item.valid ? "bg-emerald-400/15" : "bg-white/5"}`}
            aria-hidden="true"
          >
            {item.valid ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
