import { authRepository } from "../../repositories/auth.repository.js";
import { clearCsrfCookies, rotateCsrfToken } from "../../security/csrf.js";
import { createSessionToken } from "../../security/session.js";
import { AppError } from "../../http/AppError.js";
import { toAddressDTO, toUserDTO } from "./auth.dto.js";
import {
  validateAddressInput,
  validateLoginInput,
  validateProfileUpdateInput,
  validateRegisterInput,
} from "./auth.validator.js";

export const authModule = {
  async requireAuth() {
    const current = await authRepository.getCurrentUserAndProfile();
    if (!current || !current.user) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "يرجى تسجيل الدخول للمتابعة.",
        status: 401,
      });
    }
    return {
      user: current.user,
      profile: current.profile,
      role: current.profile?.role || current.user?.role || "customer",
    };
  },

  async requireRole(allowedRoles = []) {
    const auth = await this.requireAuth();
    if (!allowedRoles.includes(auth.role)) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "ليست لديك صلاحية لتنفيذ هذا الإجراء.",
        status: 403,
      });
    }
    return auth;
  },

  async requireAdmin() {
    const auth = await this.requireAuth();
    if (auth.role !== "admin") {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "هذا الإجراء متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }
    return auth;
  },

  async getOptionalAuth() {
    try {
      const current = await authRepository.getCurrentUserAndProfile();
      if (!current || !current.user) return null;
      return {
        user: current.user,
        profile: current.profile,
        role: current.profile?.role || current.user?.role || "customer",
      };
    } catch {
      return null;
    }
  },

  async login(body) {
    const credentials = validateLoginInput(body);
    const { user, profile } = await authRepository.signInWithPassword(
      credentials
    );
    const csrfToken = await rotateCsrfToken({ userId: user?.id });
    const token = createSessionToken(user);

    return {
      user: toUserDTO(user, profile),
      token,
      csrfToken,
    };
  },

  async register(body) {
    const input = validateRegisterInput(body);
    const { user, profile, requiresConfirmation } =
      await authRepository.signUp(input);
    const csrfToken = await rotateCsrfToken({ userId: user?.id });
    const token = createSessionToken(user);

    return {
      user: toUserDTO(user, profile),
      token,
      requiresConfirmation,
      csrfToken,
    };
  },

  async logout() {
    await authRepository.signOut();
    await clearCsrfCookies();
    return { loggedOut: true };
  },

  async getMe() {
    const auth = await this.getOptionalAuth();
    if (!auth || !auth.user) {
      return { user: null };
    }
    return {
      user: toUserDTO(auth.user, auth.profile),
    };
  },

  async updateMe(body) {
    const { user } = await this.requireAuth();
    const domainUpdate = validateProfileUpdateInput(body);
    const updatedProfile = await authRepository.updateProfile(
      user.id,
      domainUpdate
    );

    return {
      user: toUserDTO(user, updatedProfile),
    };
  },

  async listAddresses() {
    const { user } = await this.requireAuth();
    const entities = await authRepository.listAddresses(user.id);
    return {
      items: entities.map(toAddressDTO),
    };
  },

  async createAddress(body) {
    const { user } = await this.requireAuth();
    const domainAddress = validateAddressInput(body, false);
    const created = await authRepository.createAddress(user.id, domainAddress);
    return {
      address: toAddressDTO(created),
    };
  },

  async updateAddress(addressId, body) {
    const { user } = await this.requireAuth();
    const domainAddress = validateAddressInput(body, true);
    const updated = await authRepository.updateAddress(
      user.id,
      addressId,
      domainAddress
    );
    return {
      address: toAddressDTO(updated),
    };
  },

  async deleteAddress(addressId) {
    const { user } = await this.requireAuth();
    await authRepository.deleteAddress(user.id, addressId);
    return { deleted: true };
  },
};
