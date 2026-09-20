export default function Skeleton({ width = '100%', height = 16, radius, className = '', style }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="stack gap-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} height={12} width={index === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonRows({ rows = 5, height = 44 }) {
  return (
    <div className="stack gap-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  )
}
