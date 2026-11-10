"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { storesService } from "@/services/stores.service";

export default function CategoryPills({ activeCategory, onSelect }) {
  const searchParams = useSearchParams();
  const currentCategory =
    activeCategory !== undefined ? activeCategory : searchParams.get("category") || "";

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const res = await storesService.getCategories({ activeOnly: true });
        if (isMounted && Array.isArray(res?.categories)) {
          setCategories(res.categories);
        }
      } catch {
        // fallback
      }
    };
    fetchCats();
    window.addEventListener("otlob_categories_updated", fetchCats);
    return () => {
      isMounted = false;
      window.removeEventListener("otlob_categories_updated", fetchCats);
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2.5 min-w-max px-1">
        {/* All Categories Option */}
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect("")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              !currentCategory
                ? "bg-[#0D5C58] text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            }`}
          >
            <span>كل المتاجر</span>
          </button>
        ) : (
          <Link
            href="/stores"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              !currentCategory
                ? "bg-[#0D5C58] text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            }`}
          >
            <span>كل المتاجر</span>
          </Link>
        )}

        {/* Categories */}
        {categories.map((cat) => {
          const isActive = cat.slug === currentCategory;

          if (onSelect) {
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.slug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#0D5C58] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={cat.id}
              href={`/stores?category=${cat.slug}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#0D5C58] text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
              }`}
            >
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
