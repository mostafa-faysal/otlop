import { supabaseCatalogAdapter } from "../adapters/supabase/catalog.adapter.js";

export const catalogRepository = {
  listCategories: (filters) => supabaseCatalogAdapter.listCategories(filters),
  createCategory: (domainInput) =>
    supabaseCatalogAdapter.createCategory(domainInput),
  updateCategory: (id, domainInput) =>
    supabaseCatalogAdapter.updateCategory(id, domainInput),
  deleteCategory: (id) => supabaseCatalogAdapter.deleteCategory(id),

  listStores: (filters) => supabaseCatalogAdapter.listStores(filters),
  getStoreBySlugOrId: (slugOrId) =>
    supabaseCatalogAdapter.getStoreBySlugOrId(slugOrId),
  createStore: (domainInput, categoryIds) =>
    supabaseCatalogAdapter.createStore(domainInput, categoryIds),
  updateStore: (slugOrId, domainInput, categoryIds) =>
    supabaseCatalogAdapter.updateStore(slugOrId, domainInput, categoryIds),
  deleteStore: (slugOrId) => supabaseCatalogAdapter.deleteStore(slugOrId),

  listProducts: (filters) => supabaseCatalogAdapter.listProducts(filters),
  getProductById: (id) => supabaseCatalogAdapter.getProductById(id),
  createProduct: (domainInput) =>
    supabaseCatalogAdapter.createProduct(domainInput),
  updateProduct: (id, domainInput) =>
    supabaseCatalogAdapter.updateProduct(id, domainInput),
  deleteProduct: (id) => supabaseCatalogAdapter.deleteProduct(id),

  listOffers: (filters) => supabaseCatalogAdapter.listOffers(filters),
  getOfferById: (id) => supabaseCatalogAdapter.getOfferById(id),
  createOffer: (domainInput, productIds) =>
    supabaseCatalogAdapter.createOffer(domainInput, productIds),
  updateOffer: (id, domainInput, productIds) =>
    supabaseCatalogAdapter.updateOffer(id, domainInput, productIds),
  deleteOffer: (id) => supabaseCatalogAdapter.deleteOffer(id),
};
