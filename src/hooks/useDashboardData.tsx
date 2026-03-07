import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withSchemaCacheRetry } from "@/lib/supabaseResilience";

export interface AtividadeSessao {
    id: string;
    tipo_atividade: string;
    status: string;
    iniciado_em: string;
    finalizado_em: string | null;
}

export interface WorkoutSessao {
    id: string;
    status: string;
    iniciado_em: string;
    finalizado_em: string | null;
    exercise_name: string;
}

export interface SessaoSemana {
    id: string;
    tipo_atividade: string;
    status: string;
    iniciado_em: string;
    finalizado_em: string | null;
    origem: "cardio" | "musculacao";
}

export interface DashboardData {
    sessaoAtual: AtividadeSessao | null;
    sessoesSemana: SessaoSemana[];
    consultas: any[];
    isLoading: boolean;
}

const CACHE_PREFIX = "biotreiner_dashboard_data_";

export const useDashboardData = (userId: string | undefined, isOnline: boolean) => {
    const [data, setData] = useState<DashboardData>({
        sessaoAtual: null,
        sessoesSemana: [],
        consultas: [],
        isLoading: true,
    });

    // 1. Load instantly from cache
    useEffect(() => {
        if (!userId) return;
        try {
            const cached = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                setData((prev) => ({ ...prev, ...parsed, isLoading: false }));
            }
        } catch (err) {
            console.warn("Failed to read dashboard cache", err);
        }
    }, [userId]);

    // 2. Fetch fresh data
    useEffect(() => {
        if (!userId || !isOnline) return;

        let isMounted = true;

        const fetchDados = async () => {
            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
            const agoraIso = new Date().toISOString();

            try {
                const [sessaoResp, semanaCardioResp, semanaMuscuResp, consultasResp] = await Promise.all([
                    (supabase as any)
                        .from("atividade_sessao")
                        .select("id, tipo_atividade, status, iniciado_em, finalizado_em")
                        .eq("user_id", userId)
                        .eq("status", "em_andamento")
                        .order("iniciado_em", { ascending: false })
                        .limit(1),
                    (supabase as any)
                        .from("atividade_sessao")
                        .select("id, tipo_atividade, status, iniciado_em, finalizado_em, confirmado")
                        .eq("user_id", userId)
                        .eq("status", "finalizada")
                        .eq("confirmado", true)
                        .gte("iniciado_em", seteDiasAtras.toISOString()),
                    (supabase as any)
                        .from("workout_sessions")
                        .select("id, status, iniciado_em, finalizado_em, exercise_name, confirmado")
                        .eq("user_id", userId)
                        .eq("status", "finalizada")
                        .eq("confirmado", true)
                        .gte("iniciado_em", seteDiasAtras.toISOString()),
                    withSchemaCacheRetry<any>(
                        () =>
                            (supabase as any)
                                .from("telemedicina_agendamentos")
                                .select("id, data_hora, status, profissional_nome, consulta_link")
                                .eq("aluno_id", userId)
                                .gte("data_hora", agoraIso)
                                .order("data_hora", { ascending: true })
                                .limit(5),
                        { label: "dashboard:consultas" },
                    ),
                ]);

                if (!isMounted) return;

                const cardio = (semanaCardioResp.data as AtividadeSessao[] | null) ?? [];
                const muscu = (semanaMuscuResp.data as WorkoutSessao[] | null) ?? [];

                const sessoesSemanaCombinadas: SessaoSemana[] = [
                    ...cardio.map((s) => ({
                        id: s.id,
                        tipo_atividade: s.tipo_atividade,
                        status: s.status,
                        iniciado_em: s.iniciado_em,
                        finalizado_em: s.finalizado_em,
                        origem: "cardio" as const,
                    })),
                    ...muscu.map((s) => ({
                        id: s.id,
                        tipo_atividade: "Musculação",
                        status: s.status,
                        iniciado_em: s.iniciado_em,
                        finalizado_em: s.finalizado_em,
                        origem: "musculacao" as const,
                    })),
                ].sort((a, b) => {
                    const aDate = new Date(a.finalizado_em || a.iniciado_em).getTime();
                    const bDate = new Date(b.finalizado_em || b.iniciado_em).getTime();
                    return bDate - aDate;
                });

                const newData = {
                    sessaoAtual: (sessaoResp.data as AtividadeSessao[] | null)?.[0] ?? null,
                    sessoesSemana: sessoesSemanaCombinadas,
                    consultas: (consultasResp.data as any) ?? [],
                };

                setData({ ...newData, isLoading: false });

                // Save to cache silently
                localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(newData));

            } catch (err) {
                console.error("Dashboard fetch error:", err);
                if (isMounted) {
                    setData(prev => ({ ...prev, isLoading: false }));
                }
            }
        };

        fetchDados();

        return () => {
            isMounted = false;
        };
    }, [userId, isOnline]);

    return data;
};
