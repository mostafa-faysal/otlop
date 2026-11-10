"use client";

import { useState, useEffect, useMemo } from "react";
import { useModalStore } from "@/store/useModalStore";
import { useCartStore } from "@/store/useCartStore";
import { cleanDescription, extractProductMeta } from "@/services/products.service";

export function getSmartOptionsForProduct(product) {
  if (!product) return { sizes: [], extras: [] };

  const metaFromDesc = extractProductMeta(product.description);

  const rawSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : metaFromDesc.sizes;

  const explicitSizes = rawSizes
    .map((s, idx) => ({
      id: s?.id || `sz-${idx + 1}`,
      name: String(s?.name || "").trim(),
      extraPrice:
        idx === 0
          ? 0
          : Math.max(0, Number(s?.extraPrice ?? s?.price ?? 0) || 0),
    }))
    .filter((s) => s.name.length > 0);

  const rawExtras =
    Array.isArray(product.extras) && product.extras.length > 0
      ? product.extras
      : Array.isArray(product.addOns) && product.addOns.length > 0
      ? product.addOns
      : metaFromDesc.extras;

  const explicitExtras = rawExtras
    .map((ex, idx) => ({
      id: ex?.id || `ex-${idx + 1}`,
      name: String(ex?.name || "").trim(),
      price: Math.max(0, Number(ex?.price ?? 0) || 0),
    }))
    .filter((ex) => ex.name.length > 0);

  return {
    sizes: explicitSizes,
    extras: explicitExtras,
  };
}

export default function ProductModal() {
  const { isProductModalOpen, activeProduct, closeProductModal } =
    useModalStore();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);

  const { sizes: productSizes, extras: productExtras } = useMemo(
    () => getSmartOptionsForProduct(activeProduct),
    [activeProduct],
  );

  useEffect(() => {
    if (activeProduct) {
      const opts = getSmartOptionsForProduct(activeProduct);
      setSelectedSize(opts.sizes.length > 0 ? opts.sizes[0] : null);
      setSelectedExtras([]);
      setSpecialInstructions("");
      setQuantity(1);
      setShowToast(false);
    }
  }, [activeProduct]);

  if (!isProductModalOpen || !activeProduct) return null;

  const basePrice = Number(activeProduct.price) || 0;
  const sizeExtra = selectedSize?.extraPrice
    ? Number(selectedSize.extraPrice)
    : 0;
  const extrasTotal = selectedExtras.reduce(
    (sum, ext) => sum + (Number(ext.price) || 0),
    0,
  );
  const unitPrice = basePrice + sizeExtra + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const toggleExtra = (extra) => {
    const exists = selectedExtras.some(
      (e) => (e.id || e.name) === (extra.id || extra.name),
    );
    if (exists) {
      setSelectedExtras(
        selectedExtras.filter(
          (e) => (e.id || e.name) !== (extra.id || extra.name),
        ),
      );
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const handleAddToCart = () => {
    addItem(activeProduct, {
      size: selectedSize,
      extras: selectedExtras,
      specialInstructions: specialInstructions.trim(),
      quantity,
    });

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      closeProductModal();
    }, 450);
  };

  return (
    <div
      onClick={closeProductModal}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-all"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar & Close */}
        <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-[#E6F4F1]/60 to-white">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#0D5C58] text-white flex items-center justify-center text-xs">
              <i className="fa-solid fa-utensils"></i>
            </span>
            {activeProduct.storeName && (
              <span className="text-xs font-bold text-[#0D5C58] bg-white border border-[#0D5C58]/20 px-2.5 py-1 rounded-full shadow-2xs">
                {activeProduct.storeName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeProductModal}
            className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-900 border border-gray-200 flex items-center justify-center font-bold text-xs transition-transform active:scale-95"
            aria-label="إغلاق"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-right">
          {/* Title & Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-black text-gray-900">
                {activeProduct.name}
              </h3>
              <div className="text-left shrink-0">
                <span className="text-base sm:text-lg font-black text-[#0D5C58]">
                  {basePrice} ج.م
                </span>
                {activeProduct.originalPrice && Number(activeProduct.originalPrice) > basePrice && (
                  <span className="block text-xs text-gray-400 line-through">
                    {activeProduct.originalPrice} ج.م
                  </span>
                )}
                {activeProduct.discountBadge && (
                  <span className="block text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded mt-0.5 text-center">
                    {activeProduct.discountBadge}
                  </span>
                )}
              </div>
            </div>
            {cleanDescription(activeProduct.description) ? (
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                {cleanDescription(activeProduct.description)}
              </p>
            ) : null}
          </div>

          {/* Size Selection */}
          {productSizes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-bowl-food text-[#0D5C58] text-xs"></i>
                  <span>اختر الحجم</span>
                </h4>
                <span className="text-[10px] text-[#0D5C58] font-bold bg-[#E6F4F1] px-2 py-0.5 rounded-full">
                  اختر واحداً
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {productSizes.map((size) => {
                  const isSelected =
                    (selectedSize?.id && selectedSize.id === size.id) ||
                    selectedSize?.name === size.name;
                  return (
                    <button
                      key={size.id || size.name}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-2.5 rounded-2xl border text-center transition-all active:scale-95 ${
                        isSelected
                          ? "border-[#0D5C58] bg-[#E6F4F1] text-[#0D5C58] font-bold shadow-xs"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 font-medium"
                      }`}
                    >
                      <span className="block text-xs">{size.name}</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        {size.extraPrice > 0
                          ? `+${size.extraPrice} ج.م`
                          : "سعر أساسي"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons / Extras */}
          {productExtras.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-plus text-[#0D5C58] text-xs"></i>
                  <span>إضافات على مزاجك</span>
                </h4>
                <span className="text-[10px] text-gray-500 font-medium">
                  اختياري
                </span>
              </div>
              <div className="space-y-2">
                {productExtras.map((extra) => {
                  const extraKey = extra.id || extra.name;
                  const isChecked = selectedExtras.some(
                    (e) => (e.id || e.name) === extraKey,
                  );
                  return (
                    <label
                      key={extraKey}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-[#0D5C58] bg-[#E6F4F1] text-[#0D5C58] font-bold"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleExtra(extra)}
                          className="w-4 h-4 rounded text-[#0D5C58] focus:ring-[#0D5C58] border-gray-300"
                        />
                        <span className="text-xs">{extra.name}</span>
                      </div>
                      <span className="text-xs text-[#0D5C58] font-bold">
                        {extra.price > 0 ? `+${extra.price} ج.م` : "مجاناً"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <i className="fa-regular fa-comment-dots text-[#0D5C58] text-xs"></i>
              <span>ملاحظات خاصة بالطلب</span>
            </h4>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="مثال: بدون بصل، زيادة شطة في كيس خارجي، التوصيل في أسرع وقت..."
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0D5C58] focus:bg-white resize-none text-gray-800"
            />
          </div>
        </div>

        {/* Sticky Footer: Quantity & Add Button (SHRINK-0 ALWAYS VISIBLE ON MOBILE) */}
        <div className="shrink-0 p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shadow-lg z-20">
          {/* Stepper */}
          <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-full bg-white text-gray-700 shadow-xs flex items-center justify-center font-bold text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              <i className="fa-solid fa-minus text-[10px]"></i>
            </button>
            <span className="w-8 text-center font-black text-sm text-[#0D5C58]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-full bg-[#0D5C58] text-white shadow-xs flex items-center justify-center font-bold text-sm hover:bg-[#0A4845]"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
            </button>
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 py-3 px-4 sm:px-5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-between active:scale-98"
          >
            <span className="flex items-center gap-1.5">
              {showToast ? (
                <>
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>تمت الإضافة للسلة</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-basket-shopping text-xs"></i>
                  <span>أضف إلى السلة</span>
                </>
              )}
            </span>
            <span className="bg-[#0A4845] px-2.5 py-1 rounded-full text-xs font-black">
              {totalPrice} ج.م
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
