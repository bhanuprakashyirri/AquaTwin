"use client";

/**
 * AquaTwin Forgot Password — Supabase Recovery Request
 */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  AlertCircle,
  Inbox,
  Sprout,
  CloudRain,
} from "lucide-react";
import Image from "next/image";
import { EASE, fadeUp, riseUp, staggerContainer } from "@/lib/motion";
import { useAuth } from "@/context/auth-context";

export default function ForgotPasswordPage() {
  const { resetPassword, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!isEmailValid) return;

    setPhase("submitting");

    try {
      const { error: resetErr } = await resetPassword(email);

      if (resetErr) {
        setPhase("idle");
        setError(resetErr.message || "Failed to send reset email");
        return;
      }

      setPhase("sent");
    } catch (err: any) {
      setPhase("idle");
      setError(err?.message || "An unexpected error occurred. Please try again.");
    }
  };

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
              &ldquo;Secure access to your agricultural digital twin.&rdquo;
            </p>
            <footer className="mt-3 flex items-center gap-2 text-sm text-white/80">
              <Sprout size={15} />
              Telemetry · Calibration · Water budget optimization
            </footer>
          </motion.blockquote>
          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-2 text-tiny text-white/70">
            <CloudRain size={14} />
            Field telemetry platform · Precision Irrigation Twin
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT — Forgot Password Panel */}
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

          {phase === "sent" ? (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-line bg-surface p-7 shadow-sm text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
                <Inbox size={28} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink">Check your email</h2>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                If an account exists for <strong className="text-ink font-medium">{email}</strong>, we sent a password reset link. Follow the instructions in the email to set a new password.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  <ArrowLeft size={16} /> Return to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.h1
                variants={fadeUp}
                className="text-[28px] font-semibold leading-tight tracking-tight text-ink"
              >
                Reset your password
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-2 text-sm leading-relaxed text-ink-muted">
                Enter your email address and we will send you a secure link to reset your password.
              </motion.p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
                  role="alert"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.form
                variants={fadeUp}
                onSubmit={onSubmit}
                noValidate
                className="mt-7 space-y-4"
              >
                <div>
                  <div
                    className={`group relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      touched && !isEmailValid
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Mail
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        touched && !isEmailValid ? "text-danger" : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      autoComplete="email"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      onBlur={() => setTouched(true)}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-3.5 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="reset-email"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Email address
                    </label>
                  </div>
                  <AnimatePresence>
                    {touched && !isEmailValid ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="mt-1.5 text-tiny text-danger"
                      >
                        Enter a valid email address
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  disabled={phase === "submitting"}
                  className="group relative mt-3 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brand text-sm font-semibold text-white transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-brand-dark hover:shadow-raised hover:-translate-y-0.5 active:scale-[0.985] active:translate-y-0 disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
                >
                  {phase === "submitting" ? (
                    <span className="flex items-center gap-2.5">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending reset link…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send reset link <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </motion.form>

              <motion.div variants={fadeUp} className="mt-7 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-dark"
                >
                  <ArrowLeft size={15} /> Back to sign in
                </Link>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
