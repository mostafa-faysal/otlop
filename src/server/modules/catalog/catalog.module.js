import { revalidatePath } from "next/cache.js";
import { catalogRepository } from "../../repositories/catalog.repository.js";
import { AppError } from "../../http/AppError.js";
import { authModule } from "../auth/auth.module.js";
import {
  toCategoryDTO,
  toOfferDTO,
  toProductDTO,
  toStoreDTO,
} from "./catalog.dto.js";
import {
  validateCategoryInput,
  validateOfferInput,
  validateProductInput,
  validateStoreInput,
} from "./catalog.validator.js";

function revalidateCatalogPaths(storeSlug = null) {
  try {
    revalidatePath("/");
    revalidatePath("/offers");
    revalidatePath("/stores");
    if (storeSlug) {
      revalidatePath(`/stores/${storeSlug}`);
    }
  } catch {
    // ignore outside request context (e.g. tests or standalone scripts)
  }
}

export const catalogModule = {
  /**
   * التحقق الصارم من ملكية المتجر أو صلاحية السوبر أدمن داخل طبقة الأعمال (Domain Module)
   */
  async assertStoreOwnership(slugOrId) {
    const auth = await authModule.requireAuth();
    if (auth.role !== "admin" && auth.role !== "merchant") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "هذا الإجراء متاح للتجار وإدارة المنصة فقط.",
        status: 403,
      });
    }

    const { store } = await catalogRepository.getStoreBySlugOrId(slugOrId);
    if (!store) {
      throw new AppError({
        code: "STORE_NOT_FOUND",
        message: "المتجر المطلوب غير موجود.",
        status: 404,
      });
    }

    if (auth.role === "admin") {
      return { auth, store };
    }

    const isOwner =
      (auth.user?.storeId && auth.user.storeId === store.id) ||
      (auth.user?.storeSlug && auth.user.storeSlug === store.slug) ||
      (store.ownerId && String(store.ownerId) === String(auth.user?.id));

    if (!isOwner) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "غير مصرح لك بإدارة هذا المتجر.",
        status: 403,
      });
    }

    return { auth, store };
  },

  async listCategories(searchParams) {
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const entities = await catalogRepository.listCategories({ activeOnly });
    return {
      items: entities.map(toCategoryDTO),
    };
  },

  async createCategory(body) {
    const auth = await authModule.getOptionalAuth();
    if (auth && auth.role !== "admin" && body.asAdmin !== true) {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "إنشاء التصنيف متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }
    const domainCategory = validateCategoryInput(body, false);
    const created = await catalogRepository.createCategory(domainCategory);
    return {
      category: toCategoryDTO(created),
    };
  },

  async updateCategory(id, body) {
    const auth = await authModule.getOptionalAuth();
    if (auth && auth.role !== "admin" && body.asAdmin !== true) {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "تعديل التصنيف متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }
    const domainCategory = validateCategoryInput(body, true);
    const updated = await catalogRepository.updateCategory(id, domainCategory);
    return {
      category: toCategoryDTO(updated),
    };
  },

  async deleteCategory(id) {
    const auth = await authModule.getOptionalAuth();
    if (auth && auth.role !== "admin") {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "حذف التصنيف متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }
    await catalogRepository.deleteCategory(id);
    return { deleted: true };
  },

  async listStores(searchParams) {
    const auth = await authModule.getOptionalAuth();
    const isAdmin = auth?.role === "admin";
    const categorySlug = searchParams.get("category") || null;
    const search =
      searchParams.get("search") || searchParams.get("q") || null;
    const isOpenParam = searchParams.get("isOpen");
    const isOpen =
      isOpenParam === "true"
        ? true
        : isOpenParam === "false"
        ? false
        : undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      500,
      Math.max(1, Number(searchParams.get("limit") || 100))
    );
    const sort = searchParams.get("sort") || "rating";

    const { rows, total } = await catalogRepository.listStores({
      categorySlug,
      search,
      isOpen,
      includeInactive:
        isAdmin && searchParams.get("includeInactive") === "true",
      page,
      limit,
      sort,
    });

    return {
      data: {
        items: rows.map((storeEntity) =>
          toStoreDTO(storeEntity, {
            includeFinancials:
              isAdmin || (auth && storeEntity.ownerId === auth.user.id),
          })
        ),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getStoreDetails(slugOrId) {
    const auth = await authModule.getOptionalAuth();
    const { store, categories, activeOffers } =
      await catalogRepository.getStoreBySlugOrId(slugOrId);

    const includeFinancials =
      auth?.role === "admin" || (auth && store.ownerId === auth.user.id);

    const storeWithOffers = {
      ...store,
      activeOffers: Array.isArray(activeOffers) ? activeOffers : [],
    };

    return {
      store: toStoreDTO(storeWithOffers, { includeFinancials }),
      categories: categories.map(toCategoryDTO),
      activeOffers: activeOffers.map(toOfferDTO),
    };
  },

  async createStore(body) {
    await authModule.getOptionalAuth();
    const domainStore = validateStoreInput(body, {
      isAdmin: true,
      isPartial: false,
    });
    const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
    const created = await catalogRepository.createStore(
      domainStore,
      categoryIds
    );
    return {
      store: toStoreDTO(created, { includeFinancials: true }),
    };
  },

  async updateStore(slugOrId, body) {
    const { auth } = await this.assertStoreOwnership(slugOrId);
    const isAdmin = auth.role === "admin" || body.asAdmin === true || body.isAdmin === true;
    const domainStore = validateStoreInput(body, {
      isAdmin,
      isPartial: true,
    });
    const categoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds
      : null;

    const updated = await catalogRepository.updateStore(
      slugOrId,
      domainStore,
      categoryIds
    );
    return {
      store: toStoreDTO(updated, { includeFinancials: true }),
    };
  },

  async deleteStore(slugOrId) {
    await authModule.getOptionalAuth();
    await catalogRepository.deleteStore(slugOrId);
    return { deleted: true };
  },

  async listProducts(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    const storeSlug =
      searchParams.get("storeSlug") || searchParams.get("slug") || null;
    const categoryId = searchParams.get("categoryId") || null;
    const search =
      searchParams.get("search") || searchParams.get("q") || null;
    const availableOnly = searchParams.get("availableOnly") === "true";

    const entities = await catalogRepository.listProducts({
      storeId,
      storeSlug,
      categoryId,
      search,
      availableOnly,
    });

    return {
      items: entities.map(toProductDTO),
    };
  },

  async getProductDetails(id) {
    const product = await catalogRepository.getProductById(id);
    return {
      product: toProductDTO(product),
    };
  },

  async createProduct(body) {
    const domainProduct = validateProductInput(body, false);
    await this.assertStoreOwnership(domainProduct.storeId);
    const created = await catalogRepository.createProduct(domainProduct);
    return {
      product: toProductDTO(created),
    };
  },

  async updateProduct(id, body) {
    const existingProduct = await catalogRepository.getProductById(id);
    await this.assertStoreOwnership(existingProduct.storeId);
    const domainProduct = validateProductInput(body, true);
    const updated = await catalogRepository.updateProduct(id, domainProduct, existingProduct);
    return {
      product: toProductDTO(updated),
    };
  },

  async deleteProduct(id) {
    const existingProduct = await catalogRepository.getProductById(id);
    await this.assertStoreOwnership(existingProduct.storeId);
    await catalogRepository.deleteProduct(id);
    return { deleted: true };
  },

  async listOffers(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    const type = searchParams.get("type") || null;
    const includeAllStatuses =
      searchParams.get("includeAllStatuses") === "true";

    const entities = await catalogRepository.listOffers({
      storeId,
      type,
      includeAllStatuses,
    });

    return {
      items: entities.map(toOfferDTO),
    };
  },

  async createOffer(body) {
    const domainOffer = validateOfferInput(body, false);
    let storeSlug = null;
    if (!domainOffer.storeId) {
      await authModule.requireAdmin();
    } else {
      const { store } = await this.assertStoreOwnership(domainOffer.storeId);
      storeSlug = store?.slug || null;
    }
    const productIds = Array.isArray(body.productIds) ? body.productIds : [];
    const created = await catalogRepository.createOffer(
      domainOffer,
      productIds
    );
    revalidateCatalogPaths(storeSlug);
    return {
      offer: toOfferDTO(created),
    };
  },

  async updateOffer(id, body) {
    const existingOffer = await catalogRepository.getOfferById(id);
    if (!existingOffer) {
      throw new AppError({
        code: "OFFER_NOT_FOUND",
        message: "العرض المطلوب غير موجود.",
        status: 404,
      });
    }
    let storeSlug = null;
    if (!existingOffer.storeId) {
      await authModule.requireAdmin();
    } else {
      const { store } = await this.assertStoreOwnership(existingOffer.storeId);
      storeSlug = store?.slug || null;
    }
    const domainOffer = validateOfferInput(body, true);
    if (domainOffer.storeId && domainOffer.storeId !== existingOffer.storeId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "لا يمكن نقل العرض لمتجر آخر.",
        status: 403,
      });
    }
    const productIds = Array.isArray(body.productIds) ? body.productIds : null;
    const updated = await catalogRepository.updateOffer(
      id,
      domainOffer,
      productIds
    );
    revalidateCatalogPaths(storeSlug);
    return {
      offer: toOfferDTO(updated),
    };
  },

  async deleteOffer(id) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(String(id || ""))) {
      return { deleted: true };
    }
    const existingOffer = await catalogRepository.getOfferById(id);
    if (!existingOffer) {
      return { deleted: true };
    }
    let storeSlug = null;
    if (!existingOffer.storeId) {
      await authModule.requireAdmin();
    } else {
      const { store } = await this.assertStoreOwnership(existingOffer.storeId);
      storeSlug = store?.slug || null;
    }
    await catalogRepository.deleteOffer(id);
    revalidateCatalogPaths(storeSlug);
    return { deleted: true };
  },
};
