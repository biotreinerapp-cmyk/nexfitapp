import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export const usePwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice && !isStandalone);

    const dismissed = window.localStorage.getItem("biotreiner_install_banner_dismissed") === "true";

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Even if dismissed, we capture the prompt just in case user clicks button manually
      // but we don't show the banner automatically if dismissed.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone && !dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as any);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as any);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return; // For Android/Desktop

    // Safety check just in case
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        window.localStorage.setItem("biotreiner_install_banner_dismissed", "true");
      }
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Install prompt failed", err);
    }
  };

  const handleCloseBanner = () => {
    window.localStorage.setItem("biotreiner_install_banner_dismissed", "true");
    setShowInstallBanner(false);
  };

  return {
    showInstallBanner,
    handleInstallClick,
    handleCloseBanner,
    isIOS,
    deferredPrompt
  };
};
