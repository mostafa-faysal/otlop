import StoreDetailsClient from "@/components/stores/StoreDetailsClient";
import { storesService } from "@/services/stores.service";
import { catalogModule } from "@/server/modules/catalog/catalog.module.js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://otlob-delivery.com";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug).trim() : "";

  let store = null;
  try {
    const res = await catalogModule.getStoreDetails(slug);
    if (res?.store) {
      store = {
        ...res.store,
        activeOffers:
          Array.isArray(res.activeOffers) && res.activeOffers.length > 0
            ? res.activeOffers
            : Array.isArray(res.store.activeOffers)
            ? res.store.activeOffers
            : [],
      };
    }
  } catch {
    try {
      const res = await storesService.getStoreBySlugOrId(slug);
      store = res?.store || res || null;
    } catch {
      // ignore
    }
  }

  if (!store || !store.name) {
    return {
      title: "متجر غير موجود",
      description: "لم نتمكن من العثور على هذا المتجر في منصة أطلب.",
    };
  }

  const title = `${store.name} - باسوس | أطلب`;
  const description =
    store.description ||
    `اطلب الآن أونلاين من ${store.name} في باسوس والقليوبية. استكشف قائمة الوجبات، الأسعار، العروض وسرعة التوصيل حتى باب بيتك.`;

  const storeImage =
    store.imageUrl ||
    store.coverUrl ||
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80";

  return {
    title,
    description,
    alternates: {
      canonical: `/stores/${store.slug || slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/stores/${store.slug || slug}`,
      type: "website",
      siteName: "أطلب",
      locale: "ar_EG",
      images: [
        {
          url: storeImage,
          width: 1200,
          height: 630,
          alt: store.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [storeImage],
    },
  };
}

export default async function StorePage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug).trim() : "";

  let store = null;
  try {
    const res = await catalogModule.getStoreDetails(slug);
    if (res?.store) {
      store = {
        ...res.store,
        activeOffers:
          Array.isArray(res.activeOffers) && res.activeOffers.length > 0
            ? res.activeOffers
            : Array.isArray(res.store.activeOffers)
            ? res.store.activeOffers
            : [],
      };
    }
  } catch {
    try {
      const res = await storesService.getStoreBySlugOrId(slug);
      store = res?.store || res || null;
    } catch {
      // ignore
    }
  }

  const restaurantJsonLd = store
    ? {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "@id": `${SITE_URL}/stores/${store.slug || slug}#restaurant`,
        name: store.name,
        description:
          store.description ||
          `مطعم ومتجر ${store.name} في باسوس، لطلب الوجبات السريعة والمأكولات الطازجة.`,
        image:
          store.imageUrl ||
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
        telephone: "+201012345678",
        priceRange: "$$",
        servesCuisine: store.category || "Egyptian",
        address: {
          "@type": "PostalAddress",
          streetAddress: store.address || "باسوس",
          addressLocality: "باسوس",
          addressRegion: "القليوبية",
          addressCountry: "EG",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 30.1472,
          longitude: 31.2589,
        },
        aggregateRating: store.rating
          ? {
              "@type": "AggregateRating",
              ratingValue: Number(store.rating).toFixed(1),
              reviewCount: Number(store.reviewsCount) || 15,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
      }
    : null;

  return (
    <>
      {restaurantJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
      )}
      <StoreDetailsClient params={resolvedParams} slug={slug} initialStore={store} />
    </>
  );
}
