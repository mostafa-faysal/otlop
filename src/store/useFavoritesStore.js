import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favoriteStores: [],
      favoriteDishes: [],

      toggleFavoriteStore: (store) => {
        if (!store) return;
        const stores = get().favoriteStores;
        const exists = stores.some(
          (s) => s.id === store.id || (store.slug && s.slug === store.slug)
        );
        if (exists) {
          set({
            favoriteStores: stores.filter(
              (s) => s.id !== store.id && (!store.slug || s.slug !== store.slug)
            ),
          });
        } else {
          set({ favoriteStores: [store, ...stores] });
        }
      },

      isFavoriteStore: (storeIdOrSlug) => {
        if (!storeIdOrSlug) return false;
        return get().favoriteStores.some(
          (s) => s.id === storeIdOrSlug || s.slug === storeIdOrSlug
        );
      },

      toggleFavoriteDish: (dish) => {
        if (!dish) return;
        const dishes = get().favoriteDishes;
        const exists = dishes.some((d) => d.id === dish.id);
        if (exists) {
          set({
            favoriteDishes: dishes.filter((d) => d.id !== dish.id),
          });
        } else {
          set({ favoriteDishes: [dish, ...dishes] });
        }
      },

      isFavoriteDish: (dishId) => {
        if (!dishId) return false;
        return get().favoriteDishes.some((d) => d.id === dishId);
      },
    }),
    {
      name: "otlob_favorites_storage",
    }
  )
);
