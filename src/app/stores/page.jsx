import { Suspense } from "react";
import StoresClient from "./StoresClient";

export const metadata = {
  title: "المطاعم والمحلات في باسوس",
  description:
    "تصفح كافة مطاعم ومحلات ومخابز وبقالات باسوس والقليوبية. فلترة حسب التصنيف وسرعة التوصيل والأعلى تقييماً مع التوصيل الفوري.",
  alternates: {
    canonical: "/stores",
  },
  openGraph: {
    title: "المطاعم والمحلات في باسوس | منصة أطلب",
    description:
      "استكشف دليل مطاعم ومتاجر باسوس: كشري، مشويات، بيتزا، طواجن، فطائر وحلويات وبقالة بأسعار المحل وتوصيل سريع.",
    url: "/stores",
    type: "website",
  },
};

export default function StoresPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-bold text-[#0D5C58]">
          جاري تحميل دليل المتاجر والمطاعم...
        </div>
      }
    >
      <StoresClient />
    </Suspense>
  );
}
