import { useEffect, useRef, useSyncExternalStore } from "react";
import { isLoading, subscribeLoading } from "./loading";

export function WorkspaceLoader() {
  return <div className="workspace-loader" role="status" aria-label="Loading HishabKhata">
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/icons/icon-192-v2.png" />
      <img src="/icons/payment-loader.gif" alt="" width={150} height={150} />
    </picture>
  </div>;
}

export function LoadingOverlay() {
  const active = useSyncExternalStore(subscribeLoading, isLoading, () => false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (active) {
      if (!element.open) element.showModal();
      return;
    }
    if (!element.open) return;
    const timer = window.setTimeout(() => element.close(), 180);
    return () => window.clearTimeout(timer);
  }, [active]);

  return <dialog className="workspace-loading-overlay" ref={dialog}
    aria-label="Please wait" onCancel={event => event.preventDefault()}>
    <WorkspaceLoader />
  </dialog>;
}
