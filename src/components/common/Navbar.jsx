"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocationStore } from "@/store/useLocationStore";
import { useModalStore } from "@/store/useModalStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { productsService } from "@/services/products.service";
import AuthModal from "@/components/common/AuthModal";
import LocationModal from "@/components/common/LocationModal";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [currentAdIdx, setCurrentAdIdx] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const { items, getTotalCount, getTotalAmount } = useCartStore();
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const { currentLocation } = useLocationStore();
  const { openAuthModal, openLocationModal } = useModalStore();

  const isDashboardRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/merchant");

  useEffect(() => {
    setMounted(true);
    initAuth();
  }, [initAuth, pathname]);

  useEffect(() => {
    if (isDashboardRoute) return;
    let isMounted = true;
    productsService
      .getOffers({ includeAllStatuses: false })
      .then((res) => {
        if (!isMounted) return;
        const offers = Array.isArray(res?.offers) ? res.offers : [];
        const mapped = offers.slice(0, 5).map((off) => ({
          id: off.id,
          active: true,
          storeName: off.storeName && off.storeName !== "عرض عام للمنصة" ? off.storeName : null,
          storeSlug: off.storeSlug || off.storeId || null,
          text: `${off.title}${off.code ? ` — كود «${off.code}»` : ""}`,
          badgeText: off.code ? `كود ${off.code}` : "عرض فعال",
        }));
        setAnnouncements(mapped);
      })
      .catch(() => {});

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      isMounted = false;
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isDashboardRoute]);

  // Auto-slide announcement swiper
  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIdx((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const activeAd = announcements[currentAdIdx] || announcements[0];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cartCount = getTotalCount();
  const cartTotal = getTotalAmount();
  const { favoriteStores, favoriteDishes } = useFavoritesStore();
  const favoritesCount =
    (Array.isArray(favoriteStores) ? favoriteStores.length : 0) +
    (Array.isArray(favoriteDishes) ? favoriteDishes.length : 0);

  // إخفاء شريط التنقل الخاص بالموقع العام تماماً داخل لوحات التحكم (/merchant و /admin)
  if (isDashboardRoute) {
    return null;
  }

  const isCustomerLoggedIn =
    mounted &&
    isAuthenticated &&
    user &&
    user.role !== "merchant" &&
    user.role !== "admin";

  return (
    <>
      {/* Top Announcement Bar (Swiper) */}
      {announcements.length > 0 && activeAd ? (
        <div className="relative bg-[#0D5C58] text-white text-xs py-2 px-8 text-center font-bold flex items-center justify-center gap-2 flex-wrap transition-all shadow-xs overflow-hidden">
          {announcements.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setCurrentAdIdx(
                  (prev) => (prev - 1 + announcements.length) % announcements.length
                )
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-[10px]"
              aria-label="الإعلان السابق"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          )}

          <div
            key={activeAd.id || currentAdIdx}
            className="flex items-center justify-center gap-2 flex-wrap animate-in fade-in duration-300"
          >
            <span className="bg-amber-400 text-teal-950 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-xs">
              <i className="fa-solid fa-bullhorn text-[9px]"></i>
              <span>{activeAd.badgeText || "إعلان مميز"}</span>
            </span>
            <span>{activeAd.text}</span>
            {activeAd.storeSlug && (
              <Link
                href={`/stores/${activeAd.storeSlug}`}
                className="text-amber-300 hover:text-white underline font-black text-xs transition-colors"
              >
                اطلب من {activeAd.storeName || "المتجر"} الآن
              </Link>
            )}
          </div>

          {announcements.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setCurrentAdIdx((prev) => (prev + 1) % announcements.length)
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-[10px]"
              aria-label="الإعلان التالي"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          )}
        </div>
      ) : null}

      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-2.5"
            : "bg-white border-b border-gray-100 py-3"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Delivery Location */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-[#0D5C58] flex items-center justify-center text-white font-black text-2xl shadow-md group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-bag-shopping text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-[#0D5C58] tracking-tight leading-none">
                    أطلب
                  </span>
                  <span className="text-[10px] font-medium text-gray-500 mt-0.5 tracking-wider">
                    خير بلدنا لحد بابك
                  </span>
                </div>
              </Link>

              {/* Delivery Location Selector */}
              <button
                type="button"
                onClick={openLocationModal}
                className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-gray-50 border border-gray-100 transition-colors text-right"
              >
                <i className="fa-solid fa-location-dot text-[#0D5C58] text-base"></i>
                <div className="text-xs">
                  <span className="block text-[10px] text-gray-400 font-medium leading-tight">
                    التوصيل إلى
                  </span>
                  <span className="font-bold text-gray-900 max-w-[150px] truncate block">
                    {currentLocation?.label || "كفر الندى، ميدان الساقية"}
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 font-bold text-sm">
              <Link
                href="/"
                className={`transition-colors ${
                  pathname === "/"
                    ? "text-[#0D5C58] font-black"
                    : "text-gray-600 hover:text-[#0D5C58]"
                }`}
              >
                الرئيسية
              </Link>
              <Link
                href="/stores"
                className={`transition-colors ${
                  pathname.startsWith("/stores")
                    ? "text-[#0D5C58] font-black"
                    : "text-gray-600 hover:text-[#0D5C58]"
                }`}
              >
                المتاجر
              </Link>
              <Link
                href="/offers"
                className={`transition-colors ${
                  pathname.startsWith("/offers")
                    ? "text-[#0D5C58] font-black"
                    : "text-gray-600 hover:text-[#0D5C58]"
                }`}
              >
                العروض
              </Link>
            </nav>

            {/* User Actions & Cart */}
            <div className="flex items-center gap-3">
              {/* Favorites Heart Icon */}
              <Link
                href="/profile/favorites"
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="الأكلات والمحلات المفضلة"
                aria-label="المفضلة"
              >
                <i
                  className={`fa-${
                    mounted && favoritesCount > 0 ? "solid text-red-500" : "regular"
                  } fa-heart text-base`}
                ></i>
                {mounted && favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              {/* Notification icon */}
              <Link
                href="/profile/notifications"
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:text-[#0D5C58] hover:bg-gray-100 transition-colors"
                aria-label="التنبيهات"
                title="الإشعارات والتنبيهات"
              >
                <i className="fa-regular fa-bell text-lg"></i>
              </Link>

              {/* Profile icon */}
              {isCustomerLoggedIn ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-[#E6F4F1] text-[#0D5C58] font-bold flex items-center justify-center border border-teal-200 hover:opacity-90 transition-opacity"
                    aria-label="قائمة الحساب"
                  >
                    <i className="fa-regular fa-user text-base"></i>
                  </button>

                  {/* Dropdown Menu */}
                  <div
                    className={`absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 transition-all z-50 ${
                      profileDropdownOpen ? "block" : "hidden"
                    }`}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900">
                        {user.fullName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-[#E6F4F1] hover:text-[#0D5C58] font-medium"
                    >
                      <i className="fa-regular fa-user text-sm"></i>
                      <span>الملف الشخصي</span>
                    </Link>
                    <Link
                      href="/profile/orders"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-[#E6F4F1] hover:text-[#0D5C58] font-medium"
                    >
                      <i className="fa-solid fa-box text-sm"></i>
                      <span>طلباتي السابقة</span>
                    </Link>
                    <Link
                      href="/profile/addresses"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-[#E6F4F1] hover:text-[#0D5C58] font-medium"
                    >
                      <i className="fa-solid fa-location-dot text-sm"></i>
                      <span>عناوين التوصيل</span>
                    </Link>
                    <Link
                      href="/profile/favorites"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-[#E6F4F1] hover:text-[#0D5C58] font-medium"
                    >
                      <i className="fa-regular fa-heart text-sm"></i>
                      <span>المفضلة</span>
                    </Link>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-bold border-t border-gray-100 text-right"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:text-[#0D5C58] hover:bg-gray-100 transition-colors"
                  aria-label="تسجيل الدخول"
                >
                  <i className="fa-regular fa-user text-lg"></i>
                </button>
              )}

              {/* Cart Pill Button - Visible on desktop, hidden on mobile */}
              <Link
                href="/cart"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
              >
                <i className="fa-solid fa-basket-shopping text-sm"></i>
                <span>السلة {mounted ? cartCount : 0}</span>
              </Link>
            </div>
          </div>

          {/* Mobile Location Selector Pill */}
          <div className="md:hidden pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={openLocationModal}
              className="flex items-center gap-1.5 text-xs text-gray-700 font-bold active:scale-98"
            >
              <i className="fa-solid fa-location-dot text-[#0D5C58] text-xs"></i>
              <span className="text-gray-400 font-normal">التوصيل إلى:</span>
              <span className="text-gray-900 truncate max-w-[190px]">
                {currentLocation?.label || "كفر الندى، ميدان الساقية"}
              </span>
              <i className="fa-solid fa-chevron-down text-[9px] text-gray-400"></i>
            </button>

            <Link
              href="/offers"
              className="text-[11px] font-bold text-[#0D5C58] bg-[#E6F4F1] px-2.5 py-1 rounded-full flex items-center gap-1"
            >
              <i className="fa-solid fa-ticket-simple text-[10px]"></i>
              <span>عروض اليوم</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <AuthModal />
      <LocationModal />
    </>
  );
}
