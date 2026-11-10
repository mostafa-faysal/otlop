import { create } from "zustand";
import { authService } from "@/services/auth.service";
import { useModalStore } from "@/store/useModalStore";

function isRoleAllowedOnCurrentPath(user) {
  if (!user) return false;
  if (typeof window === "undefined") return true;
  const path = window.location.pathname || "";
  if (path.startsWith("/admin")) {
    return user.role === "admin";
  }
  if (path.startsWith("/merchant")) {
    return user.role === "merchant";
  }
  // في الموقع العام للعميل لا يُسمح إطلاقاً بحسابات التجار أو السوبر أدمن
  return user.role !== "merchant" && user.role !== "admin";
}

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  addresses: [],
  selectedAddressId: null,

  setUser: (user) => {
    const validUser = isRoleAllowedOnCurrentPath(user) ? user : null;
    set({
      user: validUser,
      isAuthenticated: !!validUser,
      isLoading: false,
    });
  },

  setAddresses: (addresses) => {
    set({
      addresses: Array.isArray(addresses) ? addresses : [],
      selectedAddressId: addresses?.[0]?.id || null,
    });
  },

  setSelectedAddressId: (id) => set({ selectedAddressId: id }),

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const data = await authService.getMe();
      const validUser = isRoleAllowedOnCurrentPath(data?.user)
        ? data.user
        : null;
      if (validUser) {
        set({ user: validUser, isAuthenticated: true });
        if (validUser.role === "customer" || !validUser.role) {
          try {
            const addrRes = await authService.getAddresses();
            if (Array.isArray(addrRes?.addresses)) {
              set({
                addresses: addrRes.addresses,
                selectedAddressId:
                  addrRes.addresses.find((a) => a.isDefault)?.id ||
                  addrRes.addresses[0]?.id ||
                  null,
              });
            }
          } catch {
            // ignore address error on boot
          }
        }
      } else {
        set({ user: null, isAuthenticated: false, addresses: [] });
      }
    } catch {
      set({ user: null, isAuthenticated: false, addresses: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      set({ user: null, isAuthenticated: false, addresses: [], selectedAddressId: null });
    }
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("otlob_auth_unauthorized", (event) => {
    try {
      localStorage.removeItem("otlob_merchant_session");
      localStorage.removeItem("otlob_admin_session");
      localStorage.removeItem("otlob_user_session");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
    } catch {}

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      addresses: [],
      selectedAddressId: null,
      isLoading: false,
    });

    const pathname = window.location.pathname || "";
    // فتح نافذة تسجيل الدخول فوراً إذا كان المستخدم في مسار يتطلب حساباً أو أجرى عملية تتطلب إذن دخول
    if (
      pathname.startsWith("/profile") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/checkout")
    ) {
      try {
        useModalStore.getState().openAuthModal("login");
      } catch {}
    }
  });
}

