import { useEffect, useRef, useSyncExternalStore } from "react";
import { isLoading, subscribeLoading } from "./loading";

export function WorkspaceLoader() {
  return <div className="workspace-loader" role="status" aria-label="Loading HishabKhata">
    <svg className="payment-loader" viewBox="0 0 160 160" width="150" height="150" aria-hidden="true">
      <circle cx="80" cy="80" r="67" fill="#e1edff" />
      <circle className="payment-loader-pulse" cx="80" cy="80" r="66" fill="none" stroke="#9bb8ff" strokeWidth="2" />
      <g className="payment-loader-card">
        <g transform="rotate(10 76 72)">
          <rect x="29" y="47" width="94" height="58" rx="10" fill="#17386e" />
          <path d="M29 59h94v12H29z" fill="#244e90" />
          <rect x="41" y="62" width="16" height="12" rx="3" fill="#9fcaff" />
          <path d="M44 68h10m-5-4v8" stroke="#567cc3" strokeWidth="1.5" />
          <path d="M42 88h26" stroke="#a5bfff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="103" cy="88" r="5" fill="#8c7bff" />
          <circle cx="111" cy="88" r="5" fill="#62c5ff" />
        </g>
        <path d="m114 125-11-16-12-12a5 5 0 0 1 7-7l10 8-5-19a5 5 0 0 1 10-3l7 22 5-2c5-2 9 1 11 6l8 18-23 14z" fill="#ffb79f" />
        <path d="m114 125 27-14 11 22-27 15z" fill="#6f58d8" />
      </g>
      <g className="payment-loader-signal" fill="none" stroke="#6f58d8" strokeWidth="3" strokeLinecap="round">
        <path d="M112 32q9 1 14 9M116 24q13 2 20 14" />
      </g>
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
