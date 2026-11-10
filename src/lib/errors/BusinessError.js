/**
 * كلاس موحد لتمثيل أخطاء منطق الأعمال (Business Logic Errors)
 * مفصول تمامًا عن أخطاء بروتوكول HTTP والشبكة وعن نوع الـ Backend.
 */
export class BusinessError extends Error {
  /**
   * @param {object} params
   * @param {string} params.code - الكود المعياري للخطأ التجاري (مثل min_order_not_met)
   * @param {string} params.message - الرسالة المترجمة الجاهزة للعرض للمستخدم
   * @param {number} [params.status=422] - كود حالة HTTP المرتبط
   * @param {object|null} [params.details=null] - تفاصيل إضافية عن الحقول أو القيم
   * @param {string|null} [params.recoveryAction=null] - تلميح للواجهة حول الإجراء المقترح (مثل REFRESH_CART)
   */
  constructor({
    code,
    message,
    status = 422,
    details = null,
    recoveryAction = null,
  }) {
    super(message);
    this.name = "BusinessError";
    this.isBusinessError = true;
    this.code = code || "business_rule_violation";
    this.status = status;
    this.details = details;
    this.recoveryAction = recoveryAction;
  }
}

