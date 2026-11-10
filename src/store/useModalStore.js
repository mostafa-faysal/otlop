import { create } from "zustand";

export const useModalStore = create((set) => ({
  // Product Details Modal
  isProductModalOpen: false,
  activeProduct: null,
  openProductModal: (product) => set({ isProductModalOpen: true, activeProduct: product }),
  closeProductModal: () => set({ isProductModalOpen: false, activeProduct: null }),

  // Auth / Login Modal
  isAuthModalOpen: false,
  authModalMode: "login", // 'login' | 'register'
  openAuthModal: (mode = "login") => set({ isAuthModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  // Guest Order Claim Modal
  isClaimModalOpen: false,
  claimOrderData: null,
  openClaimModal: (orderData) => set({ isClaimModalOpen: true, claimOrderData: orderData }),
  closeClaimModal: () => set({ isClaimModalOpen: false, claimOrderData: null }),

  // Delivery Location Modal
  isLocationModalOpen: false,
  openLocationModal: () => set({ isLocationModalOpen: true }),
  closeLocationModal: () => set({ isLocationModalOpen: false }),
}));

