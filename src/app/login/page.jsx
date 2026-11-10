import LoginClient from "./LoginClient";

export const metadata = {
  title: "تسجيل الدخول",
  description: "سجل دخولك لحسابك في منصة أطلب لمتابعة طلباتك أو إدارة متجرك.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
