import "./connectedAccounts.css";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { googleLink } from "./api";
import type { User } from "./types";

export function ConnectedAccounts({user}:{user:User}) {
  const [params]=useSearchParams();
  const [connecting,setConnecting]=useState(false);
  const [error,setError]=useState("");
  const connected=user.google_connected === true;
  const available=user.google_login_available !== false;
  function connect() {
    setConnecting(true);setError("");
    try {googleLink();} catch {setConnecting(false);setError("Google could not be opened. Please try again.");}
  }
  return <div className="profile-settings">
    <section className="card profile-identity">
      <div className="profile-avatar" aria-hidden="true">{user.name.trim().slice(0,1).toUpperCase()}</div>
      <div><h2>{user.name}</h2><p className="profile-email">{user.email}</p></div>
    </section>
    <section className="card connected-accounts" aria-labelledby="connected-accounts-title">
      <h2 id="connected-accounts-title">Connected accounts</h2>
      <p>Manage the accounts you can use to sign in.</p>
      {params.get("google") === "connected" && connected && <div className="connection-success" role="status">Google account connected successfully.</div>}
      {(params.has("google_error") || error) && <div className="error" role="alert">{error || `Google could not be connected. Choose the Google account for ${user.email} and try again.`}</div>}
      <div className="provider-row">
        <span className="provider-icon" aria-hidden="true">G</span>
        <div className="provider-details"><h3>Google</h3>
          {connected ? <p className="profile-email">{user.google_email || user.email}</p> : <p>Sign in with your Google account.</p>}
        </div>
        <span className={"connection-badge " + (connected ? "is-connected" : "is-disconnected")}>
          {connected && <CheckCircle2 size={15} aria-hidden="true"/>}{connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <div className="provider-action">
        {connected ? <p className="connection-confirmation"><ShieldCheck size={18} aria-hidden="true"/>{available ? "Google sign-in is enabled for this account." : "Your Google account is linked. Google sign-in is temporarily unavailable."}</p> : <>
          <p>{available ? `Connect the Google account that uses ${user.email}.` : "Google account linking is not configured yet. Contact the app administrator."}</p>
          <button type="button" className="google-connect-button" disabled={connecting || !available} onClick={connect}>
            <span className="google-button-mark" aria-hidden="true">G</span>{connecting ? "Connecting…" : "Connect Google account"}
          </button>
        </>}
      </div>
    </section>
  </div>;
}
