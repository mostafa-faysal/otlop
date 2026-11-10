import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const metadata = {
  title: "البحث عن الأكلات والمطاعم",
  description:
    "ابحث عن أي وجبة، مطعم، صنف بقالة، أو مخبوزات في باسوس والقليوبية واطلب فوراً بأفضل سعر.",
  alternates: {
    canonical: "/search",
  },
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-bold text-[#0D5C58]">
          جاري البحث...
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
