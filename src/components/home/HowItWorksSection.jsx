export default function HowItWorksSection() {
  const steps = [
    {
      number: "١",
      iconClass: "fa-solid fa-location-dot",
      title: "قولنا مكانك",
      description: "حدد أقرب علامة مميزة في كفر الندى.",
    },
    {
      number: "٢",
      iconClass: "fa-solid fa-utensils",
      title: "اختار اللي بتحبه",
      description: "تصفح المنيو، ظبط إضافاتك، وراجع السلة.",
    },
    {
      number: "٣",
      iconClass: "fa-solid fa-bicycle",
      title: "استلم واستمتع",
      description: "ادفع كاش أو بالمحفظة، وقيم تجربتك.",
    },
  ];

  return (
    <section className="py-16 bg-[#F8FAF9] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-1 text-right">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
            ٣ خطوات، والأكل عندك
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            بسهولة ومن غير لف كتير
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between space-y-4 text-right"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center">
                  {step.number}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-lg">
                  <i className={step.iconClass}></i>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
