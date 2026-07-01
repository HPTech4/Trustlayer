import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b px-4 py-3 text-center text-sm" style={{ backgroundColor: "var(--risk-medium-bg)", borderColor: "var(--risk-medium-border)", color: "var(--risk-medium)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You’re offline. Some features may be unavailable until the connection returns.</span>
      </div>
    </div>
  );
}
