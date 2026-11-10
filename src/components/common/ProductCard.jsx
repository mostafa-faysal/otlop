"use client";

import { useState, useEffect } from "react";
import { useModalStore } from "@/store/useModalStore";
import { useCartStore } from "@/store/useCartStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { getSmartOptionsForProduct } from "@/components/common/ProductModal";
import { cleanDescription } from "@/services/products.service";

export default function ProductCard({ product, variant = "card" }) {
  const openProductModal = useModalStore((s) => s.openProductModal);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const { isFavoriteDish, toggleFavoriteDish } = useFavoritesStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!product) return null;

  const {
    id,
    name,
    description,
    price = 0,
    storeId,
    storeSlug,
    storeName,
    deliveryFee,
    isAvailable = true,
  } = product;

  const isFav = mounted ? isFavoriteDish(id) : false;

  const inCartQty = mounted
    ? cartItems
        .filter((item) => (item.productId || item.id) === id)
        .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : 0;

  // تحديد السعر الأصلي والسعر بعد الخصم بدقة لمنع الازدواجية ولضمان ذهاب السعر بعد الخصم للشيك أوت
  const baseOriginal = product.originalPrice ? Number(product.originalPrice) : null;
  const currentPrice = Number(price) || 0;

  const hasItemDiscount = Boolean(
    (product.discountValue && Number(product.discountValue) > 0) ||
      (baseOriginal && baseOriginal > currentPrice)
  );

  let rawPrice = baseOriginal || currentPrice;
  let effectivePrice = currentPrice;
  let discountBadge = product.discountBadge || "";

  if (product.discountValue && Number(product.discountValue) > 0) {
    if (product.discountType === "percentage") {
      const pct = Math.min(100, Math.max(1, Number(product.discountValue)));
      discountBadge = discountBadge || `خصم ${pct}%`;
      if (!baseOriginal || baseOriginal === currentPrice) {
        effectivePrice = Math.max(0, Math.round(rawPrice * (1 - pct / 100)));
        rawPrice = currentPrice;
      } else {
        effectivePrice = currentPrice;
        rawPrice = baseOriginal;
      }
    } else {
      const val = Number(product.discountValue);
      discountBadge = discountBadge || `خصم ${val} ج.م`;
      if (!baseOriginal || baseOriginal === currentPrice) {
        effectivePrice = Math.max(0, rawPrice - val);
        rawPrice = currentPrice;
      } else {
        effectivePrice = currentPrice;
        rawPrice = baseOriginal;
      }
    }
  } else if (baseOriginal && baseOriginal > currentPrice) {
    effectivePrice = currentPrice;
    rawPrice = baseOriginal;
    discountBadge = discountBadge || "عرض خاص";
  }

  const normalizedModalProduct = {
    ...product,
    price: effectivePrice,
    unitPrice: effectivePrice,
    originalPrice: rawPrice > effectivePrice ? rawPrice : null,
    discountBadge,
    discountValue: product.discountValue || null,
    discountType: product.discountType || null,
    storeId: product.storeId || storeId,
    storeSlug: product.storeSlug || storeSlug,
    storeName: product.storeName || storeName,
    deliveryFee: product.deliveryFee ?? deliveryFee,
  };

  const smartOpts = getSmartOptionsForProduct(normalizedModalProduct);
  const sizesCount = Array.isArray(smartOpts.sizes) ? smartOpts.sizes.length : 0;
  const addOnsList = Array.isArray(smartOpts.extras) ? smartOpts.extras : [];
  const hasOptions = sizesCount > 0 || addOnsList.length > 0;
  const sanitizedDescription = cleanDescription(description);

  const handleOpenCustomization = (e) => {
    if (e) e.stopPropagation();
    if (!isAvailable) return;
    openProductModal(normalizedModalProduct);
  };

  const handleQuickAdd = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAvailable) return;

    // إذا كان الصنف مفعلاً له أحجام أو إضافات، يتم فتح نافذة التخصيص المنبثقة أولاً لاختيار المقاس والإضافات ثم الإضافة
    if (hasOptions) {
      openProductModal(normalizedModalProduct);
      return;
    }

    const defaultSize =
      Array.isArray(smartOpts.sizes) && smartOpts.sizes.length > 0 ? smartOpts.sizes[0] : null;
    addItem(normalizedModalProduct, {
      size: defaultSize,
      extras: [],
      specialInstructions: "",
      quantity: 1,
    });
  };

  const handleToggleFav = (e) => {
    e.stopPropagation();
    toggleFavoriteDish(normalizedModalProduct);
  };

  // ───── Menu variant: صف منيو احترافي بدون صور (صفحة المحل) ─────
  if (variant === "menu") {
    return (
      <div
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        onClick={handleOpenCustomization}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenCustomization();
          }
        }}
        className={`relative bg-white rounded-2xl border p-3.5 sm:p-4 flex items-start gap-3 text-right transition-all touch-manipulation ${
          inCartQty > 0
            ? "border-[#0D5C58]/40 shadow-xs"
            : "border-gray-100 hover:border-[#0D5C58]/30 hover:shadow-sm"
        } ${!isAvailable ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:bg-gray-50"}`}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-gray-900 text-sm sm:text-[15px] leading-snug">
              {name}
            </h4>
            {!isAvailable && (
              <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                غير متاح
              </span>
            )}
            {inCartQty > 0 && (
              <span className="bg-[#E6F4F1] text-[#0D5C58] text-[10px] font-black px-2 py-0.5 rounded-full">
                في السلة ({inCartQty})
              </span>
            )}
          </div>

          {sanitizedDescription ? (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {sanitizedDescription}
            </p>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="font-black text-[#0D5C58] text-sm">{effectivePrice} ج.م</span>
            {hasItemDiscount && rawPrice > effectivePrice && (
              <span className="text-[11px] text-gray-400 line-through">
                {rawPrice} ج.م
              </span>
            )}
            {discountBadge && (
              <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                {discountBadge}
              </span>
            )}
            {hasOptions && (
              <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-sliders text-[9px]"></i>
                {sizesCount > 0 ? "أحجام" : ""}
                {sizesCount > 0 && addOnsList.length > 0 ? " + " : ""}
                {addOnsList.length > 0 ? "إضافات" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleQuickAdd}
            aria-label={`أضف ${name}`}
            className={`h-10 min-w-10 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-manipulation disabled:cursor-not-allowed ${
              inCartQty > 0
                ? "bg-[#0D5C58] text-white shadow-xs"
                : "bg-[#E6F4F1] text-[#0D5C58] border border-[#0D5C58]/30 hover:bg-[#0D5C58] hover:text-white"
            }`}
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>{inCartQty > 0 ? `أضف (${inCartQty})` : "أضف"}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleFav}
            aria-label="المفضلة"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all touch-manipulation"
          >
            <i
              className={`fa-${isFav ? "solid text-red-500" : "regular"} fa-heart text-xs`}
            ></i>
          </button>
        </div>
      </div>
    );
  }

  // ───── Card variant: بطاقة صنف خالية من الصور مدمجة وسريعة ─────
  return (
    <div
      onClick={handleOpenCustomization}
      className={`group relative bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs hover:shadow-md hover:border-[#0D5C58]/30 transition-all duration-200 flex flex-col justify-between gap-3 text-right cursor-pointer ${
        !isAvailable ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#0D5C58] transition-colors leading-snug">
                {name}
              </h4>
              {!isAvailable && (
                <span className="bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  غير متاح
                </span>
              )}
            </div>
            {storeName && (
              <span className="block text-[10px] text-gray-400 mt-0.5 font-medium">
                {storeName}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleFav}
            aria-label="المفضلة"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all touch-manipulation shrink-0"
          >
            <i
              className={`fa-${isFav ? "solid text-red-500" : "regular"} fa-heart text-xs`}
            ></i>
          </button>
        </div>

        {sanitizedDescription ? (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {sanitizedDescription}
          </p>
        ) : null}

        {hasOptions && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-[#0D5C58] bg-[#E6F4F1] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
              <i className="fa-solid fa-sliders text-[9px]"></i>
              {sizesCount > 0 ? `${sizesCount} أحجام` : ""}
              {sizesCount > 0 && addOnsList.length > 0 ? " • " : ""}
              {addOnsList.length > 0 ? `${addOnsList.length} إضافات` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-black text-[#0D5C58] text-sm">{effectivePrice} ج.م</span>
          {hasItemDiscount && rawPrice > effectivePrice && (
            <span className="text-[10px] text-gray-400 line-through">
              {rawPrice} ج.م
            </span>
          )}
          {discountBadge && (
            <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-1 py-0.5 rounded">
              {discountBadge}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={handleQuickAdd}
          className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 touch-manipulation ${
            inCartQty > 0
              ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-2xs"
              : "border-gray-200 text-gray-700 bg-gray-50/70 hover:bg-[#E6F4F1] hover:text-[#0D5C58] hover:border-[#0D5C58]"
          }`}
        >
          {inCartQty > 0 ? (
            <>
              <i className="fa-solid fa-basket-shopping text-[10px]"></i>
              <span>في السلة ({inCartQty})</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus text-[10px]"></i>
              <span>أضف</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
