"use client";

export default function CheckoutDeliveryTime({
  formData,
  onChange,
  setFormData,
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
      <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
        <i className="fa-regular fa-clock text-[#0D5C58]"></i>
        <span>وقت الاستلام</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
            formData.deliveryTimeOption === "instant"
              ? "border-teal-700 bg-teal-50/70 text-teal-950 font-bold"
              : "border-gray-200 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryTimeOption"
              checked={formData.deliveryTimeOption === "instant"}
              onChange={() =>
                setFormData((prev) => ({ ...prev, deliveryTimeOption: "instant" }))
              }
              className="text-teal-700 focus:ring-teal-700"
            />
            <div>
              <span className="block text-xs font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-amber-500 text-[11px]"></i>
                <span>توصيل فوري</span>
              </span>
              <span className="block text-[11px] text-gray-500">
                يصلك خلال 25-35 دقيقة
              </span>
            </div>
          </div>
        </label>

        <label
          className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
            formData.deliveryTimeOption === "scheduled"
              ? "border-teal-700 bg-teal-50/70 text-teal-950 font-bold"
              : "border-gray-200 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryTimeOption"
              checked={formData.deliveryTimeOption === "scheduled"}
              onChange={() =>
                setFormData((prev) => ({ ...prev, deliveryTimeOption: "scheduled" }))
              }
              className="text-teal-700 focus:ring-teal-700"
            />
            <div>
              <span className="block text-xs font-bold flex items-center gap-1.5">
                <i className="fa-regular fa-calendar text-[11px] text-gray-500"></i>
                <span>توصيل مجدول</span>
              </span>
              <span className="block text-[11px] text-gray-500">
                اختر موعداً لاحقاً اليوم أو غداً
              </span>
            </div>
          </div>
        </label>
      </div>

      {/* حقول تحديد موعد التوصيل المجدول */}
      {formData.deliveryTimeOption === "scheduled" && (
        <div className="mt-4 p-4 rounded-2xl bg-[#F8FAF9] border border-teal-200/80 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
            <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
              <i className="fa-regular fa-calendar-check text-[#0D5C58]"></i>
              <span>حدد موعد وصول الطلب بالتفصيل:</span>
            </span>
            <span className="text-[11px] font-bold text-[#0D5C58] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full">
              {formData.scheduledDay === "custom" && formData.scheduledDate
                ? formData.scheduledDate
                : formData.scheduledDay || "اليوم"}{" "}
              • الساعة {formData.scheduledHour || "5"}:
              {String(formData.scheduledMinute ?? "00").padStart(2, "0")}{" "}
              {formData.scheduledPeriod || "مساءً"}
            </span>
          </div>

          {/* اختيار اليوم */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              اليوم / التاريخ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "اليوم", label: "اليوم" },
                { id: "غداً", label: "غداً" },
                { id: "custom", label: "تاريخ محدد" },
              ].map((dayOpt) => (
                <button
                  key={dayOpt.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, scheduledDay: dayOpt.id }))
                  }
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    formData.scheduledDay === dayOpt.id
                      ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-xs"
                      : "bg-white text-gray-700 border-gray-200 hover:border-teal-600"
                  }`}
                >
                  {dayOpt.label}
                </button>
              ))}
            </div>
            {formData.scheduledDay === "custom" && (
              <div className="mt-2">
                <input
                  type="date"
                  required
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={onChange}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 font-bold text-gray-800"
                />
              </div>
            )}
          </div>

          {/* اختيار الساعة والدقيقة والفترة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الساعة (1 - 12)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                required
                name="scheduledHour"
                value={formData.scheduledHour}
                onChange={onChange}
                placeholder="مثال: 5"
                className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 font-black text-center text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الدقيقة (00 - 59)
              </label>
              <select
                name="scheduledMinute"
                value={formData.scheduledMinute}
                onChange={onChange}
                className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 font-black text-center text-gray-900"
              >
                <option value="00">00 (بالضبط)</option>
                <option value="15">15 (وربع)</option>
                <option value="30">30 (ونصف)</option>
                <option value="45">45 (إلا ربع)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                صباحاً / مساءً
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {["صباحاً", "مساءً"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduledPeriod: period,
                      }))
                    }
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      formData.scheduledPeriod === period
                        ? "bg-[#0D5C58] text-white border-[#0D5C58]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-teal-600"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* حقل كتابة حر للموعد أو ملاحظة الوقت */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              أو اكتب الموعد المطلوب وملاحظة التوقيت (اختياري)
            </label>
            <input
              type="text"
              name="scheduledTimeNote"
              value={formData.scheduledTimeNote}
              onChange={onChange}
              placeholder="مثال: عايز الأوردر يوصل الساعة 8 ونص بالليل..."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}

