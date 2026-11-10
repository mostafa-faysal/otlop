import { createClient } from "@supabase/supabase-js";
import { AppError } from "../../http/AppError.js";

if (typeof window !== "undefined") {
  throw new Error("Security Violation: getSupabaseAdminClient can only be accessed in server runtime.");
}

let cachedAdminClient = null;

/**
 * عميل Supabase إداري يعمل فقط على السيرفر ويستخدم مفتاح الخدمة SUPABASE_SERVICE_ROLE_KEY.
 * مخصص حصرياً للعمليات السيرفرية الموثقة والمعتمدة (مثل إدارة العروض والكتالوج) لتجاوز قيود RLS بأمان.
 * لا يتم تصدير المفتاح السري نهائياً ولا يتم تفعيل حفظ الجلسات أو التحديث التلقائي للرموز.
 */
export function getSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new AppError({
      code: "SUPABASE_ADMIN_CONFIG_MISSING",
      message: "إعدادات الاتصال الإداري بقاعدة البيانات غير مكتملة على الخادم (SUPABASE_SERVICE_ROLE_KEY).",
      status: 500,
    });
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}
