"use client";

import { useState, useEffect } from "react";
import HeroSection from "@/components/home/heroSection/HeroSection";
import CategorySection from "@/components/home/category/CategorySection";
import FeaturedStoresSection from "@/components/home/theBest/FeaturedStoresSection";
import OfferBanner from "@/components/home/offers/OfferBanner";
import TrendingDishesSection from "@/components/home/TrendingDishesSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CustomerTestimonialSection from "@/components/home/theBest/CustomerTestimonialSection";
import MerchantCtaSection from "@/components/home/MerchantCtaSection";
import { useStores } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";
import { adminService } from "@/services/admin.service";

export default function HomePage() {
  const { stores, loading: storesLoading } = useStores();
  const { products, loading: productsLoading } = useProducts({ availableOnly: true });
  const [homeConfig, setHomeConfig] = useState(() =>
    adminService.getDefaultHomepageConfig()
  );

  const loading = storesLoading && (!stores || stores.length === 0);

  useEffect(() => {
    let isMounted = true;

    const syncHomepageConfig = () => {
      if (isMounted) {
        setHomeConfig(adminService.getHomepageConfig());
      }
    };

    syncHomepageConfig();
    window.addEventListener("otlob_homepage_updated", syncHomepageConfig);
    window.addEventListener("storage", syncHomepageConfig);

    return () => {
      isMounted = false;
      window.removeEventListener("otlob_homepage_updated", syncHomepageConfig);
      window.removeEventListener("storage", syncHomepageConfig);
    };
  }, []);

  const sections = homeConfig?.sections || {};

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero with search, location, stats */}
      <HeroSection
        showStatsBar={sections.showStatsBar !== false}
        storesCount={stores.length}
      />

      {/* Categories Bar */}
      {sections.showCategories !== false && (
        <CategorySection stores={stores} />
      )}

      {/* Featured Stores Controlled by Super Admin */}
      {homeConfig?.featuredStores?.enabled !== false && (
        <FeaturedStoresSection
          stores={stores}
          loading={loading}
          config={homeConfig?.featuredStores}
        />
      )}

      {/* Mid Promotional Offer Banner Controlled by Super Admin */}
      {homeConfig?.offerBanner?.enabled !== false && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
          <OfferBanner config={homeConfig?.offerBanner} stores={stores} />
        </div>
      )}

      {/* Trending Dishes Controlled by Super Admin */}
      {homeConfig?.trendingDishes?.enabled !== false && (
        <TrendingDishesSection
          products={products}
          config={homeConfig?.trendingDishes}
        />
      )}

      {/* 3 Steps Guide */}
      {sections.showHowItWorks !== false && <HowItWorksSection />}

      {/* Testimonials */}
      {sections.showTestimonials !== false && <CustomerTestimonialSection />}

      {/* Merchant CTA */}
      {sections.showMerchantCta !== false && <MerchantCtaSection />}
    </div>
  );
}
