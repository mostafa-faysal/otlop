import { create } from "zustand";
import { persist } from "zustand/middleware";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function sanitizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter((item) => item && (item.productId || item.id) && item.name)
    .map((item) => {
      const unitPrice =
        Number(item.unitPrice ?? item.price ?? item.basePrice) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        ...item,
        productId: item.productId || item.id,
        itemKey: item.itemKey || `${item.productId || item.id}-def-`,
        unitPrice,
        basePrice: Number(item.basePrice ?? item.price ?? unitPrice) || unitPrice,
        quantity,
      };
    });
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      storeName: null,
      storeSlug: null,
      deliveryFee: 15,
      baseDeliveryFee: 15,
      hasFreeDeliveryOffer: false,
      freeDeliveryThreshold: 0,
      couponCode: "",
      discountAmount: 0,
      discountBearer: "platform",
      notes: "",
      updatedAt: null,

      isExpired: () => {
        const { updatedAt, items } = get();
        return Boolean(
          updatedAt && items.length > 0 && Date.now() - updatedAt > TWO_HOURS_MS
        );
      },

      // Helper to check 2-hour expiration (call inside effects or actions, never inside render getters)
      checkExpiration: () => {
        if (get().isExpired()) {
          get().clearCart();
          return true;
        }
        return false;
      },

      addItem: (product, options = {}) => {
        if (!product) return false;
        get().checkExpiration();

        const currentState = get();
        const productId = product.id || product.productId;
        const incomingStoreId = product.storeId || currentState.storeId;
        const incomingDeliveryFee =
          product.deliveryFee !== undefined && product.deliveryFee !== null
            ? Number(product.deliveryFee) || 0
            : currentState.deliveryFee ?? 15;
        const incomingBaseFee =
          product.baseDeliveryFee !== undefined && product.baseDeliveryFee !== null
            ? Number(product.baseDeliveryFee) || 0
            : incomingDeliveryFee || 15;
        const incomingHasFree = Boolean(
          product.hasFreeDeliveryOffer || product.isFreeDelivery
        );
        const incomingThreshold = Number(
          product.freeDeliveryThreshold ?? 0
        );

        let workingItems = sanitizeCartItems(currentState.items);

        // If cart has items from another store, reset to the new store seamlessly
        if (
          currentState.storeId &&
          incomingStoreId &&
          currentState.storeId !== incomingStoreId &&
          workingItems.length > 0
        ) {
          workingItems = [];
        }

        const selectedSize = options.size || null;
        const selectedExtras = Array.isArray(options.extras)
          ? options.extras
          : [];
        const specialInstructions = options.specialInstructions || "";
        const quantity = Math.max(1, Number(options.quantity) || 1);

        // Calculate item unit price with size & extras
        const basePrice =
          Number(product.price ?? product.unitPrice ?? product.basePrice) || 0;
        const extrasTotal = selectedExtras.reduce(
          (sum, ext) => sum + (Number(ext.price) || 0),
          0
        );
        const sizePriceExtra = selectedSize?.extraPrice
          ? Number(selectedSize.extraPrice) || 0
          : 0;
        const unitPrice = basePrice + sizePriceExtra + extrasTotal;

        // Generate unique item key based on id, size, extras, and special note
        const extrasKey = selectedExtras
          .map((e) => e.id || e.name)
          .sort()
          .join(",");
        const itemKey = `${productId}-${selectedSize?.name || "def"}-${extrasKey}-${specialInstructions}`;

        const existingIndex = workingItems.findIndex(
          (i) => i.itemKey === itemKey
        );

        let nextItems;
        if (existingIndex > -1) {
          nextItems = workingItems.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  unitPrice,
                  quantity: (Number(item.quantity) || 0) + quantity,
                }
              : item
          );
        } else {
          const newItem = {
            itemKey,
            productId,
            name: product.name,
            image:
              product.image ||
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
            unitPrice,
            basePrice,
            originalPrice: product.originalPrice || null,
            quantity,
            selectedSize,
            selectedExtras,
            specialInstructions,
            storeId: incomingStoreId,
            storeSlug: product.storeSlug || currentState.storeSlug,
            storeName: product.storeName || currentState.storeName,
          };
          nextItems = [...workingItems, newItem];
        }

        const switchedStore =
          currentState.storeId &&
          incomingStoreId &&
          currentState.storeId !== incomingStoreId;

        set({
          items: nextItems,
          storeId: incomingStoreId || currentState.storeId,
          storeName: product.storeName || (switchedStore ? "" : currentState.storeName),
          storeSlug: product.storeSlug || (switchedStore ? "" : currentState.storeSlug),
          deliveryFee: incomingDeliveryFee,
          baseDeliveryFee: incomingBaseFee,
          hasFreeDeliveryOffer: incomingHasFree,
          freeDeliveryThreshold: incomingThreshold,
          ...(switchedStore ? { couponCode: "", discountAmount: 0 } : {}),
          updatedAt: Date.now(),
        });

        return true;
      },

      updateQuantity: (itemKey, quantity) => {
        const nextQty = Number(quantity) || 0;
        if (nextQty <= 0) {
          get().removeItem(itemKey);
          return;
        }
        set({
          items: sanitizeCartItems(get().items).map((item) =>
            item.itemKey === itemKey ? { ...item, quantity: nextQty } : item
          ),
          updatedAt: Date.now(),
        });
      },

      removeItem: (itemKey) => {
        const nextItems = sanitizeCartItems(get().items).filter(
          (item) => item.itemKey !== itemKey
        );
        set({
          items: nextItems,
          ...(nextItems.length === 0
            ? {
                storeId: null,
                storeName: null,
                storeSlug: null,
                couponCode: "",
                discountAmount: 0,
                updatedAt: null,
              }
            : { updatedAt: Date.now() }),
        });
      },

      setDeliveryFee: (fee) => {
        set({ deliveryFee: Number(fee) || 0 });
      },

      applyCoupon: (code, discount, bearer = "platform") => {
        set({
          couponCode: code,
          discountAmount: Number(discount) || 0,
          discountBearer: bearer,
        });
      },

      removeCoupon: () => {
        set({ couponCode: "", discountAmount: 0, discountBearer: "platform" });
      },

      setNotes: (notes) => set({ notes }),

      clearCart: () => {
        set({
          items: [],
          storeId: null,
          storeName: null,
          storeSlug: null,
          deliveryFee: 15,
          baseDeliveryFee: 15,
          hasFreeDeliveryOffer: false,
          freeDeliveryThreshold: 0,
          couponCode: "",
          discountAmount: 0,
          notes: "",
          updatedAt: null,
        });
      },

      // Pure Getters (safe to call during React render)
      getSubtotal: () => {
        if (get().isExpired()) return 0;
        return get().items.reduce(
          (sum, item) =>
            sum +
            (Number(item.unitPrice ?? item.price ?? item.basePrice) || 0) *
              (Number(item.quantity) || 1),
          0
        );
      },

      getTotalCount: () => {
        if (get().isExpired()) return 0;
        return get().items.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        );
      },

      getDeliveryFee: () => {
        const subtotal = get().getSubtotal();
        const base = Number(get().baseDeliveryFee ?? get().deliveryFee ?? 15) || 0;
        const threshold = Number(get().freeDeliveryThreshold || 0);
        if (get().hasFreeDeliveryOffer || Number(get().deliveryFee) === 0) {
          if (threshold > 0) {
            return subtotal >= threshold ? 0 : base;
          }
          return 0;
        }
        return Number(get().deliveryFee ?? base);
      },

      getTotalAmount: () => {
        const subtotal = get().getSubtotal();
        if (subtotal <= 0) return 0;
        const fee = get().getDeliveryFee();
        const discount = Number(get().discountAmount) || 0;
        return Math.max(0, subtotal + fee - discount);
      },
    }),
    {
      name: "otlob_cart_storage",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.isExpired && state.isExpired()) {
          state.clearCart();
          return;
        }
        const cleaned = sanitizeCartItems(state.items);
        if (cleaned.length !== (state.items?.length || 0)) {
          state.items = cleaned;
        }
      },
    }
  )
);

