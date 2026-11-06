import { useEffect, useState } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [help, setHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () => setInstalled(display.matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    const network = () => setOffline(!navigator.onLine);
    syncInstalled();
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    display.addEventListener("change", syncInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      display.removeEventListener("change", syncInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) { setHelp(true); return; }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { setHelp(true); }
    finally { setPrompt(null); }
  }

  return <>
    {offline && <div className="pwa-offline" role="status">You’re offline. Reconnect before saving changes.</div>}
    {!installed && !dismissed && (prompt || ios) && <div role="region" className="pwa-install" aria-label="Install HishabKhata">
      <button type="button" onClick={() => void install()}>Install HishabKhata</button>
      <button type="button" className="pwa-dismiss" aria-label="Dismiss install suggestion" onClick={() => setDismissed(true)}>×</button>
    </div>}
    {help && <div className="pwa-help" role="region" aria-label="Installation instructions">
      <strong>Add HishabKhata to your Home Screen</strong>
      <p>{ios ? "Open this site in Safari. Tap Share, then Add to Home Screen. Enable Open as Web App if shown, then tap Add." : "Open your browser menu and select Install app or Add to Home Screen."}</p>
      <button type="button" onClick={() => setHelp(false)}>Got it</button>
    </div>}
  </>;
}
