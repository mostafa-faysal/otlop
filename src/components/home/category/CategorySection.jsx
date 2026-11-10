"use client";

import { useMemo } from "react";
import Link from "next/link";
import { storeMatchesCategory } from "@/services/stores.service";
import { useCategories } from "@/hooks/useCategories";

const CATEGORY_IMAGES = {
  egyptian:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  koshary:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  home:
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80",
  bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
  pies:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
  grocery:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
  grills:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80",
  seafood:
    "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=400&auto=format&fit=crop&q=80",
  fastfood:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80",
  sweets:
    "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80",
  drinks:
    "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
};

export default function CategorySection({ stores = [] }) {
  const { categories, loading } = useCategories({ activeOnly: true });

  const displayCategories = useMemo(() => {
    return (categories || []).filter((c) => c.isActive !== false);
  }, [categories]);

  if (displayCategories.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            كل اللي نفسك فيه
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            اختار من خيرات بلدنا • مطاعم وأسماك ومشويات وحلويات طازة
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id || cat.slug}
              href={`/stores?category=${cat.slug}`}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col active:scale-98"
            >
              <div className="h-28 sm:h-32 w-full overflow-hidden bg-gray-100">
                <img
                  src={
                    cat.image ||
                    cat.imageUrl ||
                    CATEGORY_IMAGES[cat.slug] ||
                    CATEGORY_IMAGES.egyptian
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = CATEGORY_IMAGES.egyptian;
                  }}
                />
              </div>
              <div className="p-3 text-center">
                <span className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-[#0D5C58] transition-colors">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
