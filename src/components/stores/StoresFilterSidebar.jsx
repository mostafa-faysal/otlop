"use client";

export default function StoresFilterSidebar({
  onlyOpen = false,
  onToggleOnlyOpen = () => {},
  hasOffers = false,
  onToggleHasOffers = () => {},
  freeDelivery = false,
  onToggleFreeDelivery = () => {},
  minRating4 = false,
  onToggleMinRating4 = () => {},
  deliveryTimeLimit = "any",
  onChangeDeliveryTime = () => {},
  onResetFilters = () => {},
}) {
  return (
    <div className="hidden lg:block space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-xs sticky top-24">
        <h3 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>تصفية المتاجر</span>
          <i className="fa-solid fa-sliders text-[#0D5C58]"></i>
        </h3>

        {/* Checkbox Toggles */}
        <div className="space-y-3 text-xs text-gray-700">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium">المفتوح للطلب الآن</span>
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={onToggleOnlyOpen}
              className="rounded text-[#0D5C58] focus:ring-[#0D5C58] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium">عروض وخصومات حصرية</span>
            <input
              type="checkbox"
              checked={hasOffers}
              onChange={onToggleHasOffers}
              className="rounded text-[#0D5C58] focus:ring-[#0D5C58] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium">توصيل مجاني</span>
            <input
              type="checkbox"
              checked={freeDelivery}
              onChange={onToggleFreeDelivery}
              className="rounded text-[#0D5C58] focus:ring-[#0D5C58] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-medium">تقييم ٤ نجوم وأعلى</span>
            <input
              type="checkbox"
              checked={minRating4}
              onChange={onToggleMinRating4}
              className="rounded text-[#0D5C58] focus:ring-[#0D5C58] w-4 h-4"
            />
          </label>
        </div>

        {/* Delivery Time Radio */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="block text-xs font-bold text-gray-900">
            وقت التوصيل
          </span>
          <div className="space-y-2 text-xs text-gray-600">
            <label className="flex items-center justify-between cursor-pointer">
              <span>أي وقت</span>
              <input
                type="radio"
                name="deliveryTimeDesktop"
                checked={deliveryTimeLimit === "any"}
                onChange={() => onChangeDeliveryTime("any")}
                className="text-[#0D5C58] focus:ring-[#0D5C58]"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>أقل من ٣٠ دقيقة</span>
              <input
                type="radio"
                name="deliveryTimeDesktop"
                checked={deliveryTimeLimit === "30"}
                onChange={() => onChangeDeliveryTime("30")}
                className="text-[#0D5C58] focus:ring-[#0D5C58]"
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full py-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer"
          >
            إعادة ضبط الكل
          </button>
        </div>
      </div>

      {/* Local Trust Card */}
      <div className="bg-[#E6F4F1] rounded-2xl border border-teal-100 p-5 space-y-2 text-right">
        <div className="flex items-center gap-2 text-[#0D5C58] font-bold text-xs">
          <i className="fa-regular fa-circle-check text-base"></i>
          <span>من أهل بلدك</span>
        </div>
        <p className="text-[11px] text-[#0D5C58]/80 leading-relaxed">
          كل المتاجر بنراجع جودتها وبياناتها قبل ما تنضم لأطلب.
        </p>
      </div>
    </div>
  );
}

