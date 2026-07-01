import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  async function handleInstall() {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-1000 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border p-4 shadow-lg" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--accent-light)" }}>
            <Download className="h-4 w-4" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Install TrustLayer
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Keep it on your phone for faster access and a more app-like experience.
            </p>
          </div>
        </div>
        <button onClick={() => setVisible(false)} className="rounded-full p-1" style={{ color: "var(--muted-foreground)" }}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Install
        </button>
        <button onClick={() => setVisible(false)} className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: "var(--accent-light)", color: "var(--primary)" }}>
          Later
        </button>
      </div>
    </div>
  );
}
