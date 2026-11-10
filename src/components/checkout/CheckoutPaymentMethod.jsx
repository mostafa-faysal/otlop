"use client";

export default function CheckoutPaymentMethod({
  paymentMethod = "cash",
  onSelectMethod = () => {},
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
      <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
        <i className="fa-regular fa-credit-card text-[#0D5C58]"></i>
        <span>طريقة الدفع</span>
      </h3>
      <div className="space-y-2.5">
        <label
          className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
            paymentMethod === "cash"
              ? "border-[#0D5C58] bg-[#E6F4F1] text-gray-900 font-bold"
              : "border-gray-200 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "cash"}
              onChange={() => onSelectMethod("cash")}
              className="text-[#0D5C58] focus:ring-[#0D5C58]"
            />
            <div>
              <span className="block text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-coins text-xs text-amber-600"></i>
                <span>الدفع نقداً عند الاستلام (كاش)</span>
              </span>
              <span className="block text-[11px] text-gray-500">
                سلم المبلغ لمندوب التوصيل عند استلام الوجبة
              </span>
            </div>
          </div>
          <span className="text-xs text-[#0D5C58] font-bold bg-[#E6F4F1] px-2 py-0.5 rounded-full">
            شائع
          </span>
        </label>

        <label
          className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
            paymentMethod === "wallet"
              ? "border-[#0D5C58] bg-[#E6F4F1] text-gray-900 font-bold"
              : "border-gray-200 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === "wallet"}
              onChange={() => onSelectMethod("wallet")}
              className="text-[#0D5C58] focus:ring-[#0D5C58]"
            />
            <div>
              <span className="block text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-mobile-screen text-xs text-[#0D5C58]"></i>
                <span>محافظ إلكترونية / إنستاباي</span>
              </span>
              <span className="block text-[11px] text-gray-500">
                فودافون كاش، اتصالات كاش، أورنج، إنستاباي
              </span>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
