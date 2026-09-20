import { useEffect, useRef, useState } from 'react'

/**
 * Reveals an element once it scrolls into view. Returns [ref, className] so a
 * section can just spread the class onto its wrapper.
 *
 * Under prefers-reduced-motion the element starts visible and no observer is
 * created at all.
 */
export default function useReveal({ threshold = 0.12, rootMargin = '0px 0px -60px 0px' } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (visible) return undefined
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold, rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, threshold, rootMargin])

  return [ref, `reveal ${visible ? 'reveal--in' : ''}`.trim(), visible]
}

/**
 * Counts a number up from zero once it enters the viewport. Used for the
 * "problem in numbers" tiles - the movement is what makes a reader actually
 * register the figure instead of skimming past it.
 */
export function useCountUp(target, { duration = 1400, decimals = 0 } = {}) {
  const [ref, , visible] = useReveal({ threshold: 0.4 })
  const [value, setValue] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!visible) return undefined

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(target)
      return () => {}
    }

    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      const next = target * eased
      setValue(decimals ? Number(next.toFixed(decimals)) : Math.round(next))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [visible, target, duration, decimals])

  return [ref, value]
}
