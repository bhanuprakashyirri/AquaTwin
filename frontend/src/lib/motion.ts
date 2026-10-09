import type { Transition, Variants } from "framer-motion";

/**
 * AquaTwin motion system — one curve, restrained distances, intentional states.
 *
 * Derived from an interaction audit of QuizCore (verified from its compiled CSS):
 *  - signature entrance curve  cubic-bezier(0.16, 1, 0.3, 1)  (ease-out-expo)
 *  - entrances are short rises (8–24px) with fade, fill:both, staggered
 *  - press feedback is a scale-DOWN (0.96–0.98), never a color flash
 *  - page enter = 12–14px rise + fade; tabs slide 12px; drawers slide 60px + 0.98 scale
 *  - value changes "pop" so deltas are noticed
 *
 * Everything decorative is disabled automatically when the user prefers reduced motion
 * (via <MotionConfig reducedMotion="user"> in the app layout).
 */

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Spring curve for pops / modals / attention states — from the QuizCore audit. */
export const SPRING = [0.34, 1.56, 0.64, 1] as const;

export const DURATION = {
  fast: 0.15,
  normal: 0.28,
  emphasis: 0.42,
} as const;

export const entranceTransition: Transition = { duration: 0.35, ease: EASE };

/** Content rises 12px and fades in — the default element entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: entranceTransition },
};

/** Larger rise for hero / empty states, with a tiny settle overshoot. */
export const riseUp: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.emphasis, ease: EASE },
  },
};

/** Scale entrance for cards / panels replacing other content. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: entranceTransition },
};

/** Attention pop for badges, pills and confirmation states (slight overshoot). */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: {
    opacity: 1,
    scale: [1, 1.06, 1],
    transition: { duration: 0.32, ease: EASE },
  },
};

/** Horizontal slide for tab panel content. */
export const tabContent: Variants = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

/** Page-level transition — subtle rise so navigation feels connected, never a flash. */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

/** Side drawer panel — slides in from the right with a slight scale, mirrors out. */
export const drawerPanel: Variants = {
  hidden: { opacity: 0, x: 64, scale: 0.99 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, x: 64, scale: 0.99, transition: { duration: 0.22, ease: "easeIn" } },
};

/** Staggered container — pair with fadeUp on children. */
export const staggerContainer = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Tactile button props — use on motion.button/motion.a wrappers. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.fast, ease: EASE },
} as const;

/** Pure fade — overlays, backdrop layers. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.normal, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: "easeIn" } },
};

/** Modal panel — scale from 0.92 + 8px rise on the spring curve (QuizCore modal DNA). */
export const modalOpen: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.normal, ease: SPRING } },
  exit: { opacity: 0, scale: 0.95, y: 6, transition: { duration: 0.18, ease: "easeIn" } },
};

/** Toast — slides in from the right edge (QuizCore slideInRight), exits back out. */
export const toastEnter: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: DURATION.normal, ease: EASE } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.18, ease: "easeIn" } },
};
export const toastExit = toastEnter.exit;

/** Dropdown menu — grows from its trigger corner with the spring curve. */
export const dropdownEnter: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: SPRING } },
  exit: { opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.14, ease: "easeIn" } },
};

/** Success confirmation — check icon pops in with slight overshoot. */
export const successReveal: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: [1, 1.12, 1], transition: { duration: 0.45, ease: SPRING } },
};

/** Chart reveal — groups draw in with a gentle rise; children use chartItem. */
export const chartReveal: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Gentle idle float for hero accent chips (QuizCore .animate-float). */
export const floatLoop = (delay = 0, distance = 8) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration: 4, ease: "easeInOut", repeat: Infinity, delay },
});
