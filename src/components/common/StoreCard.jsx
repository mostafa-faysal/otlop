import Link from "next/link";
import OfferCountdown, { isOfferExpired } from "@/components/home/offers/OfferCountdown";

export default function StoreCard({ store }) {
  if (!store) return null;

  const {
    id,
    slug,
    name,
    image,
    bannerUrl,
    logoUrl,
    isOpen = true,
    rating = 0,
    reviewsCount = 0,
    deliveryTime = "٢٥-٣٥ دقيقة",
    deliveryFee = 10,
    categories = [],
    offerText,
    offerEndsAt,
  } = store;

  const isFreeDelivery = Boolean(
    store.hasFreeDeliveryOffer ||
    store.isFreeDelivery ||
    Number(deliveryFee) === 0 ||
    store.activeOffer?.discountType === "free_delivery"
  );
  const effectiveDeliveryFee =
    isFreeDelivery || Number(deliveryFee) === 0 ? 0 : Number(deliveryFee ?? 10);
  const hasValidOffer =
    Boolean(
      (store.activeOffer && !isOfferExpired(store.activeOffer.endsAt)) ||
      (store.hasOffer && offerText && !isOfferExpired(offerEndsAt))
    );

  const displayImage =
    bannerUrl ||
    logoUrl ||
    image ||
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";

  const targetLink = `/stores/${slug || id}`;

  return (
    <Link
      href={targetLink}
      className={`group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col h-full ${
        !isOpen ? "opacity-60 grayscale-[25%]" : ""
      }`}
    >
      {/* Cover Image & Badges */}
      <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
        <img
          src={displayImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80";
          }}
        />

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isOpen ? (
            <span className="bg-[#E6F4F1] text-[#0D5C58] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
              مفتوح الآن
            </span>
          ) : (
            <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <i className="fa-solid fa-lock text-[9px]"></i>
              <span>مغلق مؤقتاً</span>
            </span>
          )}
        </div>

        {/* Promo Pill if any */}
        {hasValidOffer && (
          <div className="absolute top-3 left-3 bg-[#0D5C58] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm max-w-[70%] truncate flex items-center gap-1">
            {isFreeDelivery && <i className="fa-solid fa-gift text-amber-300 text-[9px]"></i>}
            <span>{offerText || (isFreeDelivery ? "عرض: توصيل مجاني" : "عرض خاص")}</span>
          </div>
        )}

        {/* Rating Pill */}
        {Number(rating) > 0 && Number(reviewsCount) > 0 ? (
          <div className="absolute bottom-3 right-3 bg-[#E6F4F1] text-[#0D5C58] text-xs font-black px-2 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
            <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>
            <span>{Number(rating).toFixed(1)}</span>
            <span className="text-[10px] text-gray-500 font-normal">({reviewsCount})</span>
          </div>
        ) : (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-[#0D5C58] text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
            متجر جديد
          </div>
        )}
      </div>

      {/* Store Body Info */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-[#0D5C58] transition-colors line-clamp-1">
            {name}
          </h3>

          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {Array.isArray(categories) && categories.length > 0
              ? categories
                  .map((c) => (typeof c === "string" ? c : c?.name))
                  .filter(Boolean)
                  .join(" • ")
              : store.description || "مأكولات طازجة"}
          </p>

          {hasValidOffer && offerEndsAt && (
            <div className="mt-2">
              <OfferCountdown endsAt={offerEndsAt} variant="compact" />
            </div>
          )}
        </div>

        {/* Delivery Details Footer */}
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>{deliveryTime}</span>
          <span>•</span>
          {isFreeDelivery ? (
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
              <i className="fa-solid fa-gift text-[10px]"></i>
              <span>توصيل مجاني (عرض)</span>
            </span>
          ) : (
            <span>التوصيل {effectiveDeliveryFee} ج.م</span>
          )}
        </div>
      </div>
    </Link>
  );
}
