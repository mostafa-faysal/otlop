export function SkeletonBox({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-2xl ${className}`}
    />
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4 shadow-xs">
      <SkeletonBox className="h-44 w-full rounded-2xl" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="h-5 w-12 rounded-full" />
        </div>
        <SkeletonBox className="h-3.5 w-48" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
        <SkeletonBox className="h-4 w-20" />
        <SkeletonBox className="h-4 w-16" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-3 shadow-xs">
      <SkeletonBox className="h-32 w-full rounded-xl" />
      <SkeletonBox className="h-4 w-24" />
      <SkeletonBox className="h-3 w-36" />
      <div className="flex items-center justify-between pt-2">
        <SkeletonBox className="h-5 w-16" />
        <SkeletonBox className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-3">
          <SkeletonBox className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function SkeletonLoader({
  type = "store",
  count = 3,
  className = "",
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => {
        if (type === "store") return <StoreCardSkeleton key={i} />;
        if (type === "product") return <ProductCardSkeleton key={i} />;
        return <SkeletonBox key={i} className="h-24 w-full" />;
      })}
    </div>
  );
}

