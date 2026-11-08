import { useEffect, useRef, useSyncExternalStore } from "react";
import { isLoading, subscribeLoading } from "./loading";

export function WorkspaceLoader() {
  return <div className="workspace-loader" role="status" aria-label="Loading HishabKhata">
    <div className="workspace-loader-mark" aria-hidden="true">
      <img src="/icons/icon-192-v2.png" alt="" width={72} height={72} />
    </div>
    <strong aria-hidden="true">HishabKhata</strong>
    <div className="workspace-loader-progress" aria-hidden="true" />
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
