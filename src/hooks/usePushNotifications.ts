import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const urlBase64ToUint8Array = useCallback((base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }, []);

    const subscribeUser = useCallback(async () => {
        if (!user || !VAPID_PUBLIC_KEY || typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed to avoid unnecessary requests/browser limits
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                setSubscription(existingSubscription);
                return;
            }

            // Request permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== "granted") {
                return; // User denied permission, just exit
            }

            // Subscribe
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            setSubscription(sub);
            console.log("[Push] Subscribed successfully.");
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message?.includes('registration limit')) {
                // Silent catch for browser push registration limits
                console.warn("[Push] Registration limit/AbortError - skipped (browser protection).");
                return;
            }
            console.error("[Push] Error subscribing:", error);
        }
    }, [user, urlBase64ToUint8Array]);

    const unsubscribeUser = useCallback(async () => {
        try {
            if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                await sub.unsubscribe();
                setSubscription(null);
            }
        } catch (error) {
            console.error("[Push] Error unsubscribing:", error);
        }
    }, []);

    return {
        permission,
        subscription,
        subscribeUser,
        unsubscribeUser
    };
}
