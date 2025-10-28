// src/lib/api/users.ts
export type PublicUser = {
    _id: string;
    name: string;
    username: string;
    avatarURL?: string;
    district?: string;
  };
  
  const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4200/api/v1";
  
  async function authFetch(input: string, init: RequestInit = {}) {
    const { getAuth } = await import("firebase/auth");
    const t = await getAuth().currentUser?.getIdToken(true);
    if (!t) throw new Error("Not authenticated");
    return fetch(`${BASE}${input}`, {
      ...init,
      headers: {
        "Authorization": `Bearer ${t}`,
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
  }
  
  export async function searchUsers(params: { email?: string; username?: string; q?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (params.email) qs.set("email", params.email);
    if (params.username) qs.set("username", params.username);
    if (params.q) qs.set("q", params.q);
    if (params.limit) qs.set("limit", String(params.limit));
    const r = await authFetch(`/users/search?${qs.toString()}`);
    if (!r.ok) throw new Error(`search failed ${r.status}`);
    const j = await r.json();
    return j.users as PublicUser[];
  }
  
  export async function checkAvailability(params: { username?: string; email?: string }) {
    const qs = new URLSearchParams();
    if (params.username) qs.set("username", params.username);
    if (params.email) qs.set("email", params.email);
    const r = await authFetch(`/users/availability?${qs.toString()}`);
    if (!r.ok) throw new Error(`availability failed ${r.status}`);
    return (await r.json()).availability as { usernameAvailable?: boolean; emailAvailable?: boolean };
  }
  
  export async function updateMe(uid: string, patch: Partial<{name:string;username:string;bio:string;district:string;avatarURL:string;phone:string;email:string;}>) {
    const r = await authFetch(`/users/${uid}`, { method: "PUT", body: JSON.stringify(patch) });
    if (r.status === 409) {
      const j = await r.json();
      if (j?.error === "email_taken") throw new Error("EMAIL_TAKEN");
      if (j?.error === "username_taken") throw new Error("USERNAME_TAKEN");
    }
    if (!r.ok) throw new Error(`update failed ${r.status}`);
    return (await r.json()).user as PublicUser;
  }
  