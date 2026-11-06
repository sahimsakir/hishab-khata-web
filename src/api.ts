const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
let csrf: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
async function csrfToken() {
  const r = await fetch(base + "/api/auth/csrf", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!r.ok)
    throw new ApiError("Could not initialize the secure session.", r.status);
  csrf = (await r.json()).csrf_token as string;
  return csrf;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (!["GET", "HEAD"].includes(method))
    headers["X-CSRF-TOKEN"] = csrf ?? (await csrfToken());
  const r = await fetch(base + "/api" + path, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 419 && retry) {
    csrf = null;
    return api<T>(path, method, body, false);
  }
  const data = await r
    .json()
    .catch(() => ({ message: "The server returned an unexpected response." }));
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event("hishabkhata:unauthorized"));
    throw new ApiError(
      Object.values(data.errors ?? {})
        .flat()
        .join(" ") ||
        data.message ||
        "Request failed.",
      r.status,
      data.errors,
    );
  }
  if (path.startsWith("/auth/") && method === "POST") csrf = null;
  return data as T;
}
export const googleLogin = () => {
  window.location.assign(
    import.meta.env.VITE_GOOGLE_AUTH_URL || base + "/api/auth/google/redirect",
  );
};
export const googleLink = () => {
  window.location.assign(
    import.meta.env.VITE_GOOGLE_LINK_URL || base + "/api/auth/google/link",
  );
};
