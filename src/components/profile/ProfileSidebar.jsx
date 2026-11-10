"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const links = [
    { href: "/profile", label: "الملف الشخصي", iconClass: "fa-regular fa-user" },
    { href: "/profile/addresses", label: "عناويني", iconClass: "fa-solid fa-location-dot" },
    { href: "/profile/orders", label: "طلباتي", iconClass: "fa-solid fa-box" },
    { href: "/profile/favorites", label: "المفضلة", iconClass: "fa-regular fa-heart" },
    { href: "/profile/notifications", label: "الإشعارات", iconClass: "fa-regular fa-bell" },
  ];

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6 text-right shadow-xs">
      {/* User Greeting */}
      <div className="space-y-0.5 border-b border-gray-100 pb-4">
        <h3 className="font-black text-base text-gray-900">
          {user?.fullName || "مريم أحمد"}
        </h3>
        <p className="text-xs text-emerald-700 font-medium">
          أهلاً بيكي في أطلب
        </p>
      </div>

      {/* Nav Links */}
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#E6F4F1] text-[#0D5C58]"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[#0D5C58]"
              }`}
            >
              <i className={`${link.iconClass} text-sm`}></i>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-right"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
