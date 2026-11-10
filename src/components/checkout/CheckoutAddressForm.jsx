"use client";

import { SERVICE_VILLAGE, SERVICE_AREAS } from "@/lib/regions";

export default function CheckoutAddressForm({
  formData,
  onChange,
  isAuthenticated = false,
  addresses = [],
  selectedAddressId = "new",
  onSelectAddressId = () => {},
}) {
  return (
    <div className="space-y-6">
      {/* Customer Info Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
          <i className="fa-regular fa-user text-[#0D5C58]"></i>
          <span>بيانات العميل المستلم</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الاسم بالكامل
            </label>
            <input
              type="text"
              required
              name="customerName"
              value={formData.customerName}
              onChange={onChange}
              placeholder="محمد أحمد"
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رقم الموبايل للتواصل
            </label>
            <input
              type="tel"
              required
              name="customerPhone"
              dir="ltr"
              value={formData.customerPhone}
              onChange={onChange}
              placeholder="01012345678"
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 text-right"
            />
          </div>
        </div>
      </div>

      {/* Delivery Address Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-[#0D5C58]"></i>
            <span>عنوان التوصيل</span>
          </h3>
        </div>

        {/* Saved addresses selector if logged in */}
        {isAuthenticated && addresses?.length > 0 && (
          <div className="space-y-2 mb-4">
            <span className="text-xs font-bold text-gray-700 block">
              العناوين المحفوظة:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => onSelectAddressId(addr.id)}
                  className={`p-3 rounded-2xl border text-right transition-all ${
                    selectedAddressId === addr.id
                      ? "border-teal-700 bg-teal-50 text-teal-950 font-bold"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="block text-xs">
                    {addr.name || "عنوان المنزل"}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate mt-0.5">
                    {addr.street}, {addr.area}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Address Details Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              القرية
            </label>
            <input
              type="text"
              readOnly
              name="city"
              value={SERVICE_VILLAGE}
              className="w-full px-4 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              المنطقة
            </label>
            <select
              required
              name="area"
              value={formData.area}
              onChange={onChange}
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            >
              {SERVICE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              اسم الشارع وعلامة مميزة
            </label>
            <input
              type="text"
              required
              name="street"
              value={formData.street}
              onChange={onChange}
              placeholder="مثال: بجوار المسجد الكبير"
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رقم العمارة / المبنى
            </label>
            <input
              type="text"
              name="building"
              value={formData.building}
              onChange={onChange}
              placeholder="عمارة 14"
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              الدور والشقة
            </label>
            <input
              type="text"
              name="floor"
              value={formData.floor}
              onChange={onChange}
              placeholder="الدور الثالث - شقة 5"
              className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

