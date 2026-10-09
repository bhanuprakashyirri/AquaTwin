"use client";

/**
 * AquaTwin Sign In — Supabase Email/Password Authentication
 * LEFT: Art-directed farmland dawn photography + brand values.
 * RIGHT: Production-ready Supabase email/password login form with:
 *        - Inline field validation
 *        - Show/hide password toggle
 *        - Supabase error and success messaging
 *        - Redirect preserving (?redirect=...)
 *        - Direct link to Create Account (/register) and Password Recovery (/forgot-password)
 *        - Zero Google authentication buttons or dependencies.
 */

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import Image from "next/image";
import { EASE, fadeUp, riseUp, staggerContainer, successReveal } from "@/lib/motion";
import { useAuth } from "@/context/auth-context";

type Phase = "idle" | "loading" | "success";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect") || "/dashboard";

  const { signIn, user, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (user && phase === "idle") {
      router.replace(redirectTarget);
    }
  }, [user, redirectTarget, router, phase]);

  const validate = () => {
    const e: { email?: string; password?: string } = {};
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

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched({ email: true, password: true });
    setServerError(null);

    if (!validate()) return;

    setPhase("loading");

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setPhase("idle");
        // Sanitize and present user-friendly error messages
        const msg = error.message || "Failed to sign in";
        if (msg.toLowerCase().includes("invalid login credentials")) {
          setServerError("Invalid email or password. Please verify your credentials.");
        } else if (msg.toLowerCase().includes("email not confirmed")) {
          setServerError("Email is not verified yet. Please check your inbox for confirmation instructions.");
        } else {
          setServerError(msg);
        }
        return;
      }

      if (data?.session) {
        setPhase("success");
        window.setTimeout(() => {
          router.push(redirectTarget);
        }, 800);
      } else {
        setPhase("idle");
        setServerError("Could not establish session. Please verify your account.");
      }
    } catch (err: any) {
      setPhase("idle");
      setServerError(err?.message || "An unexpected error occurred. Please try again.");
    }
  };

  const emailError = touched.email && errors.email;
  const passwordError = touched.password && errors.password;

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
              &ldquo;A smarter way to decide when water should flow.&rdquo;
            </p>
            <footer className="mt-3 flex items-center gap-2 text-sm text-white/80">
              <Sprout size={15} />
              Field digital twin · What-if simulation · Water budget optimization
            </footer>
          </motion.blockquote>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-2 text-tiny text-white/70">
            <CloudRain size={14} />
            Field telemetry platform · Precision Irrigation Twin
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — Supabase Auth Panel */}
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-10 lg:w-[54%]">
        <motion.div
          variants={riseUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-[420px]"
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

          <motion.h1
            variants={fadeUp}
            className="text-[28px] font-semibold leading-tight tracking-tight text-ink"
          >
            Sign in
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-2 text-sm leading-relaxed text-ink-muted">
            Access your field digital twin and telemetry workspace.
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
                . Please configure <code className="rounded bg-surface px-1 py-0.5 text-micro font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
                <code className="rounded bg-surface px-1 py-0.5 text-micro font-mono">frontend/.env.local</code> to enable live authentication.
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
            className="mt-7 space-y-4"
          >
            {/* Email input */}
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
                  id="login-email"
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
                  htmlFor="login-email"
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

            {/* Password input */}
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
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
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
                  htmlFor="login-password"
                  className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                >
                  Password
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

            {/* Links row */}
            <div className="flex items-center justify-between text-tiny pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-ink-soft select-none">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-line-strong accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="font-medium text-brand transition-colors duration-150 hover:text-brand-dark"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={phase === "loading"}
              className={`group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 hover:-translate-y-0.5 active:scale-[0.985] active:translate-y-0 ${
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
                    Sign in{" "}
                    <ArrowRight
                      size={15}
                      className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                    />
                  </motion.span>
                )}
                {phase === "loading" && (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
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
                    <CheckCircle2 size={16} /> Authenticated
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.form>

          {/* Link to Create Account */}
          <motion.div variants={fadeUp} className="mt-8 text-center text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand transition-colors duration-150 hover:text-brand-dark underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-8 text-center text-micro text-ink-faint">
            AquaTwin Enterprise Platform · Operational Telemetry & Control
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-page">
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            <p className="text-xs font-medium text-ink-muted">Loading AquaTwin Auth…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
