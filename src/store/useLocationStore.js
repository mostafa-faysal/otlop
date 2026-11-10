import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SERVICE_VILLAGE, SERVICE_AREAS, DEFAULT_AREA } from "@/lib/regions";

const AVAILABLE_AREAS = SERVICE_AREAS.map((area) => ({
  city: SERVICE_VILLAGE,
  area,
  label: `${SERVICE_VILLAGE} - ${area}`,
}));

const DEFAULT_LOCATION = {
  city: SERVICE_VILLAGE,
  area: DEFAULT_AREA,
  street: "",
  label: `${SERVICE_VILLAGE}، ${DEFAULT_AREA}`,
};

export const useLocationStore = create(
  persist(
    (set) => ({
      currentLocation: DEFAULT_LOCATION,
      availableAreas: AVAILABLE_AREAS,
      setLocation: (location) => set({ currentLocation: location }),
    }),
    {
      name: "otlob_location_storage",
      version: 2,
      // المواقع المحفوظة قديماً (كفر الشيخ / دسوق) تُستبدل بمنطقة الخدمة الحالية
      migrate: (persisted) => {
        const loc = persisted?.currentLocation;
        const valid =
          loc && loc.city === SERVICE_VILLAGE && SERVICE_AREAS.includes(loc.area);
        return {
          ...persisted,
          currentLocation: valid ? loc : DEFAULT_LOCATION,
          availableAreas: AVAILABLE_AREAS,
        };
      },
      // القائمة دائماً من الكود وليس من التخزين المحلي
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        availableAreas: AVAILABLE_AREAS,
      }),
    }
  )
);
