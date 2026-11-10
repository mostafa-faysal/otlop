/**
 * منطقة الخدمة الوحيدة للتطبيق: قرية باسوس ومناطقها الداخلية.
 * أي قائمة مناطق أو قيمة افتراضية للعنوان يجب أن تُقرأ من هنا.
 */
export const SERVICE_VILLAGE = "باسوس";

export const SERVICE_AREAS = [
  "أول البلد",
  "بحبح",
  "سلم دائري باسوس جوا",
  "سيدي صيف",
  "الموزة",
  "الكوبري الجديد",
  "السكة الجديدة",
  "رستم",
  "الملاح",
  "كمونة",
];

export const DEFAULT_AREA = SERVICE_AREAS[0];

export function formatServiceAddress(area, street = "") {
  const parts = [SERVICE_VILLAGE, area || DEFAULT_AREA];
  if (street && String(street).trim()) parts.push(String(street).trim());
  return parts.join(" - ");
}
