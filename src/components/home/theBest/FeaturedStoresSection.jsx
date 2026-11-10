import Link from "next/link";
import StoreCard from "@/components/common/StoreCard";

export default function FeaturedStoresSection({
  stores = [],
  loading = false,
  config = null,
}) {
  const pool = Array.isArray(stores) ? stores : [];

  const title = config?.title || "محلات بنحبها في بلدنا";
  const subtitle = config?.subtitle || "أسماء تعرفها، وأكل تثق فيه";
  const maxCount = Math.max(1, Number(config?.maxCount) || 4);
  const selectedIds = Array.isArray(config?.selectedStoreIds)
    ? config.selectedStoreIds
    : Array.isArray(config?.storeIds)
    ? config.storeIds
    : [];

  let orderedStores = [];
  if (selectedIds.length > 0) {
    const byIdOrSlug = new Map();
    pool.forEach((s) => {
      if (s?.id) byIdOrSlug.set(s.id, s);
      if (s?.slug) byIdOrSlug.set(s.slug, s);
    });

    const chosen = selectedIds
      .map((id) => byIdOrSlug.get(id))
      .filter(Boolean);

    const chosenIds = new Set(chosen.map((s) => s.id));
    const remaining = pool.filter((s) => !chosenIds.has(s.id));
    orderedStores = [...chosen, ...remaining];
  } else {
    orderedStores = pool;
  }

  const featuredSlice = orderedStores.slice(0, maxCount);

  return (
    <section className="py-10 sm:py-12 bg-[#F8FAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>
          </div>

          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0D5C58] hover:underline shrink-0"
          >
            <span>كل المتاجر</span>
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </Link>
        </div>

        {/* Store Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {featuredSlice.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  );
}
