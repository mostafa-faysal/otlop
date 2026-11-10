import ProductCard from "@/components/common/ProductCard";

export default function TrendingDishesSection({ products = [], config = null }) {
  const pool = Array.isArray(products)
    ? products.filter((p) => p.isAvailable !== false && p.is_available !== false)
    : [];

  const title = config?.title || "أكلات عليها الكلام";
  const subtitle = config?.subtitle || "الأصناف الأكثر طلباً من مطاعمنا";
  const maxCount = Math.max(1, Number(config?.maxCount) || 4);
  const selectedStoreId = config?.selectedStoreId || "all";
  const selectedProductIds = Array.isArray(config?.selectedProductIds)
    ? config.selectedProductIds
    : [];

  let displayList = [];
  if (selectedProductIds.length > 0) {
    const byId = new Map(pool.map((p) => [p.id, p]));
    const pinned = selectedProductIds.map((id) => byId.get(id)).filter(Boolean);
    const pinnedSet = new Set(pinned.map((p) => p.id));
    const rest = pool.filter((p) => !pinnedSet.has(p.id));
    displayList = [...pinned, ...rest];
  } else if (selectedStoreId && selectedStoreId !== "all") {
    const fromStore = pool.filter(
      (p) => p.storeId === selectedStoreId || p.storeSlug === selectedStoreId
    );
    displayList = fromStore.length > 0 ? fromStore : pool;
  } else {
    const popularFirst = [
      ...pool.filter((p) => p.isPopular),
      ...pool.filter((p) => !p.isPopular),
    ];
    displayList = popularFirst;
  }

  return (
    <section className="py-10 sm:py-12 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Title */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {displayList.slice(0, maxCount).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
