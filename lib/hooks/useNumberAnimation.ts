"use client";
import { useEffect } from "react";
import { useMotionValue, useSpring, useTransform, animate } from "framer-motion";

export function useCountUp(target: number, duration = 1.2) {
  const count   = useMotionValue(0);
  const spring  = useSpring(count, { stiffness: 55, damping: 18 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(count, target, { duration });
    return () => controls.stop();
  }, [target, duration, count]);
  return rounded;
}
