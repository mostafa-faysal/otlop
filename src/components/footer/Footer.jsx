"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/merchant")) {
    return null;
  }

  return (
    <footer className="bg-[#0D5C58] text-white pt-10 pb-36 sm:pb-32 md:pb-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-xl">
              <i className="fa-solid fa-bag-shopping"></i>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-2xl font-black text-white leading-none">أطلب</span>
              <span className="text-[10px] text-emerald-200 mt-0.5">خير بلدنا لحد بابك</span>
            </div>
          </div>

          {/* Center Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-emerald-100">
            <Link href="/merchant/register" className="hover:text-white transition-colors">
              انضم كتاجر
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-white transition-colors">
              الخصوصية
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              الشروط
            </Link>
            <span>•</span>
            <span className="text-emerald-200/80">مطاعم، بقالة ومخبوزات من أهل باسوس</span>
          </div>

          {/* Contact & Hours */}
          <div className="text-xs text-emerald-100 space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-end gap-1.5 font-bold">
              <span>مساعدة الطلبات:</span>
              <span dir="ltr">01012345678</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              يومياً من ٨ الصبح إلى ١٢ بالليل
            </p>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-6 border-t border-teal-800 text-center text-xs text-emerald-200/70">
          © 2026 أطلب • منصة التوصيل الأولى لخدمة أهالي باسوس والقليوبية
        </div>
      </div>
    </footer>
  );
}
