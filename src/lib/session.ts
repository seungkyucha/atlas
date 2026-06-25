import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { ROLE_RANK, ROLE_LABEL, rank, atLeast } from "./roles";

export { ROLE_RANK, ROLE_LABEL, rank, atLeast };

export interface SessionUser {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
}

export async function currentUser(): Promise<SessionUser | undefined> {
  const session = await getServerSession(authOptions);
  return session?.user as SessionUser | undefined;
}

/** Returns null if allowed, or a Response (403) if not. */
export async function guard(min: string): Promise<Response | null> {
  const u = await currentUser();
  if (!u || !atLeast(u.role, min)) {
    return new Response(JSON.stringify({ error: "권한이 없습니다." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
