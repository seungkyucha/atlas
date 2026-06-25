import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const isGoogleConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const providers: NextAuthOptions["providers"] = [];

if (isGoogleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
} else {
  providers.push(
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        return { id: "guest", name: "Guest", email: "guest@atlas.local" };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET ?? "atlas-dev-secret-change-me",
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, upsert the user record and attach role. First user = owner.
      if (user?.email) {
        try {
          const email = user.email.toLowerCase();
          const adminEmails = (process.env.ADMIN_EMAILS ?? "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          // First real (non-guest) user, or any ADMIN_EMAILS match, becomes owner.
          const realUsers = await prisma.appUser.count({
            where: { email: { not: "guest@atlas.local" } },
          });
          let role = "translator";
          if (adminEmails.includes(email)) role = "owner";
          else if (email === "guest@atlas.local") role = "owner";
          else if (realUsers === 0) role = "owner";

          const u = await prisma.appUser.upsert({
            where: { email: user.email },
            // never downgrade an existing user's role on subsequent logins
            update: { name: user.name ?? undefined, image: user.image ?? undefined, lastLogin: new Date() },
            create: {
              email: user.email,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              role,
            },
          });
          token.role = u.role;
          token.uid = u.id;
        } catch {
          token.role = token.role ?? "translator";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = (token.role as string) ?? "translator";
        (session.user as { id?: string }).id = (token.uid as string) ?? "";
      }
      return session;
    },
  },
};
