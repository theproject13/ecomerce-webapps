import { cn } from '../../lib/utils'

type Props = {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: Props) {
  return <span className={cn('skeleton', className)} style={style} aria-hidden="true" />
}

function ProductCardSkeleton() {
  return (
    <div className="tp-card" aria-hidden="true">
      <Skeleton className="tp-card__media" style={{ display: 'block' }} />
      <div className="tp-card__body">
        <Skeleton style={{ height: 12, width: '92%' }} />
        <Skeleton style={{ height: 12, width: '64%', marginTop: 8 }} />
        <Skeleton style={{ height: 18, width: '48%', marginTop: 14 }} />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="tp-product-grid">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}