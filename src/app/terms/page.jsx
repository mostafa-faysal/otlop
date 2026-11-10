import Link from "next/link";

export const metadata = {
  title: "الشروط والأحكام",
  description:
    "الشروط والأحكام الخاصة باستخدام خدمات وتطبيق منصة أطلب لتوصيل الطلبات في باسوس.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-gray-100 space-y-6">
        <h1 className="text-3xl font-black text-gray-900 border-b border-gray-100 pb-4">
          الشروط والأحكام
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed">
          أهلاً بك في منصة <strong>«أطلب»</strong>. باستخدامك للتطبيق أو الموقع الإلكتروني، فإنك توافق على الالتزام بالشروط والأحكام الآتية المنظمة لعمليات الطلب والتوصيل في منطقة باسوس.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">1. تقديم وتأكيد الطلبات</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            عند تأكيد طلبك عبر المنصة، يتم إرساله فورياً إلى المتجر أو المطعم المعني للبدء في تحضيره، وتلتزم بتقديم عنوان ورقم هاتف دقيقين لتفادي تأخير التوصيل.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">2. الأسعار والرسوم</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            أسعار الوجبات والمنتجات معروضة بنفس أسعار المحل المعتمدة، وتضاف رسوم توصيل واضحة ومحددة قبل إتمام الطلب بحسب نطاق كل متجر.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">3. الإلغاء والاسترجاع</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            يمكن إلغاء الطلب طالما كان في حالة «قيد المراجعة» قبل بدء المتجر في تحضير الأطعمة أو المخبوزات الطازجة. وفي حال وجود أي ملاحظة على جودة الطلب يمكنك التواصل مباشرة مع خدمة المساعدة.
          </p>
        </section>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">آخر تحديث: 2026</span>
          <Link
            href="/"
            className="text-xs font-bold text-[#0D5C58] hover:underline flex items-center gap-1"
          >
            <i className="fa-solid fa-arrow-right"></i>
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

