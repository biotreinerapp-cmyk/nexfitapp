import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProfileContextValue {
    nome: string | null;
    avatarUrl: string | null;
    pesoKg: number | null;
    alturaCm: number | null;
    bio: string | null;
    updateProfileCache: (nome: string | null, avatarUrl: string | null, pesoKg?: number | null, alturaCm?: number | null, bio?: string | null) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const CACHE_KEY = "nexfit_profile_cache";

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();

    // 1. Initial State from LocalStorage (Instant UI)
    const [nome, setNome] = useState<string | null>(() => {
        try {
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) return JSON.parse(cached).nome || null;
            }
        } catch (e) { console.error(e) }
        return null;
    });

    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
        try {
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) return JSON.parse(cached).avatar_url || null;
            }
        } catch (e) { console.error(e) }
        return null;
    });

    const [pesoKg, setPesoKg] = useState<number | null>(() => {
        try {
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) return JSON.parse(cached).peso_kg || null;
            }
        } catch (e) { console.error(e) }
        return null;
    });

    const [alturaCm, setAlturaCm] = useState<number | null>(() => {
        try {
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) return JSON.parse(cached).altura_cm || null;
            }
        } catch (e) { console.error(e) }
        return null;
    });

    const [bio, setBio] = useState<string | null>(() => {
        try {
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) return JSON.parse(cached).bio || null;
            }
        } catch (e) { console.error(e) }
        return null;
    });

    const updateProfileCache = (newNome: string | null, newAvatarUrl: string | null, newPesoKg?: number | null, newAlturaCm?: number | null, newBio?: string | null) => {
        setNome(newNome);
        setAvatarUrl(newAvatarUrl);
        if (newPesoKg !== undefined) setPesoKg(newPesoKg);
        if (newAlturaCm !== undefined) setAlturaCm(newAlturaCm);
        if (newBio !== undefined) setBio(newBio);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            nome: newNome,
            avatar_url: newAvatarUrl,
            peso_kg: newPesoKg !== undefined ? newPesoKg : pesoKg,
            altura_cm: newAlturaCm !== undefined ? newAlturaCm : alturaCm,
            bio: newBio !== undefined ? newBio : bio
        }));
    };

    // 2. Fetch fresh data in background if logged in
    useEffect(() => {
        if (!user) {
            if (typeof window !== "undefined") {
                localStorage.removeItem(CACHE_KEY); // Clean up on logout
                setNome(null);
                setAvatarUrl(null);
                setPesoKg(null);
                setAlturaCm(null);
                setBio(null);
            }
            return;
        }

        let isMounted = true;

        // SWR (Stale-While-Revalidate) Pattern
        supabase.from("profiles")
            .select("nome, avatar_url, peso_kg, altura_cm, bio")
            .eq("id", user.id)
            .single()
            .then(({ data, error }) => {
                if (!error && data && isMounted) {
                    // Only update if it actually changed to prevent re-renders
                    if (data.nome !== nome || data.avatar_url !== avatarUrl || data.peso_kg !== pesoKg || data.altura_cm !== alturaCm || data.bio !== bio) {
                        updateProfileCache(data.nome, data.avatar_url, data.peso_kg, data.altura_cm, data.bio);
                    }
                }
            });

        return () => { isMounted = false; };
    }, [user?.id]); // Depend on user ID, not the whole user object

    return (
        <ProfileContext.Provider value={{ nome, avatarUrl, pesoKg, alturaCm, bio, updateProfileCache }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const ctx = useContext(ProfileContext);
    if (!ctx) throw new Error("useProfile deve ser usado dentro de ProfileProvider");
    return ctx;
};
