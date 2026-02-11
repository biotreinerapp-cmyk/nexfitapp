import { createContext, useContext, useState, ReactNode } from "react";
import type { ActivityCategory } from "@/lib/activityTypes";

export interface ActivitySelection {
  id: string;
  name: string;
  category: ActivityCategory;
  usesGps: boolean;
  usesDistance: boolean;
}

interface ActivityContextValue {
  currentActivity: ActivitySelection | null;
  setCurrentActivity: (activity: ActivitySelection | null) => void;
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [currentActivity, setCurrentActivity] = useState<ActivitySelection | null>(null);

  return (
    <ActivityContext.Provider value={{ currentActivity, setCurrentActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivityContext = () => {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivityContext deve ser usado dentro de ActivityProvider");
  return ctx;
};
