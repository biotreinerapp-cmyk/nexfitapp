import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export const usePwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    const dismissed = window.localStorage.getItem("biotreiner_install_banner_dismissed") === "true";

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (isStandalone || dismissed) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
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
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      window.localStorage.setItem("biotreiner_install_banner_dismissed", "true");
    }
    setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  const handleCloseBanner = () => {
    window.localStorage.setItem("biotreiner_install_banner_dismissed", "true");
    setShowInstallBanner(false);
  };

  return {
    showInstallBanner,
    handleInstallClick,
    handleCloseBanner,
  };
};
