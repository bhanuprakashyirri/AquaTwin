"use client";

/**
 * AquaTwin Reset Password — Set New Password
 * Supabase handles token exchange automatically via URL hash on callback.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sprout,
  CloudRain,
} from "lucide-react";
import Image from "next/image";
import { EASE, fadeUp, riseUp, staggerContainer, successReveal } from "@/lib/motion";
import { useAuth } from "@/context/auth-context";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phase, setPhase] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  const isPasswordValid = password.length >= 6;
  const doPasswordsMatch = password === confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    setError(null);

    if (!isPasswordValid || !doPasswordsMatch) return;

    setPhase("submitting");

    try {
      const { error: updateErr } = await updatePassword(password);

      if (updateErr) {
        setPhase("idle");
        setError(updateErr.message || "Failed to update password");
        return;
      }

      setPhase("success");
      window.setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
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
              &ldquo;New credentials for secure farm management.&rdquo;
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

      {/* RIGHT — Form Panel */}
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-10 lg:w-[54%]">
        <motion.div
          variants={riseUp}
          initial="hidden"
          animate="show"
          className="w-full max-w-[420px]"
        >
          {phase === "success" ? (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-line bg-surface p-7 shadow-sm text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light text-success">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink">Password updated</h2>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                Your password has been successfully updated. Redirecting to your dashboard…
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Continue to dashboard
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.h1
                variants={fadeUp}
                className="text-[28px] font-semibold leading-tight tracking-tight text-ink"
              >
                Set new password
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-2 text-sm leading-relaxed text-ink-muted">
                Please enter your new password below.
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
                {/* New Password */}
                <div>
                  <div
                    className={`relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      touched.password && !isPasswordValid
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Lock
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        touched.password && !isPasswordValid
                          ? "text-danger"
                          : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="reset-new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="reset-new-password"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      New password (min. 6 characters)
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
                    {touched.password && !isPasswordValid ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="mt-1.5 text-tiny text-danger"
                      >
                        Password must be at least 6 characters
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Confirm New Password */}
                <div>
                  <div
                    className={`relative rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
                      touched.confirmPassword && !doPasswordsMatch
                        ? "border-danger/60 focus-within:ring-2 focus-within:ring-danger/20"
                        : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                    }`}
                  >
                    <Lock
                      size={15}
                      className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                        touched.confirmPassword && !doPasswordsMatch
                          ? "text-danger"
                          : "text-ink-faint group-focus-within:text-brand"
                      }`}
                    />
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                      placeholder=" "
                      className="peer w-full rounded-xl border-0 bg-transparent pb-2.5 pl-10 pr-11 pt-5 text-sm text-ink placeholder:text-transparent focus:outline-none"
                    />
                    <label
                      htmlFor="reset-confirm-password"
                      className="pointer-events-none absolute left-10 text-sm text-ink-faint transition-all duration-200 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-brand peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium"
                    >
                      Confirm new password
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
                    {touched.confirmPassword && !doPasswordsMatch ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="mt-1.5 text-tiny text-danger"
                      >
                        Passwords do not match
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
                      Updating password…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Update password <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </motion.form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
