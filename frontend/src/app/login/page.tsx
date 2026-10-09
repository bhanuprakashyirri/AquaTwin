"use client";

/**
 * AquaTwin login — split-screen composition.
 * LEFT: art-directed farmland-at-dawn scene + brand message.
 * RIGHT: authentication interface with floating labels, validation,
 *        loading → success states, and a one-click demo mode.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CloudRain, Droplets, Eye, EyeOff, Lock, Mail, Sprout } from "lucide-react";
import Image from "next/image";
import { EASE, fadeUp, riseUp, staggerContainer, successReveal } from "@/lib/motion";

type Phase = "idle" | "loading" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched({ email: true, password: true });
    if (!validate()) return;
    setPhase("loading");
    // Demo auth — any valid credentials enter the workspace.
    window.setTimeout(() => setPhase("success"), 1100);
    window.setTimeout(() => router.push("/dashboard"), 1750);
  };

  const enterDemo = () => {
    setPhase("loading");
    window.setTimeout(() => setPhase("success"), 900);
    window.setTimeout(() => router.push("/dashboard"), 1500);
  };

  const emailError = touched.email && errors.email;
  const passwordError = touched.password && errors.password;

  return (
    <div className="flex min-h-screen bg-page">
      {/* LEFT — visual panel with authentic Indian agricultural sunrise photography */}
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
        {/* Soft gradient overlay for high editorial readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/90 via-[#163A31]/30 to-transparent" />

        <motion.div
          variants={staggerContainer(0.1, 0.3)}
          initial="hidden"
          animate="show"
          className="absolute inset-x-0 bottom-0 p-12"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md p-1.5">
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
            Simulated demo farm · Bhimavaram, Andhra Pradesh
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — auth panel */}
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-10 lg:w-[54%]">
        <motion.div
          variants={riseUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-[420px]"
        >
          {/* mobile brand */}
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
            Welcome back
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-2 text-sm leading-relaxed text-ink-muted">
            Continue to your field intelligence workspace.
          </motion.p>

          <motion.form
            variants={fadeUp}
            onSubmit={onSubmit}
            noValidate
            className="mt-8 space-y-5"
          >
            {/* Email — floating label */}
            <div>
              <div
                className={`group relative rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200 ${
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
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder=" "
                  className="peer w-full rounded-lg border-0 bg-transparent pb-2.5 pl-10 pr-3.5 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                />
                <label
                  htmlFor="login-email"
                  className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                >
                  Email
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

            {/* Password — floating label + reveal */}
            <div>
              <div
                className={`relative rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200 ${
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
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder=" "
                  className="peer w-full rounded-lg border-0 bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
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

            <div className="flex items-center justify-between text-tiny">
              <label className="flex cursor-pointer items-center gap-2 text-ink-soft">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-line-strong accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />
                Remember me
              </label>
              <Link
                href="/login"
                onClick={(e) => e.preventDefault()}
                className="font-medium text-brand transition-colors duration-150 hover:text-brand-dark"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in — loading → success */}
            <button
              type="submit"
              disabled={phase !== "idle"}
              className={`group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 hover:-translate-y-0.5 active:scale-[0.985] active:translate-y-0 ${
                phase === "success"
                  ? "bg-success text-white shadow-raised"
                  : "bg-brand text-white hover:bg-brand-dark hover:shadow-raised"
              } disabled:pointer-events-none cursor-pointer`}
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
                    Sign in <ArrowRight size={15} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
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
                    <CheckCircle2 size={16} /> Welcome to AquaTwin
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-micro text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </motion.div>

          <motion.button
            variants={fadeUp}
            onClick={enterDemo}
            disabled={phase !== "idle"}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-medium text-ink transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out hover:bg-brand-light/70 hover:border-brand/40 hover:text-brand-dark hover:shadow-card hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.985] active:translate-y-0 disabled:pointer-events-none cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"/>
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"/>
            </svg>
            Continue with Google
          </motion.button>

          {/* Demo access — the hackathon path */}
          <motion.div variants={fadeUp} className="mt-6 rounded-2xl border border-line bg-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-ink">Demo access</div>
                <div className="mt-0.5 text-tiny leading-relaxed text-ink-muted">
                  Explore the full workspace with a simulated farm — no account needed.
                </div>
              </div>
              <button
                onClick={enterDemo}
                disabled={phase !== "idle"}
                className="shrink-0 rounded-full bg-brand px-4 py-2 text-tiny font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-brand-dark hover:shadow-raised hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95 disabled:pointer-events-none cursor-pointer"
              >
                Enter demo
              </button>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-center text-micro text-ink-faint">
            Protected demo · all field data is simulated for presentation
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
