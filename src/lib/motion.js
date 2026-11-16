import { useReducedMotion } from 'framer-motion'

export function useMotionConfig() {
  const reduce = useReducedMotion()
  return {
    reduce: Boolean(reduce),
    ease: [0.22, 1, 0.36, 1],
    duration: reduce ? 0 : 0.45,
    stagger: reduce ? 0 : 0.06,
  }
}

export function fadeUp(reduce, delay = 0) {
  if (reduce) {
    return { initial: false, animate: { opacity: 1, y: 0 } }
  }
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
  }
}

export function fadeIn(reduce, delay = 0) {
  if (reduce) {
    return { initial: false, animate: { opacity: 1 } }
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
  }
}

export const listContainer = (reduce) =>
  reduce
    ? {}
    : {
        initial: 'hidden',
        animate: 'show',
        variants: {
          hidden: {},
          show: {
            transition: { staggerChildren: 0.06, delayChildren: 0.08 },
          },
        },
      }

export const listItem = (reduce) =>
  reduce
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 12, scale: 0.98 },
          show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
          },
        },
      }
