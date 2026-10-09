

"use client";

/**
 * AquaTwin Create Account — Supabase Email/Password Registration
 * LEFT: Art-directed farmland dawn photography + brand message.
 * RIGHT: Production-ready registration form:
 *        - Full Name, Email, Password, Confirm Password
 *        - Field-level validation + matching check
 *        - Full name stored in Supabase user metadata
 *        - Handles email confirmation required vs immediate session
 *        - Link to Sign In (/login)
 *        - Zero Google authentication buttons or dependencies
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sprout,
  User as UserIcon,
  AlertCircle,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import Image from "next/image";
import { EASE, fadeUp, riseUp, staggerContainer, successReveal } from "@/lib/motion";
import { useAuth } from "@/context/auth-context";

type Phase = "idle" | "submitting" | "confirmed_email" | "success";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isConfigured } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [touched, setTouched] = useState<{
    fullName: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  }>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const validate = () => {
    const e: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      e.fullName = "Full name is required";
    }

    if (!email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = "Enter a valid email address";
    }

    if (!password) {
      e.password = "Password is required";
    } else if (password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      e.confirmPassword = "Confirm password is required";
    } else if (confirmPassword !== password) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setServerError(null);

    if (!validate()) return;

    setPhase("submitting");

    try {
      const { data, error } = await signUp(email, password, fullName);

      if (error) {
        setPhase("idle");
        const msg = error.message || "Failed to create account";
        if (msg.toLowerCase().includes("user already registered")) {
          setServerError("An account with this email already exists. Please sign in instead.");
        } else {
          setServerError(msg);
        }
        return;
      }

      // Check whether Supabase established a session immediately or requires email confirmation
      if (data?.session) {
        // Immediate session granted (email confirmation disabled in Supabase)
        setPhase("success");
        window.setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else if (data?.user) {
        // Email confirmation is required
        setPhase("confirmed_email");
      } else {
        setPhase("idle");
        setServerError("Could not complete registration. Please try again.");
      }
    } catch (err: any) {
      setPhase("idle");
      setServerError(err?.message || "An unexpected error occurred during account creation.");
    }
  };

  const nameError = touched.fullName && errors.fullName;
  const emailError = touched.email && errors.email;
  const passwordError = touched.password && errors.password;
  const confirmPasswordError = touched.confirmPassword && errors.confirmPassword;

  return (
    <div className="flex min-h-screen bg-page">
      {/* LEFT — Art-directed farmland photography */}
      <div className="relative hidden w-[48%] overflow-hidden lg:block">
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
          className="absolute inset-0"
        >
          <Image
            src="/images/login_sunrise.jpg"
            alt="Sunrise over Indian rice farm with irrigation channel"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/95 via-[#163A31]/40 to-transparent" />

        <motion.div
          variants={staggerContainer(0.1, 0.3)}
          initial="hidden"
          animate="show"
          className="absolute inset-x-0 bottom-0 p-12"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md p-1.5 shadow-sm">
              <Image src="/logo-white.png" alt="AquaTwin" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">AquaTwin</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Irrigation Intelligence
              </div>
            </div>
          </motion.div>
          <motion.blockquote variants={fadeUp} className="mt-8 max-w-md">
            <p className="text-[24px] font-semibold leading-snug tracking-tight text-white">
              &ldquo;Join farmers and agronomists reducing water waste by 35%.&rdquo;
            </p>
            <footer className="mt-3 flex items-center gap-2 text-sm text-white/80">
              <Sprout size={15} />
              Sensor telemetry · Soil moisture curves · AI schedule optimizer
            </footer>
          </motion.blockquote>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-2 text-tiny text-white/70">
            <CloudRain size={14} />
            Field telemetry platform · Precision Irrigation Twin
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — Supabase Registration Panel */}
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-10 lg:w-[54%]">
        <motion.div
          variants={riseUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-[440px]"
        >
          {/* Mobile brand header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light p-1">
              <Image src="/logo.png" alt="AquaTwin" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <div className="text-[16px] font-semibold tracking-tight text-ink">AquaTwin</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Irrigation Intelligence
              </div>
            </div>
          </div>

          {phase === "confirmed_email" ? (
            /* Email verification check notice */
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-line bg-surface p-7 shadow-sm text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
                <Inbox size={28} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink">Check your inbox</h2>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                We sent a confirmation link to <strong className="text-ink font-medium">{email}</strong>.
                Please check your email and click the confirmation link to activate your AquaTwin account.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Return to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.h1
                variants={fadeUp}
                className="text-[28px] font-semibold leading-tight tracking-tight text-ink"
              >
                Create your account
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-2 text-sm leading-relaxed text-ink-muted">
                Start managing precision irrigation with physics-calibrated AI.
              </motion.p>

              {/* Missing Anon Key configuration notice (if applicable) */}
              {!isConfigured && (
                <motion.div
                  variants={fadeUp}
                  className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-ink"
                >
                  <ShieldAlert size={18} className="shrink-0 text-warning mt-0.5" />
                  <div>
                    <span className="font-semibold text-warning-dark">Configuration Notice:</span>{" "}
                    Supabase URL is set to{" "}
                    <code className="rounded bg-surface px-1 py-0.5 text-micro font-mono">
                      jqqduvjelvsnvxznttdi
                    </code>
                    . Configure <code className="rounded bg-surface px-1 py-0.5 text-micro font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
                    <code className="rounded bg-surface px-1 py-0.5 text-micro font-mono">frontend/.env.local</code> to complete registration.
                  </div>
                </motion.div>
              )}

              {/* Server-level error notice */}
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
                  role="alert"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </motion.div>
              )}

              <motion.form
                variants={fadeUp}
                onSubmit={onSubmit}
                noValidate
                className="mt-7 space-y-3.5"
              >
                {/* Full Name */}
                <div>
                  <div
                    className={`group relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      nameError
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <UserIcon
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        nameError ? "text-danger" : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="register-name"
                      type="text"
                      value={fullName}
                      autoComplete="name"
                      aria-invalid={!!nameError}
                      aria-describedby={nameError ? "name-error" : undefined}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (serverError) setServerError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-3.5 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="register-name"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Full name
                    </label>
                  </div>
                  <AnimatePresence>
                    {nameError ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        id="name-error"
                        className="mt-1.5 text-tiny text-danger"
                        role="alert"
                      >
                        {nameError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Email */}
                <div>
                  <div
                    className={`group relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      emailError
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Mail
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        emailError ? "text-danger" : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      autoComplete="email"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "email-error" : undefined}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (serverError) setServerError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-3.5 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="register-email"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Email address
                    </label>
                  </div>
                  <AnimatePresence>
                    {emailError ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        id="email-error"
                        className="mt-1.5 text-tiny text-danger"
                        role="alert"
                      >
                        {emailError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Password */}
                <div>
                  <div
                    className={`relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      passwordError
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Lock
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        passwordError ? "text-danger" : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      autoComplete="new-password"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "password-error" : undefined}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (serverError) setServerError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="register-password"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Password (min. 6 characters)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {passwordError ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        id="password-error"
                        className="mt-1.5 text-tiny text-danger"
                        role="alert"
                      >
                        {passwordError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Confirm Password */}
                <div>
                  <div
                    className={`relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      confirmPasswordError
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Lock
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        confirmPasswordError ? "text-danger" : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      autoComplete="new-password"
                      aria-invalid={!!confirmPasswordError}
                      aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (serverError) setServerError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="register-confirm-password"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Confirm password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {confirmPasswordError ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        id="confirm-password-error"
                        className="mt-1.5 text-tiny text-danger"
                        role="alert"
                      >
                        {confirmPasswordError}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={phase === "submitting"}
                  className={`group relative mt-3 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 hover:-translate-y-0.5 active:scale-[0.985] active:translate-y-0 ${
                    phase === "success"
                      ? "bg-success text-white shadow-raised"
                      : "bg-brand text-white hover:bg-brand-dark hover:shadow-raised"
                  } disabled:opacity-75 disabled:pointer-events-none cursor-pointer`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {phase === "idle" && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="flex items-center gap-2"
                      >
                        Create account{" "}
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                        />
                      </motion.span>
                    )}
                    {phase === "submitting" && (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2.5"
                      >
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Creating account…
                      </motion.span>
                    )}
                    {phase === "success" && (
                      <motion.span
                        key="success"
                        variants={successReveal}
                        initial="hidden"
                        animate="show"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Account created
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.form>

              {/* Link to Sign In */}
              <motion.div variants={fadeUp} className="mt-7 text-center text-sm text-ink-muted">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand transition-colors duration-150 hover:text-brand-dark underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </motion.div>

              <motion.p variants={fadeUp} className="mt-8 text-center text-micro text-ink-faint">
                AquaTwin Enterprise Platform · Operational Telemetry & Control
              </motion.p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
