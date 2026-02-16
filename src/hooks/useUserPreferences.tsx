import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type MeasurementSystem = "metric" | "imperial";
export type ActivityPrivacy = "public" | "followers" | "private";
export type DistanceUnit = "km" | "mi";
export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "ft-in";
export type GpsAccuracyMode = "balanced" | "high";

export interface UserPreferences {
  languagePref: string;
  measurementSystem: MeasurementSystem;
  distanceUnit: DistanceUnit;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  gpsAutoPause: boolean;
  gpsAccuracyMode: GpsAccuracyMode;
  activityPrivacyDefault: ActivityPrivacy;
  notifyActivityReminders: boolean;
  notifyTrainingSummary: boolean;
}

interface UserPreferencesContextValue extends UserPreferences {
  loading: boolean;
  savePreferences: (values: Partial<UserPreferences>) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

const DEFAULT_PREFERENCES: UserPreferences = {
  languagePref: "pt-BR",
  measurementSystem: "metric",
  distanceUnit: "km",
  weightUnit: "kg",
  heightUnit: "cm",
  gpsAutoPause: true,
  gpsAccuracyMode: "balanced",
  activityPrivacyDefault: "public",
  notifyActivityReminders: true,
  notifyTrainingSummary: true,
};

interface RawProfile {
  language_pref?: string | null;
  measurement_system?: string | null;
  gps_auto_pause?: boolean | null;
  activity_privacy_default?: string | null;
}

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("language_pref, measurement_system, gps_auto_pause, activity_privacy_default")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar preferências do usuário", error);
          return;
        }

        const raw = (data || {}) as RawProfile;

        setState({
          languagePref: raw.language_pref ?? DEFAULT_PREFERENCES.languagePref,
          measurementSystem: (raw.measurement_system as MeasurementSystem) ?? DEFAULT_PREFERENCES.measurementSystem,
          distanceUnit: DEFAULT_PREFERENCES.distanceUnit,
          weightUnit: DEFAULT_PREFERENCES.weightUnit,
          heightUnit: DEFAULT_PREFERENCES.heightUnit,
          gpsAutoPause: raw.gps_auto_pause ?? DEFAULT_PREFERENCES.gpsAutoPause,
          gpsAccuracyMode: DEFAULT_PREFERENCES.gpsAccuracyMode,
          activityPrivacyDefault:
            (raw.activity_privacy_default as ActivityPrivacy) ?? DEFAULT_PREFERENCES.activityPrivacyDefault,
          notifyActivityReminders: DEFAULT_PREFERENCES.notifyActivityReminders,
          notifyTrainingSummary: DEFAULT_PREFERENCES.notifyTrainingSummary,
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const savePreferences = async (values: Partial<UserPreferences>) => {
    if (!user) return;

    const previous = state;
    const next: UserPreferences = { ...state, ...values };

    // Optimistic update
    setState(next);

    const { error } = await supabase
      .from("profiles")
      .update({
        language_pref: next.languagePref,
        measurement_system: next.measurementSystem,
        gps_auto_pause: next.gpsAutoPause,
        activity_privacy_default: next.activityPrivacyDefault,
      })
      .eq("id", user.id);

    if (error) {
      // Rollback and show error toast
      setState(previous);
      toast({
        title: "Erro ao salvar preferências",
        description: "Não foi possível atualizar suas preferências agora. Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ ...state, loading, savePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences deve ser usado dentro de UserPreferencesProvider");
  return ctx;
};
