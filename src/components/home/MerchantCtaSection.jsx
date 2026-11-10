import Link from "next/link";

export default function MerchantCtaSection() {
  return (
    <section className="py-12 bg-[#F8FAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#D1FAE5] border border-emerald-200/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-right">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#0D5C58] text-2xl shrink-0 shadow-xs">
              <i className="fa-solid fa-store"></i>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-[#0D5C58]">
                عندك محل في باسوس؟ مستنى اى انضم لينا
              </h3>
              <p className="text-xs sm:text-sm text-emerald-900 font-medium">
                طلبات أوضح، إدارة أسهل، وزباين أكثر من أهل بلدك.
              </p>
            </div>
          </div>

          <div>
            <Link
              href="/merchant/register"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap"
            >
              انضم كتاجر
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
