"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useModalStore } from "@/store/useModalStore";

/**
 * عنصر واحد في الشريط السفلي.
 * العنصر النشط فقط يأخذ نفس تصميم أيقونة السلة (دائرة خضراء مرفوعة + حد أبيض + ظل).
 */
function NavItem({ href, onClick, active, icon, label, badge = 0 }) {
  const body = (
    <>
      <span className="relative block h-7 w-12">
        <span
          className={`absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full transition-all duration-300 ${
            active
              ? "-top-6 h-12 w-12 bg-[#0D5C58] text-white shadow-lg border-4 border-white"
              : "top-0.5 h-7 w-9 text-gray-500"
          }`}
        >
          <i className={`${icon} ${active ? "text-base" : "text-lg"}`}></i>
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md">
              {badge}
            </span>
          )}
        </span>
      </span>
      <span
        className={`mt-1 text-[11px] leading-tight transition-all duration-300 ${
          active ? "font-black text-[#0D5C58]" : "font-medium text-gray-500"
        }`}
      >
        {label}
      </span>
    </>
  );

  const cls =
    "flex flex-col items-center justify-center py-1 touch-manipulation select-none";

  if (href) {
    return (
      <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const checkExpiration = useCartStore((s) => s.checkExpiration);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useModalStore((s) => s.openAuthModal);
  const isAuthModalOpen = useModalStore((s) => s.isAuthModalOpen);

  useEffect(() => {
    setMounted(true);
    checkExpiration();
  }, [checkExpiration]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/merchant")) {
    return null;
  }

  const isCustomerLoggedIn =
    mounted &&
    isAuthenticated &&
    user &&
    user.role !== "merchant" &&
    user.role !== "admin";

  const cartCount = mounted
    ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : 0;

  const isActive = (path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 pt-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-lg">
      <div className="grid grid-cols-5 items-end text-center">
        <NavItem href="/" active={isActive("/")} icon="fa-solid fa-house" label="الرئيسية" />
        <NavItem
          href="/stores"
          active={isActive("/stores")}
          icon="fa-solid fa-store"
          label="المتاجر"
        />
        <NavItem
          href="/cart"
          active={isActive("/cart")}
          icon="fa-solid fa-basket-shopping"
          label="السلة"
          badge={cartCount}
        />
        <NavItem
          href="/offers"
          active={isActive("/offers")}
          icon="fa-solid fa-ticket-simple"
          label="العروض"
        />
        {isCustomerLoggedIn ? (
          <NavItem
            href="/profile"
            active={isActive("/profile")}
            icon="fa-regular fa-user"
            label="حسابي"
          />
        ) : (
          <NavItem
            onClick={() => openAuthModal("login")}
            active={isAuthModalOpen}
            icon="fa-regular fa-user"
            label="دخول"
          />
        )}
      </div>
    </nav>
  );
}
