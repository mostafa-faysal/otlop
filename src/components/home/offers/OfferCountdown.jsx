"use client";

import { useState, useEffect } from "react";

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function isOfferExpired(endsAt) {
  if (!endsAt) return false;
  const ts = new Date(endsAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts <= Date.now();
}

export function formatOfferEndArabic(endsAt) {
  if (!endsAt) return "";
  const dt = new Date(endsAt);
  if (Number.isNaN(dt.getTime())) return "";

  const day = dt.getDate();
  const monthName = ARABIC_MONTHS[dt.getMonth()] || "";
  const hours24 = dt.getHours();
  const minutes = dt.getMinutes();
  const period = hours24 >= 12 ? "مساءً" : "صباحاً";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minsStr = String(minutes).padStart(2, "0");

  return `يقف يوم ${day} ${monthName} الساعة ${hours12}:${minsStr} ${period}`;
}

function computeRemaining(endsAt) {
  if (!endsAt) return null;
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target)) return null;

  const diff = target - Date.now();
  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { expired: false, days, hours, minutes, seconds };
}

export default function OfferCountdown({
  endsAt,
  variant = "default", // "default" | "banner" | "compact"
  showExactDate = true,
  onExpire = null,
}) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => computeRemaining(endsAt));

  useEffect(() => {
    setMounted(true);
    const initial = computeRemaining(endsAt);
    setTimeLeft(initial);
    if (!endsAt) return;

    const timer = setInterval(() => {
      const next = computeRemaining(endsAt);
      setTimeLeft(next);
      if (next?.expired && typeof onExpire === "function") {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt, onExpire]);

  if (!mounted || !endsAt || !timeLeft) return null;

  if (timeLeft.expired) {
    if (variant === "compact") return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
        <i className="fa-regular fa-clock text-[10px]"></i>
        <span>انتهى وقت العرض</span>
      </span>
    );
  }

  const pad = (n) => String(n).padStart(2, "0");

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-400 text-teal-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
        <i className="fa-solid fa-stopwatch text-[10px]"></i>
        <span dir="ltr">
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  const isBanner = variant === "banner";

  return (
    <div
      className={`flex flex-col gap-1.5 ${
        isBanner ? "text-white" : "text-gray-800"
      }`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
            isBanner ? "text-amber-300" : "text-[#0D5C58]"
          }`}
        >
          <i className="fa-solid fa-hourglass-half text-[10px] animate-pulse"></i>
          <span>ينتهي العرض خلال:</span>
        </span>

        <div className="flex items-center gap-1" dir="ltr">
          {[
            { value: timeLeft.days, label: "يوم" },
            { value: pad(timeLeft.hours), label: "ساعة" },
            { value: pad(timeLeft.minutes), label: "دقيقة" },
            { value: pad(timeLeft.seconds), label: "ثانية" },
          ].map((unit, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div
                className={`min-w-11 px-2 py-1 rounded-xl text-center border ${
                  isBanner
                    ? "bg-black/25 border-white/20 text-white"
                    : "bg-white border-teal-200 text-[#0D5C58] shadow-2xs"
                }`}
              >
                <span className="font-mono font-black text-xs sm:text-sm block leading-none">
                  {unit.value}
                </span>
                <span
                  className={`text-[9px] font-bold block mt-0.5 ${
                    isBanner ? "text-emerald-200" : "text-gray-500"
                  }`}
                >
                  {unit.label}
                </span>
              </div>
              {idx < 3 && (
                <span
                  className={`font-black text-xs ${
                    isBanner ? "text-amber-300" : "text-[#0D5C58]"
                  }`}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {showExactDate && (
        <div
          className={`text-[11px] font-bold flex items-center gap-1.5 ${
            isBanner ? "text-emerald-100/90" : "text-gray-600"
          }`}
        >
          <i className="fa-regular fa-calendar-check text-[10px]"></i>
          <span>{formatOfferEndArabic(endsAt)}</span>
        </div>
      )}
    </div>
  );
}

