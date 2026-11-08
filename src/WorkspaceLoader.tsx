import { useEffect, useRef, useSyncExternalStore } from "react";
import { isLoading, subscribeLoading } from "./loading";

export function WorkspaceLoader() {
  return <div className="workspace-loader" role="status" aria-label="Loading HishabKhata">
    <svg className="payment-loader" viewBox="0 0 160 160" width="150" height="150" aria-hidden="true">
      <circle cx="80" cy="80" r="64" fill="#e8e7ff" />
      <rect x="37" y="75" width="85" height="42" rx="9" fill="#433ab4" />
      <g className="payment-loader-coin">
        <circle cx="80" cy="63" r="18" fill="#ffd477" stroke="#e7a843" strokeWidth="2" />
        <text x="80" y="69" textAnchor="middle" fill="#754917" fontSize="19" fontWeight="700">৳</text>
      </g>
      <rect x="37" y="84" width="85" height="40" rx="9" fill="#6655d9" />
      <path d="M42 92h49" stroke="#a69bf3" strokeWidth="2" strokeLinecap="round" />
      <rect x="97" y="96" width="29" height="17" rx="5" fill="#3c328f" />
      <circle cx="105" cy="104.5" r="2.5" fill="#e8e7ff" />
    </svg>
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
