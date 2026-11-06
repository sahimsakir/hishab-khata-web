import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, googleLogin } from "./api";
import type { User } from "./types";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, setUser: () => {}, refresh: async () => {} });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      const r = await api<{ user: User }>("/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const unauthorized = () => setUser(null);
    window.addEventListener("hishabkhata:unauthorized", unauthorized);
    return () => window.removeEventListener("hishabkhata:unauthorized", unauthorized);
  }, []);
  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, setUser } = useAuth(),
    nav = useNavigate(),
    [params] = useSearchParams(),
    [error, setError] = useState(
      params.has("google_error")
        ? "Google sign-in could not be completed. If you already registered with a password, sign in below and connect Google from your profile."
        : "",
    ),
    [busy, setBusy] = useState(false);
  if (loading) return <div className="loading">Opening your workspace…</div>;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="authlayout">
      <section className="authstory">
        <div className="brand">
          <b>৳</b>HishabKhata<span>.</span>
        </div>
        <div>
          <div className="eyebrow">EVERY PAISA HAS A PLACE</div>
          <h1>
            Less money worry.
            <br />
            More living.
          </h1>
          <p>
            From the smallest purchase to your biggest goal.
            <br />
            Give every taka a little clarity.
          </p>
          <div className="authmini">
            <span>ONE CONNECTED PICTURE</span>
            <strong>Earn. Spend. Save. Grow.</strong>
            <p>
              Your income, accounts, loans, cards, and savings,
              <br />
              organized around your life.
            </p>
          </div>
        </div>
        <small>Your private workspace · BDT · Made for everyday life</small>
      </section>
      <section className="authform">
        <div>
          <div className="eyebrow">WELCOME TO HISHABKHATA</div>
          <h2>
            {register
              ? "A fresh start for your finances."
              : "Your money story continues."}
          </h2>
          <p>
            {register
              ? "Create your personal money workspace."
              : "Sign in to see everything in its place."}
          </p>
          <button className="google" onClick={googleLogin}>
            <span className="googleG">G</span> Continue with Google
          </button>
          <div className="divider">
            <span>or use your email</span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const data = Object.fromEntries(new FormData(e.currentTarget));
                const r = await api<{ user: User }>(
                  "/auth/" + (register ? "register" : "login"),
                  "POST",
                  data,
                );
                setUser(r.user);
                nav("/");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Sahim Sakir"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={register ? 8 : undefined}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Enter your password"
              />
            </label>
            {register && (
              <label>
                Confirm password
                <input
                  name="password_confirmation"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create my workspace"
                  : "Sign in"}
            </button>
          </form>
          <p className="authswitch">
            {register ? "Already have an account?" : "New to HishabKhata?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
export function Callback() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const linked = params.get("linked") === "1";
  useEffect(() => {
    void refresh().then(() => nav(linked ? "/profile?google=connected" : "/", { replace: true }));
  }, [linked]);
  return <div className="loading">Completing Google sign-in…</div>;
}
