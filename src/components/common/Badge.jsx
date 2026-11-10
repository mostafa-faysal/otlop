export function StoreStatusBadge({ isOpen = true, className = "" }) {
  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F4F1] text-[#0D5C58] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>مفتوح للطلب</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
      <span>مغلق مؤقتاً</span>
    </span>
  );
}

export function DiscountBadge({
  discountAmount = 0,
  discountBearer = "platform",
  className = "",
}) {
  if (!discountAmount || discountAmount <= 0) return null;

  const isPlatform = discountBearer === "platform";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
        isPlatform
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "bg-amber-50 text-amber-800 border border-amber-200"
      } ${className}`}
    >
      <i
        className={`fa-solid ${
          isPlatform ? "fa-shield-heart text-emerald-600" : "fa-tag text-amber-600"
        } text-[10px]`}
      ></i>
      <span>
        {isPlatform ? `خصم منصة: ${discountAmount} ج.م` : `خصم المتجر: ${discountAmount} ج.م`}
      </span>
    </span>
  );
}

export function RatingBadge({ rating = 4.8, reviewsCount, className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-100 ${className}`}
    >
      <i className="fa-solid fa-star text-amber-500 text-[11px]"></i>
      <span>{Number(rating || 0).toFixed(1)}</span>
      {reviewsCount !== undefined && (
        <span className="text-[10px] text-gray-400 font-normal">
          ({reviewsCount})
        </span>
      )}
    </div>
  );
}

export default function Badge({
  children,
  variant = "primary",
  size = "md",
  className = "",
}) {
  const variantStyles = {
    primary: "bg-[#E6F4F1] text-[#0D5C58]",
    secondary: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-800",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-full ${
        variantStyles[variant] || variantStyles.primary
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {children}
    </span>
  );
}

