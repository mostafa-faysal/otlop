import Link from "next/link";

export const metadata = {
  title: "سياسة الخصوصية",
  description:
    "سياسة الخصوصية وحماية بيانات العملاء والتجار في منصة أطلب لتوصيل الطلبات.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-gray-100 space-y-6">
        <h1 className="text-3xl font-black text-gray-900 border-b border-gray-100 pb-4">
          سياسة الخصوصية لمنصة «أطلب»
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed">
          نحن في منصة <strong>«أطلب»</strong> نلتزم بأقصى معايير الأمان وحماية خصوصية بياناتك الشخصية عند استخدامك لخدماتنا في منطقة باسوس والقليوبية.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">1. البيانات التي نجمعها</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            نقوم بجمع البيانات الضرورية فقط لتنفيذ وإيصال طلباتك، مثل: الاسم، رقم الهاتف، وعنوان التوصيل التفصيلي (المنطقة والشارع ورقم العقار)، بالإضافة لتفاصيل طلباتك وسجل مشترياتك لتحسين جودة الخدمة.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">2. كيف نستخدم بياناتك</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            تُستخدم بياناتك لغرض إرسال الطلب للمتجر وتوجيه مندوب التوصيل إلى عنوانك بدقة، والتواصل معك بشأن حالة الطلب، ولا نقوم إطلاقاً ببيع أو تأجير أي من بياناتك لأي طرف ثالث.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">3. أمان الحساب والتوكينات</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            يتم تشفير وتأمين جلسات تسجيل الدخول بروابط وبروتوكولات حماية متطورة ورموز أمان (CSRF) وجلسات ذات انتهاء صلاحية تلقائي لضمان أعلى مستويات الأمان.
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

