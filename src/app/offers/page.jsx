import OffersClient from "./OffersClient";

export const metadata = {
  title: "أحدث العروض وكوبونات الخصم",
  description:
    "استمتع بأقوى العروض الحصرية وكوبونات الخصم والتوصيل المجاني من مطاعم ومحلات باسوس. وفر مع أطلب على كل طلبية.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "أحدث العروض وكوبونات الخصم | منصة أطلب",
    description:
      "تخفيضات وكوبونات حصرية على وجباتك المفضلة من مطاعم باسوس والقليوبية.",
    url: "/offers",
    type: "website",
  },
};

export default function OffersPage() {
  return <OffersClient />;
}
