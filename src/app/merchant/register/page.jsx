import MerchantRegisterClient from "./MerchantRegisterClient";

export const metadata = {
  title: "انضم كتاجر وسجل متجرك",
  description:
    "سجل مطعمك أو محلك في منصة أطلب باسوس وابدأ في استقبال طلبات التوصيل وزيادة مبيعاتك وأرباحك.",
  alternates: {
    canonical: "/merchant/register",
  },
  openGraph: {
    title: "انضم كتاجر وسجل متجرك في باسوس | أطلب",
    description: "ضاعف مبيعاتك ووصّل أطباقك ومنتجاتك لكل بيت في باسوس والقليوبية.",
    url: "/merchant/register",
  },
};

export default function MerchantRegisterPage() {
  return <MerchantRegisterClient />;
}
