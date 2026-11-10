/**
 * السجل المركزي لجميع مسارات الـ API الموحدة (/api/v1)
 * ممنوع كتابة أي مسار نصي خارج هذا الملف داخل طبقة الـ Services.
 */
export const ENDPOINTS = Object.freeze({
  AUTH: {
    CSRF: "/auth/csrf",
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },

  ADDRESSES: {
    LIST: "/addresses",
    CREATE: "/addresses",
    BY_ID: (id) => `/addresses/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/addresses/${encodeURIComponent(id)}`,
  },

  CATEGORIES: {
    LIST: "/categories",
    CREATE: "/categories",
    BY_ID: (id) => `/categories/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/categories/${encodeURIComponent(id)}`,
  },

  STORES: {
    LIST: "/stores",
    CREATE: "/stores",
    BY_SLUG_OR_ID: (slugOrId) => `/stores/${encodeURIComponent(slugOrId)}`,
    DETAILS: (slugOrId) => `/stores/${encodeURIComponent(slugOrId)}`,
  },

  PRODUCTS: {
    LIST: "/products",
    CREATE: "/products",
    BY_ID: (id) => `/products/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/products/${encodeURIComponent(id)}`,
    BY_STORE: (storeId) => `/products?storeId=${encodeURIComponent(storeId)}`,
  },

  OFFERS: {
    LIST: "/offers",
    CREATE: "/offers",
    BY_ID: (id) => `/offers/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/offers/${encodeURIComponent(id)}`,
  },

  ORDERS: {
    LIST: "/orders",
    CREATE: "/orders",
    BY_ID: (id) => `/orders/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/orders/${encodeURIComponent(id)}`,
    TRACK: "/orders/track",
    CLAIM: "/orders/claim",
  },

  REVIEWS: {
    LIST: "/reviews",
    CREATE: "/reviews",
    BY_ID: (id) => `/reviews/${encodeURIComponent(id)}`,
    DETAILS: (id) => `/reviews/${encodeURIComponent(id)}`,
  },

  REVIEW_REPORTS: {
    LIST: "/review-reports",
    CREATE: "/review-reports",
    BY_ID: (id) => `/review-reports/${encodeURIComponent(id)}`,
  },

  NOTIFICATIONS: {
    LIST: "/notifications",
    BY_ID: (id) => `/notifications/${encodeURIComponent(id)}`,
  },

  MERCHANT: {
    FINANCIAL_SUMMARY: "/merchant/financial-summary",
    SALES_REPORTS: "/merchant/sales-reports",
    LEDGER: "/merchant/ledger",
    STATEMENTS: "/merchant/statements",
    PAYMENTS: "/merchant/payments",
  },

  ADMIN: {
    SETTINGS: "/admin/settings",
    PAYMENTS: "/admin/payments",
    GENERATE_STATEMENTS: "/admin/statements/generate",
    OVERDUE_ALERTS: "/admin/overdue-alerts",
    ACKNOWLEDGE_ALERT: (id) =>
      `/admin/overdue-alerts/${encodeURIComponent(id)}/acknowledge`,
    SUSPEND_STORE: (storeId) =>
      `/admin/stores/${encodeURIComponent(storeId)}/suspend`,
    REACTIVATE_STORE: (storeId) =>
      `/admin/stores/${encodeURIComponent(storeId)}/reactivate`,
    SET_STORE_OPEN_STATUS: (storeId) =>
      `/admin/stores/${encodeURIComponent(storeId)}/open-status`,
    STORE_STATUS_LOGS: "/admin/store-status-logs",
    REFUND_ORDER_COMMISSION: (orderId) =>
      `/admin/orders/${encodeURIComponent(orderId)}/refund-commission`,
  },
});

