import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardOutdoor = {
  id: string;
  image_url: string;
  image_path: string;
  link_url: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  updated_at: string;
  created_at: string;
};

const isOutdoorInSchedule = (outdoor: DashboardOutdoor, now: Date) => {
  const start = new Date(outdoor.starts_at);
  const end = outdoor.ends_at ? new Date(outdoor.ends_at) : null;
  return start.getTime() <= now.getTime() && (!end || end.getTime() >= now.getTime());
};

export const useDashboardOutdoor = () => {
  const [outdoors, setOutdoors] = useState<DashboardOutdoor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const now = new Date();

      const { data, error } = await supabase
        .from("dashboard_outdoors")
        .select("id, image_url, image_path, link_url, is_active, starts_at, ends_at, updated_at, created_at")
        .eq("is_active", true)
        .order("starts_at", { ascending: false })
        .limit(20);

      if (cancelled) return;

      if (error) {
        setError(error as any);
        setOutdoors([]);
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as DashboardOutdoor[])
        .filter((o) => isOutdoorInSchedule(o, now))
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

      setOutdoors(rows);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Backwards-compatible: mantém "outdoor" como o primeiro da lista.
  const outdoor = outdoors[0] ?? null;

  const hasOutdoor = useMemo(() => Boolean(outdoor?.image_url), [outdoor]);

  return { outdoor, outdoors, hasOutdoor, loading, error };
};
