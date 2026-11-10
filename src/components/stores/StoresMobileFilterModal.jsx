"use client";

export default function StoresMobileFilterModal({
  isOpen = false,
  onClose = () => {},
  sortBy = "rating",
  sortOptions = [],
  onSelectSort = () => {},
  onlyOpen = false,
  onToggleOnlyOpen = () => {},
  freeDelivery = false,
  onToggleFreeDelivery = () => {},
  hasOffers = false,
  onToggleHasOffers = () => {},
  minRating4 = false,
  onToggleMinRating4 = () => {},
  deliveryTimeLimit = "any",
  onChangeDeliveryTime = () => {},
  onResetFilters = () => {},
  resultsCount = 0,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-3xl p-5 space-y-5 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200 text-right"
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-[#0D5C58]"></i>
            <span>فلترة وترتيب المتاجر</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center cursor-pointer"
            aria-label="إغلاق"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Sort Options */}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-gray-900">
            ترتيب النتائج حسب
          </span>
          <div className="grid grid-cols-2 gap-2">
            {sortOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectSort(opt.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  sortBy === opt.id
                    ? "border-[#0D5C58] bg-[#E6F4F1] text-[#0D5C58]"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toggles */}
        <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs">
          <span className="block font-bold text-gray-900">تصفية المتاجر</span>
          {[
            {
              label: "المفتوح للطلب الآن",
              checked: onlyOpen,
              toggle: onToggleOnlyOpen,
            },
            {
              label: "توصيل مجاني",
              checked: freeDelivery,
              toggle: onToggleFreeDelivery,
            },
            {
              label: "عروض وخصومات فعالة",
              checked: hasOffers,
              toggle: onToggleHasOffers,
            },
            {
              label: "تقييم ٤ نجوم وأعلى",
              checked: minRating4,
              toggle: onToggleMinRating4,
            },
            {
              label: "توصيل سريع (أقل من ٣٠ دقيقة)",
              checked: deliveryTimeLimit === "30",
              toggle: () =>
                onChangeDeliveryTime(deliveryTimeLimit === "30" ? "any" : "30"),
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={item.toggle}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-right active:scale-98 cursor-pointer ${
                item.checked
                  ? "border-[#0D5C58] bg-[#E6F4F1] text-[#0D5C58]"
                  : "border-gray-200 bg-gray-50/70 text-gray-800 hover:bg-gray-100/70"
              }`}
            >
              <span className="font-bold text-xs">{item.label}</span>
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs transition-colors ${
                  item.checked
                    ? "bg-[#0D5C58] text-white shadow-xs"
                    : "border border-gray-300 bg-white text-transparent"
                }`}
              >
                <i className="fa-solid fa-check text-[10px]"></i>
              </div>
            </button>
          ))}
        </div>

        {/* Drawer Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-[#0D5C58] text-white font-black text-xs shadow-md cursor-pointer"
          >
            عرض المتاجر ({resultsCount})
          </button>
          <button
            type="button"
            onClick={() => {
              onResetFilters();
              onClose();
            }}
            className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
          >
            مسح الكل
          </button>
        </div>
      </div>
    </div>
  );
}
