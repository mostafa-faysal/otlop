"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { storesService } from "@/services/stores.service";
import { productsService, cleanDescription } from "@/services/products.service";

export default function MerchantMenuPage() {
  const { user, logout } = useAuthStore();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    categoryId: "",
    categoryName: "",
    description: "",
    imageUrl: "",
    hasSizes: false,
    sizes: [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
    hasExtras: false,
    extras: [{ id: "ex_1", name: "", price: "" }],
    hasDiscount: false,
    discountType: "percentage",
    discountValue: "",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const [storesRes, catsRes] = await Promise.all([
          storesService.getStores({ limit: 100 }),
          storesService.getCategories({ activeOnly: true }),
        ]);

        const allStores = Array.isArray(storesRes?.stores) ? storesRes.stores : [];
        let currentStore = null;
        if (user?.storeId || user?.storeSlug || user?.id) {
          currentStore = allStores.find(
            (s) =>
              (user?.storeId && s.id === user.storeId) ||
              (user?.storeSlug && s.slug === user.storeSlug) ||
              (user?.id && s.ownerId === user.id)
          );
        }
        if (!currentStore && allStores.length > 0 && !user?.storeId && !user?.storeSlug) {
          currentStore = allStores[0];
        }

        if (isMounted) {
          if (Array.isArray(catsRes?.categories)) {
            setCategories(catsRes.categories);
            if (catsRes.categories.length > 0) {
              setNewProduct((prev) => ({
                ...prev,
                categoryId: catsRes.categories[0].id,
              }));
            }
          }

          if (currentStore) {
            setStore(currentStore);
            const prodsRes = await productsService.getProducts({
              storeId: currentStore.id,
              storeSlug: currentStore.slug,
            });
            setProducts(Array.isArray(prodsRes?.products) ? prodsRes.products : []);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMenu();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleAvailability = async (product) => {
    const nextAvailability = !product.isAvailable;
    try {
      const res = await productsService.updateProduct(product.id, {
        isAvailable: nextAvailability,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? (res?.product || { ...p, isAvailable: nextAvailability }) : p
        )
      );
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً للمتابعة.");
        logout();
      } else {
        alert("تعذر تحديث حالة توفر الصنف في قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الصنف من القائمة؟")) return;
    try {
      await productsService.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً للمتابعة.");
        logout();
      } else {
        alert("تعذر حذف الصنف من قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    }
  };

  const openEditModal = (prod) => {
    const existingSizes =
      Array.isArray(prod.sizes) && prod.sizes.length > 0
        ? prod.sizes.map((s, idx) => ({
            id: s.id || `sz_${idx + 1}`,
            name: s.name || "",
            extraPrice: idx === 0 ? 0 : Number(s.extraPrice ?? s.price ?? 0) || 0,
          }))
        : [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }];

    const rawExtras =
      Array.isArray(prod.extras) && prod.extras.length > 0
        ? prod.extras
        : Array.isArray(prod.addOns) && prod.addOns.length > 0
        ? prod.addOns
        : [];

    const existingExtras =
      rawExtras.length > 0
        ? rawExtras.map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            name: ex.name || "",
            price: ex.price ?? "",
          }))
        : [{ id: "ex_1", name: "", price: "" }];

    setEditingProduct({
      ...prod,
      description: cleanDescription(prod.description) || "",
      categoryName: prod.categoryName || prod.category || "",
      hasSizes: Array.isArray(prod.sizes) && prod.sizes.length > 0,
      sizes: existingSizes,
      hasExtras: rawExtras.length > 0,
      extras: existingExtras,
      hasDiscount: Boolean(prod.discountValue && Number(prod.discountValue) > 0),
      discountType: prod.discountType || "percentage",
      discountValue: prod.discountValue ?? "",
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    setSubmitting(true);

    const cleanSizes = newProduct.hasSizes
      ? newProduct.sizes
          .map((s, idx) => ({
            id: s.id || `sz_${idx + 1}`,
            name: String(s.name || "").trim(),
            extraPrice: idx === 0 ? 0 : Math.max(0, Number(s.extraPrice) || 0),
          }))
          .filter((s) => s.name.length > 0)
      : [];

    const cleanExtras = newProduct.hasExtras
      ? newProduct.extras
          .map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            name: String(ex.name || "").trim(),
            price: Math.max(0, Number(ex.price) || 0),
          }))
          .filter((ex) => ex.name.length > 0)
      : [];

    const selectedCat = categories.find((c) => c.id === newProduct.categoryId);
    const resolvedCatName =
      newProduct.categoryName.trim() || selectedCat?.name || "أصناف مميزة";

    try {
      const res = await productsService.createProduct({
        storeId: store?.id,
        name: newProduct.name.trim(),
        price: Number(newProduct.price),
        categoryId: newProduct.categoryId || undefined,
        categoryName: resolvedCatName,
        category: resolvedCatName,
        description: newProduct.description.trim() || undefined,
        imageUrl: newProduct.imageUrl || undefined,
        sizes: cleanSizes,
        extras: cleanExtras,
        addOns: cleanExtras,
        discountType: newProduct.hasDiscount ? newProduct.discountType : null,
        discountValue:
          newProduct.hasDiscount && Number(newProduct.discountValue) > 0
            ? Number(newProduct.discountValue)
            : 0,
      });

      if (!res?.product) {
        throw new Error("لم يتم إرجاع بيانات الصنف الجديد من الخادم");
      }

      setProducts((prev) => [...prev, res.product]);
      setShowAddModal(false);
      setNewProduct({
        name: "",
        price: "",
        categoryId: categories[0]?.id || "",
        categoryName: "",
        description: "",
        imageUrl: "",
        hasSizes: false,
        sizes: [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
        hasExtras: false,
        extras: [{ id: "ex_1", name: "", price: "" }],
        hasDiscount: false,
        discountType: "percentage",
        discountValue: "",
      });
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول أو التوكين غير موجود. يرجى تسجيل الدخول مجدداً للمتابعة.");
        logout();
      } else {
        alert("تعذر إضافة الصنف إلى قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);

    const cleanSizes = editingProduct.hasSizes
      ? editingProduct.sizes
          .map((s, idx) => ({
            id: s.id || `sz_${idx + 1}`,
            name: String(s.name || "").trim(),
            extraPrice: idx === 0 ? 0 : Math.max(0, Number(s.extraPrice) || 0),
          }))
          .filter((s) => s.name.length > 0)
      : [];

    const cleanExtras = editingProduct.hasExtras
      ? editingProduct.extras
          .map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            name: String(ex.name || "").trim(),
            price: Math.max(0, Number(ex.price) || 0),
          }))
          .filter((ex) => ex.name.length > 0)
      : [];

    const payload = {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      categoryName: editingProduct.categoryName || editingProduct.category || undefined,
      category: editingProduct.categoryName || editingProduct.category || undefined,
      description: editingProduct.description || "",
      sizes: cleanSizes,
      extras: cleanExtras,
      addOns: cleanExtras,
      discountType: editingProduct.hasDiscount ? editingProduct.discountType : null,
      discountValue:
        editingProduct.hasDiscount && Number(editingProduct.discountValue) > 0
          ? Number(editingProduct.discountValue)
          : 0,
    };

    try {
      const res = await productsService.updateProduct(editingProduct.id, payload);
      if (!res?.product) {
        throw new Error("لم يتم إرجاع بيانات الصنف المحدثة من الخادم");
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? res.product : p))
      );
      setEditingProduct(null);
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول أو التوكين غير موجود. يرجى تسجيل الدخول مجدداً للمتابعة.");
        logout();
      } else {
        alert("تعذر تحديث الصنف في قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "all") return true;
    return (
      p.categorySlug === selectedCategory ||
      p.categoryId === selectedCategory ||
      p.categoryName === selectedCategory ||
      p.category === selectedCategory
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/merchant" className="hover:text-[#0D5C58]">
              لوحة التحكم
            </Link>
            <span>/</span>
            <span className="text-[#0D5C58] font-bold">قائمة المنتجات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            إدارة قائمة الطعام: {store?.name || "المتجر"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            تحكم في توفر الأصناف، أسعارها، الأحجام والإضافات، أو أضف وجبات جديدة تظهر في صفحة المتجر فوراً
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>إضافة وجبة جديدة</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <Link
          href="/merchant"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-[#0D5C58] transition-all whitespace-nowrap"
        >
          <i className="fa-solid fa-list-check text-xs"></i>
          <span>نظرة عامة والطلبات</span>
        </Link>
        <Link
          href="/merchant/menu"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-[#0D5C58] text-xs font-bold text-white shadow-xs whitespace-nowrap"
        >
          <i className="fa-solid fa-utensils text-xs"></i>
          <span>قائمة المنتجات والأسعار</span>
        </Link>
        <Link
          href="/merchant/finance"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-[#0D5C58] transition-all whitespace-nowrap"
        >
          <i className="fa-regular fa-credit-card text-xs"></i>
          <span>المستحقات والتقارير المالية</span>
        </Link>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-sm text-gray-900">الأصناف المسجلة</h3>
            <span className="text-xs text-gray-400">
              {products.length} أصناف في القائمة
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-[#0D5C58] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.slug || c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === (c.slug || c.id)
                    ? "bg-[#0D5C58] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs font-bold text-[#0D5C58]">
            جاري تحميل قائمة الوجبات...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <i className="fa-solid fa-utensils text-4xl text-gray-300"></i>
            <p className="text-xs font-bold text-gray-600">
              لا توجد وجبات مسجلة في هذا القسم.
            </p>
            <p className="text-[11px]">اضغط على «إضافة وجبة جديدة» لإدراج أول صنف.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold">
                  <th className="pb-3 pr-4">اسم الوجبة</th>
                  <th className="pb-3">السعر</th>
                  <th className="pb-3">الأحجام والإضافات</th>
                  <th className="pb-3">التوفر للزبائن</th>
                  <th className="pb-3 pl-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-xs shrink-0">
                          <i className="fa-solid fa-utensils"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {prod.name}
                            </span>
                            {(prod.categoryName || prod.category) && (
                              <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-medium">
                                {prod.categoryName || prod.category}
                              </span>
                            )}
                          </div>
                          {cleanDescription(prod.description) && (
                            <span className="block text-[11px] text-gray-400 font-normal mt-0.5">
                              {cleanDescription(prod.description)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-black text-[#0D5C58]">
                      {prod.price} ج.م
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Array.isArray(prod.sizes) && prod.sizes.length > 0 ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            {prod.sizes.length} أحجام
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">بدون أحجام</span>
                        )}
                        {(Array.isArray(prod.extras) && prod.extras.length > 0) ||
                        (Array.isArray(prod.addOns) && prod.addOns.length > 0) ? (
                          <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                            {(prod.extras || prod.addOns).length} إضافات
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <button
                        type="button"
                        onClick={() => toggleAvailability(prod)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                          prod.isAvailable !== false
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            prod.isAvailable !== false ? "fa-check" : "fa-xmark"
                          } text-[9px]`}
                        ></i>
                        <span>
                          {prod.isAvailable !== false
                            ? "متاح للطلب"
                            : "غير متاح (نفد)"}
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 pl-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-[#E6F4F1] hover:text-[#0D5C58] text-gray-600 transition-colors flex items-center justify-center text-xs"
                          title="تعديل الوجبة والأحجام والإضافات"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors flex items-center justify-center text-xs"
                          title="حذف الوجبة"
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-plus text-[#0D5C58]"></i>
                <span>إضافة وجبة أو صنف جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم الوجبة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طاجن مكرونة باللحمة"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    السعر الأساسي (ج.م) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="65"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم القسم في المنيو
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: طواجن أو وجبات رئيسية"
                    value={newProduct.categoryName}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, categoryName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  التصنيف العام
                </label>
                <select
                  value={newProduct.categoryId}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, categoryId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الوصف والمكونات
                </label>
                <textarea
                  rows={2}
                  placeholder="لحمة مفرومة بلدي، صلصة طماطم مسبكة..."
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, description: e.target.value })
                  }
                  className="w-full px-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              {/* Sizes Builder */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newProduct.hasSizes}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          hasSizes: e.target.checked,
                          sizes:
                            newProduct.sizes?.length > 0
                              ? newProduct.sizes
                              : [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل خيارات الأحجام لهذا الصنف</span>
                  </label>
                  {newProduct.hasSizes && (
                    <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                      عدد الأحجام: {newProduct.sizes.length}
                    </span>
                  )}
                </div>

                {newProduct.hasSizes && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {newProduct.sizes.map((sz, idx) => (
                      <div
                        key={sz.id || idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                      >
                        <input
                          type="text"
                          placeholder={
                            idx === 0
                              ? "اسم الحجم الأول (مثال: صغير / عادي)"
                              : "اسم الحجم (مثال: وسط أو كبير)"
                          }
                          value={sz.name}
                          onChange={(e) => {
                            const updated = [...newProduct.sizes];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setNewProduct({ ...newProduct, sizes: updated });
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D5C58]"
                        />

                        {idx === 0 ? (
                          <span className="px-2.5 py-1.5 rounded-lg bg-[#E6F4F1] text-[#0D5C58] text-[11px] font-bold shrink-0">
                            السعر الأساسي (+0 ج.م)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-black text-[#0D5C58]">+</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="20"
                              value={sz.extraPrice}
                              onChange={(e) => {
                                const updated = [...newProduct.sizes];
                                updated[idx] = {
                                  ...updated[idx],
                                  extraPrice: e.target.value,
                                };
                                setNewProduct({ ...newProduct, sizes: updated });
                              }}
                              className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-center font-bold"
                            />
                            <span className="text-[11px] text-gray-500">ج.م</span>
                          </div>
                        )}

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newProduct.sizes.filter(
                                (_, i) => i !== idx
                              );
                              setNewProduct({ ...newProduct, sizes: updated });
                            }}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setNewProduct({
                          ...newProduct,
                          sizes: [
                            ...newProduct.sizes,
                            { id: `sz_${Date.now()}`, name: "", extraPrice: "" },
                          ],
                        })
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                      <span>إضافة حجم جديد (+سعر إضافي)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Extras Builder */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newProduct.hasExtras}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          hasExtras: e.target.checked,
                          extras:
                            newProduct.extras?.length > 0
                              ? newProduct.extras
                              : [{ id: "ex_1", name: "", price: "" }],
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل الإضافات الاختيارية لهذا الصنف</span>
                  </label>
                  {newProduct.hasExtras && (
                    <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                      عدد الإضافات: {newProduct.extras.length}
                    </span>
                  )}
                </div>

                {newProduct.hasExtras && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {newProduct.extras.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                      >
                        <input
                          type="text"
                          placeholder="اسم الإضافة (مثال: صوص شيدر)"
                          value={ex.name}
                          onChange={(e) => {
                            const updated = [...newProduct.extras];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setNewProduct({ ...newProduct, extras: updated });
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-black text-[#0D5C58]">+</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="15"
                            value={ex.price}
                            onChange={(e) => {
                              const updated = [...newProduct.extras];
                              updated[idx] = {
                                ...updated[idx],
                                price: e.target.value,
                              };
                              setNewProduct({ ...newProduct, extras: updated });
                            }}
                            className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-center font-bold"
                          />
                          <span className="text-[11px] text-gray-500">ج.م</span>
                        </div>

                        {newProduct.extras.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newProduct.extras.filter(
                                (_, i) => i !== idx
                              );
                              setNewProduct({ ...newProduct, extras: updated });
                            }}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setNewProduct({
                          ...newProduct,
                          extras: [
                            ...newProduct.extras,
                            { id: `ex_${Date.now()}`, name: "", price: "" },
                          ],
                        })
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                      <span>إضافة إضافة أخرى</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Item-Level Promotion / Discount */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newProduct.hasDiscount}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          hasDiscount: e.target.checked,
                          discountType: newProduct.discountType || "percentage",
                          discountValue: newProduct.discountValue || "",
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل خصم أو عرض ترويجي على هذا الصنف</span>
                  </label>
                  {newProduct.hasDiscount && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      خصم نشط
                    </span>
                  )}
                </div>

                {newProduct.hasDiscount && (
                  <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">نوع الخصم</label>
                      <select
                        value={newProduct.discountType}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, discountType: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت من السعر (ج.م)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {newProduct.discountType === "percentage" ? "نسبة الخصم (%)" : "قيمة الخصم (ج.م)"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={newProduct.discountType === "percentage" ? "100" : undefined}
                        placeholder={newProduct.discountType === "percentage" ? "20" : "15"}
                        value={newProduct.discountValue}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, discountValue: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الإضافة..." : "إضافة إلى القائمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-pen text-[#0D5C58]"></i>
                <span>تعديل الوجبة: {editingProduct.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم الوجبة
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    السعر الأساسي (ج.م)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: e.target.value })
                    }
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    اسم القسم في المنيو
                  </label>
                  <input
                    type="text"
                    value={editingProduct.categoryName || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        categoryName: e.target.value,
                      })
                    }
                    placeholder="مثال: طواجن"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الوصف والمكونات
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              {/* Edit Sizes Builder */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.hasSizes)}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          hasSizes: e.target.checked,
                          sizes:
                            editingProduct.sizes?.length > 0
                              ? editingProduct.sizes
                              : [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل خيارات الأحجام لهذا الصنف (أو إلغاء التحديد لقفلها)</span>
                  </label>
                  {editingProduct.hasSizes && (
                    <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                      {editingProduct.sizes.length} أحجام
                    </span>
                  )}
                </div>

                {editingProduct.hasSizes && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {editingProduct.sizes.map((sz, idx) => (
                      <div
                        key={sz.id || idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                      >
                        <input
                          type="text"
                          placeholder={
                            idx === 0
                              ? "اسم الحجم الأول (السعر الأساسي)"
                              : "اسم الحجم (مثال: وسط أو كبير)"
                          }
                          value={sz.name}
                          onChange={(e) => {
                            const updated = [...editingProduct.sizes];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingProduct({ ...editingProduct, sizes: updated });
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                        />

                        {idx === 0 ? (
                          <span className="px-2.5 py-1.5 rounded-lg bg-[#E6F4F1] text-[#0D5C58] text-[11px] font-bold shrink-0">
                            السعر الأساسي (+0 ج.م)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-black text-[#0D5C58]">+</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="20"
                              value={sz.extraPrice}
                              onChange={(e) => {
                                const updated = [...editingProduct.sizes];
                                updated[idx] = {
                                  ...updated[idx],
                                  extraPrice: e.target.value,
                                };
                                setEditingProduct({
                                  ...editingProduct,
                                  sizes: updated,
                                });
                              }}
                              className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-center font-bold"
                            />
                            <span className="text-[11px] text-gray-500">ج.م</span>
                          </div>
                        )}

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.sizes.filter(
                                (_, i) => i !== idx
                              );
                              setEditingProduct({
                                ...editingProduct,
                                sizes: updated,
                              });
                            }}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          sizes: [
                            ...editingProduct.sizes,
                            { id: `sz_${Date.now()}`, name: "", extraPrice: "" },
                          ],
                        })
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                      <span>إضافة حجم جديد (+سعر إضافي)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Extras Builder */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.hasExtras)}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          hasExtras: e.target.checked,
                          extras:
                            editingProduct.extras?.length > 0
                              ? editingProduct.extras
                              : [{ id: "ex_1", name: "", price: "" }],
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل الإضافات الاختيارية (أو إلغاء التحديد لقفلها)</span>
                  </label>
                  {editingProduct.hasExtras && (
                    <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                      {editingProduct.extras.length} إضافات
                    </span>
                  )}
                </div>

                {editingProduct.hasExtras && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {editingProduct.extras.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                      >
                        <input
                          type="text"
                          placeholder="اسم الإضافة (مثال: صوص شيدر)"
                          value={ex.name}
                          onChange={(e) => {
                            const updated = [...editingProduct.extras];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setEditingProduct({
                              ...editingProduct,
                              extras: updated,
                            });
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-black text-[#0D5C58]">+</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="15"
                            value={ex.price}
                            onChange={(e) => {
                              const updated = [...editingProduct.extras];
                              updated[idx] = {
                                ...updated[idx],
                                price: e.target.value,
                              };
                              setEditingProduct({
                                ...editingProduct,
                                extras: updated,
                              });
                            }}
                            className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-center font-bold"
                          />
                          <span className="text-[11px] text-gray-500">ج.م</span>
                        </div>

                        {editingProduct.extras.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.extras.filter(
                                (_, i) => i !== idx
                              );
                              setEditingProduct({
                                ...editingProduct,
                                extras: updated,
                              });
                            }}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          extras: [
                            ...editingProduct.extras,
                            { id: `ex_${Date.now()}`, name: "", price: "" },
                          ],
                        })
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                      <span>إضافة إضافة أخرى</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Item-Level Promotion / Discount in Edit Modal */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.hasDiscount)}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          hasDiscount: e.target.checked,
                          discountType: editingProduct.discountType || "percentage",
                          discountValue: editingProduct.discountValue || "",
                        })
                      }
                      className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                    />
                    <span>تفعيل خصم أو عرض ترويجي على هذا الصنف</span>
                  </label>
                  {editingProduct.hasDiscount && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      خصم نشط
                    </span>
                  )}
                </div>

                {editingProduct.hasDiscount && (
                  <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">نوع الخصم</label>
                      <select
                        value={editingProduct.discountType || "percentage"}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, discountType: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت من السعر (ج.م)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        {editingProduct.discountType === "percentage" ? "نسبة الخصم (%)" : "قيمة الخصم (ج.م)"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={editingProduct.discountType === "percentage" ? "100" : undefined}
                        placeholder={editingProduct.discountType === "percentage" ? "20" : "15"}
                        value={editingProduct.discountValue ?? ""}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, discountValue: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
