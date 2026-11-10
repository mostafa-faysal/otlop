"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocationStore } from "@/store/useLocationStore";
import { ordersService } from "@/services/orders.service";
import { storesService } from "@/services/stores.service";
import { SERVICE_VILLAGE, SERVICE_AREAS, DEFAULT_AREA } from "@/lib/regions";
import CheckoutAddressForm from "@/components/checkout/CheckoutAddressForm";
import CheckoutDeliveryTime from "@/components/checkout/CheckoutDeliveryTime";
import CheckoutPaymentMethod from "@/components/checkout/CheckoutPaymentMethod";
import CheckoutOrderSummary from "@/components/checkout/CheckoutOrderSummary";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    storeId,
    storeSlug,
    storeName,
    deliveryFee,
    getDeliveryFee,
    couponCode,
    discountAmount,
    discountBearer,
    notes,
    clearCart,
    applyCoupon,
    removeCoupon,
    getSubtotal,
    getTotalAmount,
    setDeliveryFee,
  } = useCartStore();

  const { user, isAuthenticated, addresses } = useAuthStore();
  const { currentLocation } = useLocationStore();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [storeData, setStoreData] = useState(null);

  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses?.[0]?.id || "new"
  );

  const [formData, setFormData] = useState({
    customerName: user?.fullName || "",
    customerPhone: user?.phone || "",
    city: SERVICE_VILLAGE,
    area: SERVICE_AREAS.includes(currentLocation?.area) ? currentLocation.area : DEFAULT_AREA,
    street: "",
    building: "",
    floor: "الدور الثالث",
    apartment: "شقة 6",
    paymentMethod: "cash",
    deliveryTimeOption: "instant",
    scheduledDay: "اليوم",
    scheduledDate: "",
    scheduledHour: "5",
    scheduledMinute: "00",
    scheduledPeriod: "مساءً",
    scheduledTimeNote: "",
  });

  // Load saved address on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("otlob_customer_saved_address");
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            city: SERVICE_VILLAGE,
            area: SERVICE_AREAS.includes(parsed.area) ? parsed.area : prev.area,
            customerName: parsed.customerName || user?.fullName || prev.customerName,
            customerPhone: parsed.customerPhone || user?.phone || prev.customerPhone,
          }));
        }
      } catch {}
    }
  }, [user]);

  // Load store details & automatic store offer
  useEffect(() => {
    let isMounted = true;
    const loadStore = async () => {
      const target = storeSlug || storeId;
      if (!target) return;
      try {
        const res = await storesService.getStoreBySlugOrId(target);
        if (isMounted && res?.store) {
          setStoreData(res.store);

          if (res.store.deliveryFee !== undefined) {
            const freshFee = Number(res.store.deliveryFee);
            if (freshFee === 0 || res.store.isFreeDelivery) {
              setDeliveryFee(0);
            }
          }

          // تطبيق الخصم التلقائي للمتجر فقط إذا كان خصماً بدون كود وكان الطلب مستوفياً للحدود
          const autoOffer = res.store.activeOffer;
          const hasEligibleAutoOffer = Boolean(
            autoOffer &&
            !autoOffer.code &&
            autoOffer.discountType !== "free_delivery" &&
            autoOffer.status === "active" &&
            Number(autoOffer.discountValue || 0) > 0
          );

          if (hasEligibleAutoOffer && (!couponCode || couponCode === "خصم تلقائي")) {
            const currentSubtotal = getSubtotal();
            const minOrder = Number(autoOffer.minOrder || autoOffer.min_order || 0);
            const meetsMin = minOrder === 0 || currentSubtotal >= minOrder;

            if (meetsMin) {
              let autoDiscount = 0;
              if (autoOffer.discountType === "percentage") {
                autoDiscount = Math.round(
                  (currentSubtotal * Number(autoOffer.discountValue || 0)) / 100
                );
              } else {
                autoDiscount = Number(autoOffer.discountValue || 0) || 20;
              }
              const cap = Number(autoOffer.maxDiscount ?? autoOffer.max_discount ?? 0);
              if (cap > 0) {
                autoDiscount = Math.min(autoDiscount, cap);
              }
              autoDiscount = Math.min(currentSubtotal, autoDiscount);
              applyCoupon("خصم تلقائي", autoDiscount, "merchant");
            } else if (couponCode === "خصم تلقائي") {
              removeCoupon();
            }
          } else if (couponCode === "خصم تلقائي" && !hasEligibleAutoOffer) {
            removeCoupon();
          }

          // التحقق من صلاحية أي كود خصم مخزن في السلة لهذا المتجر
          if (couponCode && couponCode !== "خصم تلقائي") {
            try {
              adminService.validateCoupon(couponCode, {
                storeId: res.store.id,
                storeSlug: res.store.slug,
                subtotal: getSubtotal(),
              });
            } catch {
              removeCoupon();
            }
          }
        }
      } catch {
        // ignore
      }
    };
    loadStore();
    return () => {
      isMounted = false;
    };
  }, [storeId, storeSlug]);

  const subtotal = getSubtotal();

  const effectiveDeliveryFee = (() => {
    const hasFree = Boolean(
      storeData?.hasFreeDeliveryOffer ||
      storeData?.isFreeDelivery ||
      Number(storeData?.deliveryFee) === 0 ||
      storeData?.activeOffer?.discountType === "free_delivery" ||
      storeData?.activeOffer?.appliesTo === "delivery_discount"
    );

    if (hasFree) {
      const threshold = Number(
        storeData?.freeDeliveryThreshold ||
        storeData?.activeOffer?.minOrder ||
        storeData?.minOrder ||
        storeData?.minOrderAmount ||
        0
      );
      if (threshold > 0) {
        return subtotal >= threshold
          ? 0
          : Number(storeData?.baseDeliveryFee || storeData?.deliveryFee || 15);
      }
      return 0;
    }

    if (getDeliveryFee) {
      return getDeliveryFee(storeData?.activeOffer);
    }
    return Number(deliveryFee ?? 15);
  })();

  const effectiveTotal = Math.max(
    0,
    subtotal + effectiveDeliveryFee - Number(discountAmount || 0)
  );

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-2xl mx-auto">
          <i className="fa-solid fa-basket-shopping"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900">سلتك فارغة</h2>
        <Link
          href="/stores"
          className="inline-block px-6 py-2.5 rounded-full bg-[#0D5C58] text-white text-xs font-bold"
        >
          العودة للتسوق
        </Link>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (storeId || storeSlug) {
        try {
          const storeRes = await storesService.getStoreBySlugOrId(storeSlug || storeId);
          if (storeRes?.store && (storeRes.store.isOpen === false || storeRes.store.isActive === false)) {
            setErrorMsg("عذراً، هذا المتجر مغلق مؤقتاً أو غير متاح لاستقبال الطلبات حالياً.");
            setLoading(false);
            return;
          }
        } catch {}
      }

      const fullAddressString = `${formData.city}، ${formData.area}، ${formData.street}، ${formData.building}، ${formData.floor}، ${formData.apartment}`;

      const scheduledDayLabel =
        formData.scheduledDay === "custom" && formData.scheduledDate
          ? `تاريخ ${formData.scheduledDate}`
          : formData.scheduledDay || "اليوم";

      const formattedMinute = String(formData.scheduledMinute ?? "00").padStart(2, "0");

      const scheduledDeliverySummary =
        formData.deliveryTimeOption === "scheduled"
          ? `${scheduledDayLabel} — الساعة ${formData.scheduledHour || "5"}:${formattedMinute} ${
              formData.scheduledPeriod || "مساءً"
            }${formData.scheduledTimeNote?.trim() ? ` (${formData.scheduledTimeNote.trim()})` : ""}`
          : null;

      const scheduledDeliveryNote = scheduledDeliverySummary
        ? `⏰ توصيل مجدول: ${scheduledDeliverySummary}`
        : null;

      const itemCustomizationsNote = items
        .map((i) => {
          const parts = [];
          if (i.selectedSize?.name) parts.push(`الحجم: ${i.selectedSize.name}`);
          if (Array.isArray(i.selectedExtras) && i.selectedExtras.length > 0) {
            parts.push(`إضافات: ${i.selectedExtras.map((ex) => ex.name).join(" + ")}`);
          }
          if (i.specialInstructions) parts.push(`ملاحظة: ${i.specialInstructions}`);
          return parts.length > 0 ? `${i.name} (${parts.join("، ")})` : null;
        })
        .filter(Boolean)
        .join(" | ");

      const combinedNotes = [scheduledDeliveryNote, notes, itemCustomizationsNote]
        .filter(Boolean)
        .join(" — ");

      const isSyntheticCoupon =
        couponCode && (couponCode === "خصم تلقائي" || couponCode.startsWith("خصم"));

      const orderPayload = {
        storeId: items[0]?.storeId || storeId || items[0]?.storeSlug || storeSlug,
        storeSlug: items[0]?.storeSlug || storeSlug || undefined,
        // إرسال الـ IDs والكميات فقط للسيرفر دون أي أسعار لحماية المعاملة
        items: items.map((i) => ({
          productId: i.productId || i.id,
          quantity: Number(i.quantity) || 1,
          name: i.selectedSize?.name ? `${i.name} (${i.selectedSize.name})` : i.name,
        })),
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        deliveryAddress: fullAddressString,
        notes: combinedNotes || undefined,
        couponCode: (!isSyntheticCoupon && couponCode) ? String(couponCode).trim() : undefined,
      };

      const res = await ordersService.createOrder(orderPayload);
      const createdOrderData = res?.order || res?.data?.order || res?.data || res;

      const orderNumber = createdOrderData?.orderNumber || `OTL-${Date.now().toString().slice(-6)}`;
      const trackingToken = createdOrderData?.trackingToken || "demo-token";
      const authoritativeTotal = Number(createdOrderData?.total ?? total);

      // حفظ تفاصيل الطلب النشط محلياً للتتبع
      if (typeof window !== "undefined") {
        localStorage.setItem("otlob_customer_saved_address", JSON.stringify(formData));
        const activeOrderData = {
          orderNumber,
          storeName: storeName || storeData?.name || "المتجر",
          total: authoritativeTotal,
          items: Array.isArray(createdOrderData?.items) && createdOrderData.items.length > 0
            ? createdOrderData.items.map((i) => ({
                name: i.productName || i.name,
                quantity: Number(i.quantity) || 1,
                price: Number(i.unitPrice ?? i.price ?? 0),
              }))
            : items.map((i) => ({
                name: i.name,
                quantity: Number(i.quantity) || 1,
                price: Number(i.unitPrice ?? i.price ?? 0),
                selectedSize: i.selectedSize?.name || null,
              })),
          phone: formData.customerPhone,
          deliveryAddress: fullAddressString,
          deliverySchedule: scheduledDeliverySummary || "توصيل فوري (خلال 25 - 35 دقيقة)",
          token: trackingToken,
          status: "on_the_way",
          placedAt: Date.now(),
        };
        localStorage.setItem("otlob_active_order", JSON.stringify(activeOrderData));
        sessionStorage.setItem(
          `order_${orderNumber}`,
          JSON.stringify({
            orderNumber,
            phone: formData.customerPhone,
            token: trackingToken,
          })
        );
      }

      clearCart();
      router.push(
        `/orders/${orderNumber}/confirmed?token=${trackingToken}&phone=${encodeURIComponent(
          formData.customerPhone
        )}`
      );
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "حدث خطأ أثناء تنفيذ الطلب. يرجى مراجعة حالة المطعم والمحاولة مجدداً.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-center max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/cart" className="flex items-center gap-2 text-teal-800">
            <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
              <i className="fa-solid fa-check text-xs"></i>
            </span>
            <span className="text-xs font-bold hidden sm:inline">السلة</span>
          </Link>
          <div className="w-12 sm:w-20 h-0.5 bg-teal-800"></div>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-teal-800 text-white font-black text-xs flex items-center justify-center shadow">
              ٢
            </span>
            <span className="text-xs font-black text-teal-900">التوصيل والدفع</span>
          </div>

          <div className="w-12 sm:w-20 h-0.5 bg-gray-200"></div>

          <div className="flex items-center gap-2 opacity-50">
            <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
              ٣
            </span>
            <span className="text-xs font-bold text-gray-600 hidden sm:inline">تأكيد الطلب</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forms (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <CheckoutAddressForm
            formData={formData}
            onChange={handleInputChange}
            isAuthenticated={isAuthenticated}
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddressId={setSelectedAddressId}
          />

          <CheckoutDeliveryTime
            formData={formData}
            onChange={handleInputChange}
            setFormData={setFormData}
          />

          <CheckoutPaymentMethod
            paymentMethod={formData.paymentMethod}
            onSelectMethod={(method) =>
              setFormData((prev) => ({ ...prev, paymentMethod: method }))
            }
          />
        </div>

        {/* Order Summary (1 Col) */}
        <div className="lg:col-span-1">
          <CheckoutOrderSummary
            items={items}
            storeId={storeId}
            storeSlug={storeSlug}
            storeName={storeName || storeData?.name}
            storeOffer={storeData?.activeOffer}
            subtotal={subtotal}
            deliveryFee={effectiveDeliveryFee}
            discountAmount={discountAmount}
            discountBearer={discountBearer}
            total={effectiveTotal}
            couponCode={couponCode}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={removeCoupon}
            loading={loading}
            errorMsg={errorMsg}
          />
        </div>
      </form>
    </div>
  );
}
