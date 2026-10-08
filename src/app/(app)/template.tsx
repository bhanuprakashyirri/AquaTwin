"use client";

import { motion } from "framer-motion";
import { pageEnter } from "@/lib/motion";

/**
 * App-router template — re-mounts on every navigation inside the (app) group,
 * giving each page a consistent, subtle enter transition (rise + fade).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={pageEnter}>
      {children}
    </motion.div>
  );
}
