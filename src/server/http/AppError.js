/**
 * كلاس خطأ موحد لطبقات السيرفر (Domain Modules, Repositories, Adapters)
 */
export class AppError extends Error {
  /**
   * @param {object} params
   * @param {string} params.code
   * @param {string} params.message
   * @param {number} [params.status=422]
   * @param {object|null} [params.details=null]
   */
  constructor({ code, message, status = 422, details = null }) {
    super(message);
    this.name = "AppError";
    this.code = code || "internal_error";
    this.status = status;
    this.details = details;
  }
}

