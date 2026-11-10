import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/footer/Footer";
import BottomNav from "@/components/common/BottomNav";
import ProductModal from "@/components/common/ProductModal";
import GuestClaimModal from "@/components/common/GuestClaimModal";
import AuthModal from "@/components/common/AuthModal";
import LocationModal from "@/components/common/LocationModal";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://otlob-delivery.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "أطلب - خير بلدنا لحد بابك | طلب وتوصيل طعام وبقالة في باسوس",
    template: "%s | أطلب",
  },
  description:
    "أول منصة توصيل محلية لطلب الطعام والمستلزمات من أفضل مطاعم ومحلات باسوس والقليوبية. كشري، مشويات، فطائر، بيتزا، حلويات وبقالة تصلك ساخنة وطازجة حتى باب بيتك.",
  keywords: [
    "أطلب",
    "دليفري باسوس",
    "مطاعم باسوس",
    "توصيل طعام باسوس",
    "توصيل طلبات القليوبية",
    "كشري التحرير باسوس",
    "مشويات الجوهرة",
    "فطائر الريف",
    "سوبر ماركت السلام",
    "أكل بيتي",
    "حلويات السلطان",
    "دليفري القليوبية",
  ],
  authors: [{ name: "منصة أطلب باسوس", url: SITE_URL }],
  creator: "أطلب - خير بلدنا لحد بابك",
  publisher: "أطلب",
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "أطلب - خير بلدنا لحد بابك | أسرع دليفري في باسوس",
    description:
      "اطلب الآن من أفضل مطاعم ومحلات باسوس: كشري، مشويات، فطائر، بيتزا، طواجن، حلويات وبقالة بضغطة زر وتوصيل سريع.",
    url: "/",
    siteName: "أطلب",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "أطلب - أول منصة توصيل طعام وبقالة في باسوس",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "أطلب - خير بلدنا لحد بابك",
    description: "أسرع دليفري طعام وبقالة من أشهر مطاعم ومحلات باسوس لحد باب بيتك.",
    images: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "أطلب",
      description: "منصة التوصيل الأولى لخدمة أهالي باسوس والقليوبية",
      inLanguage: "ar-EG",
    },
    {
      "@type": "FoodDeliveryService",
      "@id": `${SITE_URL}/#deliveryService`,
      name: "أطلب - خدمة توصيل الطلبات في باسوس",
      description:
        "خدمة طلب وتوصيل الوجبات السريعة، المشويات، الكشري، المخبوزات، الحلويات والبقالة في باسوس والقليوبية",
      url: SITE_URL,
      telephone: "+201012345678",
      priceRange: "$$",
      areaServed: [
        {
          "@type": "City",
          name: "باسوس",
        },
        {
          "@type": "State",
          name: "القليوبية",
        },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "باسوس",
        addressRegion: "القليوبية",
        addressCountry: "EG",
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "08:00",
        closes: "23:59",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Font Awesome 6 */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAF9] text-[#111827]">
        <Navbar />
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
        <ProductModal />
        <GuestClaimModal />
        <AuthModal />
        <LocationModal />
      </body>
    </html>
  );
}
