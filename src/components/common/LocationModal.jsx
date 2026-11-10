"use client";

import { useModalStore } from "@/store/useModalStore";
import { useLocationStore } from "@/store/useLocationStore";

export default function LocationModal() {
  const { isLocationModalOpen, closeLocationModal } = useModalStore();
  const { currentLocation, availableAreas, setLocation } = useLocationStore();

  if (!isLocationModalOpen) return null;

  const handleSelect = (areaItem) => {
    setLocation(areaItem);
    closeLocationModal();
  };

  return (
    <div
      onClick={closeLocationModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeLocationModal}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm"
          aria-label="إغلاق"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-lg">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">تحديد منطقة التوصيل</h3>
            <p className="text-xs text-gray-500">اختر منطقتك لعرض المطاعم والمحلات القريبة منك</p>
          </div>
        </div>

        <div className="space-y-2 mt-4 max-h-72 overflow-y-auto">
          {availableAreas.map((loc, idx) => {
            const isSelected = currentLocation?.label === loc.label;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`w-full text-right p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? "border-[#0D5C58] bg-[#E6F4F1]/60 text-gray-900 font-bold shadow-sm"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-[#0D5C58] flex items-center justify-center text-xs">
                    <i className="fa-solid fa-map-pin"></i>
                  </div>
                  <div>
                    <span className="block text-xs font-bold">{loc.label}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      محافظة {loc.city}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[#0D5C58] text-xs font-bold">
                    <i className="fa-solid fa-check"></i>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
