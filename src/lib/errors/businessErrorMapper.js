import { BusinessError } from "./BusinessError.js";

/**
 * قاموس مركزي لأكواد أخطاء منطق الأعمال (Business Logic Error Codes)
 * المستخرجة من قواعد عمل مشروع «أطلب» و schema.sql.
 * يضمن ثبات رسائل وسلوكيات الواجهة سواء كان الـ Backend هو Supabase أو Laravel أو Express.
 */
export const BUSINESS_ERROR_CATALOG = Object.freeze({
  // --- أخطاء السلة وإنشاء الطلبات (Orders & Checkout) ---
  empty_cart: {
    message: "سلة المشتريات فارغة، يرجى إضافة صنف واحد على الأقل.",
    recoveryAction: "OPEN_MENU",
  },
  invalid_item: {
    message: "أحد الأصناف المختارة غير صالح أو بكمية غير مسموحة (الحد الأقصى 50).",
    recoveryAction: "REFRESH_CART",
  },
  product_unavailable: {
    message: "أحد الأصناف في السلة لم يعد متاحًا حاليًا في المتجر.",
    recoveryAction: "REFRESH_CART",
  },
  store_not_found: {
    message: "المتجر المطلوب غير موجود أو غير مفعل حاليًا.",
    recoveryAction: "REDIRECT_STORES",
  },
  store_unavailable: {
    message: "المتجر المطلوب غير متاح حاليًا لاستقبال الطلبات.",
    recoveryAction: "REDIRECT_STORES",
  },
  store_suspended: {
    message: "المتجر موقوف مؤقتًا ولا يمكن تعديل حالته حاليًا.",
    recoveryAction: "REFRESH_STORE_STATUS",
  },
  store_closed: {
    message: "المتجر مغلق حاليًا ولا يستقبل طلبات جديدة في الوقت الحالي.",
    recoveryAction: "REFRESH_STORE_STATUS",
  },
  below_min_order: {
    message: "قيمة السلة أقل من الحد الأدنى للطلب في هذا المتجر.",
    recoveryAction: "ADD_MORE_ITEMS",
  },
  min_order_not_met: {
    message: "قيمة السلة بعد خصم العروض أقل من الحد الأدنى للطلب في هذا المتجر.",
    recoveryAction: "ADD_MORE_ITEMS",
  },
  invalid_items: {
    message: "يرجى اختيار صنف واحد على الأقل لإتمام الطلب.",
    recoveryAction: "OPEN_MENU",
  },
  invalid_quantity: {
    message: "الكمية المطلوبة لأحد الأصناف غير صالحة (المسموح من 1 إلى 50).",
    recoveryAction: "REFRESH_CART",
  },
  rate_limited: {
    message: "تم تجاوز الحد المسموح لعدد الطلبات في الساعة، يرجى المحاولة لاحقًا.",
    recoveryAction: null,
  },
  invalid_coupon: {
    message: "كود الخصم غير صحيح أو غير مخصص لهذا المتجر.",
    recoveryAction: "CLEAR_COUPON",
  },
  coupon_expired: {
    message: "انتهت صلاحية كود الخصم أو لم يبدأ تفعيله بعد.",
    recoveryAction: "CLEAR_COUPON",
  },
  coupon_exhausted: {
    message: "تم استنفاد الحد الأقصى لاستخدام كود الخصم.",
    recoveryAction: "CLEAR_COUPON",
  },
  coupon_usage_exceeded: {
    message: "تم استنفاد الحد الأقصى لاستخدام كود الخصم.",
    recoveryAction: "CLEAR_COUPON",
  },
  coupon_min_order: {
    message: "قيمة الطلب لا تستوفي الحد الأدنى المطلوب لتطبيق كود الخصم.",
    recoveryAction: "ADD_MORE_ITEMS",
  },
  coupon_min_order_not_met: {
    message: "قيمة الطلب لا تستوفي الحد الأدنى المطلوب لتطبيق كود الخصم.",
    recoveryAction: "ADD_MORE_ITEMS",
  },
  order_number_failed: {
    message: "حدث تعارض مؤقت أثناء إصدار رقم الطلب، يرجى المحاولة مرة أخرى.",
    recoveryAction: "RETRY_SUBMIT",
  },
  order_number_collision: {
    message: "حدث تعارض مؤقت أثناء إصدار رقم الطلب، يرجى المحاولة مرة أخرى.",
    recoveryAction: "RETRY_SUBMIT",
  },

  // --- أخطاء بيانات العميل والعناوين ---
  invalid_name: {
    message: "يرجى إدخال اسم صحيح (من حرفين إلى 80 حرفًا).",
    recoveryAction: "FOCUS_NAME",
  },
  invalid_phone: {
    message: "يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678).",
    recoveryAction: "FOCUS_PHONE",
  },
  invalid_address: {
    message: "يرجى إدخال عنوان توصيل واضح بالتفصيل (من 5 إلى 300 حرف).",
    recoveryAction: "FOCUS_ADDRESS",
  },
  invalid_address_id: {
    message: "العنوان المختار غير صالح أو لا يخص هذا الحساب.",
    recoveryAction: "FOCUS_ADDRESS",
  },
  invalid_notes: {
    message: "ملاحظات الطلب لا يمكن أن تتجاوز 500 حرف.",
    recoveryAction: "FOCUS_NOTES",
  },
  invalid_location: {
    message: "إحداثيات موقع التوصيل غير صحيحة.",
    recoveryAction: "RESET_LOCATION",
  },
  invalid_coordinates: {
    message: "إحداثيات موقع التوصيل غير صحيحة.",
    recoveryAction: "RESET_LOCATION",
  },

  // --- أخطاء دورة حياة الطلب والتتبع ---
  order_not_found: {
    message: "لم يتم العثور على الطلب أو أن بيانات التتبع غير صحيحة.",
    recoveryAction: null,
  },
  invalid_status_transition: {
    message: "لا يمكن تغيير حالة الطلب إلى الحالة المختارة وفقًا لتسلسل حالات الطلب.",
    recoveryAction: "REFRESH_ORDER",
  },
  cancellation_reason_required: {
    message: "يرجى كتابة سبب إلغاء الطلب.",
    recoveryAction: "FOCUS_CANCELLATION_REASON",
  },
  order_already_claimed: {
    message: "تم ربط هذا الطلب بحساب مستخدم مسبقًا.",
    recoveryAction: null,
  },
  invalid_tracking_credentials: {
    message: "رقم الطلب أو رقم الموبايل أو رمز التتبع غير صحيح.",
    recoveryAction: null,
  },

  // --- أخطاء التقييمات ---
  order_not_delivered: {
    message: "لا يمكن تقييم الطلب إلا بعد اكتمال تسليمه.",
    recoveryAction: null,
  },
  review_window_expired: {
    message: "انتهت المهلة المسموحة لتقييم هذا الطلب أو تعديل التقييم.",
    recoveryAction: null,
  },
  duplicate_review: {
    message: "لقد قمت بتقييم هذا الطلب مسبقًا.",
    recoveryAction: null,
  },

  // --- أخطاء النظام المالي والإداري ---
  invalid_amount: {
    message: "المبلغ المدخل غير صالح، يجب أن يكون أكبر من الصفر.",
    recoveryAction: "FOCUS_AMOUNT",
  },
  statement_not_found: {
    message: "كشف الحساب الشهري المحدد غير موجود أو لا يخص هذا المتجر.",
    recoveryAction: "REFRESH_STATEMENTS",
  },
  payment_exceeds_debt: {
    message: "مبلغ الدفعة يتجاوز إجمالي المديونية المتبقية على المتجر أو الكشف.",
    recoveryAction: "REFRESH_FINANCIAL_SUMMARY",
  },
  commission_already_refunded: {
    message: "تم استرداد عمولة هذا الطلب مسبقًا ولا يمكن تكرار الاسترداد.",
    recoveryAction: "REFRESH_ORDER",
  },
  invalid_period: {
    message: "الفترة المالية المحددة (الشهر أو السنة) غير صالحة.",
    recoveryAction: null,
  },
  delivery_cost_bearer_constraint: {
    message: "تحديد متحمل تكلفة التوصيل مسموح فقط في عروض التوصيل المجاني.",
    recoveryAction: null,
  },
  operation_blocked_by_db_policy: {
    message:
      "هذه العملية مقيدة حاليًا على مستوى صلاحيات قاعدة البيانات (REVOKE UPDATE FROM authenticated).",
    recoveryAction: null,
  },

  // --- أخطاء الصلاحيات والمصادقة ---
  invalid_credentials: {
    message: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    recoveryAction: null,
  },
  email_already_registered: {
    message: "هذا البريد الإلكتروني مسجل بالفعل.",
    recoveryAction: null,
  },
  forbidden: {
    message: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    recoveryAction: null,
  },
  forbidden_admin_only: {
    message: "هذا الإجراء متاح للسوبر أدمن فقط.",
    recoveryAction: null,
  },
  validation_error: {
    message: "يرجى مراجعة البيانات المدخلة والتأكد من صحتها.",
    recoveryAction: null,
  },
});

/**
 * تحويل كائن الخطأ القادم من الـ API الموحد إلى كائن BusinessError
 * @param {object} apiErrorPayload - كائن الخطأ من الاستجابة { code, message, details }
 * @param {number} [httpStatus=422]
 * @returns {BusinessError}
 */
export function mapToBusinessError(apiErrorPayload = {}, httpStatus = 422) {
  const code = apiErrorPayload?.code || "business_rule_violation";
  const catalogEntry = BUSINESS_ERROR_CATALOG[code];

  return new BusinessError({
    code,
    message:
      apiErrorPayload?.message ||
      catalogEntry?.message ||
      "تعذر إتمام العملية بسبب مخالفة قواعد العمل.",
    status: httpStatus,
    details: apiErrorPayload?.details || null,
    recoveryAction: catalogEntry?.recoveryAction || null,
  });
}
