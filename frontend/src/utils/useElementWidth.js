import { useEffect, useRef, useState } from 'react'

/**
 * Reports the current pixel width of an element. Every chart in this app is
 * hand-drawn SVG sized from this, which is how they stay responsive without a
 * charting library.
 */
export default function useElementWidth(fallback = 640) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const measure = () => setWidth(node.clientWidth || fallback)
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [fallback])

  return [ref, width]
}
