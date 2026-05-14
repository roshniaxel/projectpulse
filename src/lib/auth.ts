import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";
import { encrypt } from "./crypto";

// Full NextAuth instance used by API route handlers (Node runtime).
// Adds the `signIn` callback that captures the user's Google tokens into
// our Prisma DB — that step needs the Node `crypto` module to encrypt
// the tokens, so it can't live in the edge-safe config.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        try {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: { name: user.name, image: user.image },
            create: { email: user.email, name: user.name, image: user.image },
          });

          const accessToken = account.access_token;
          const refreshToken = account.refresh_token;

          if (accessToken) {
            const meta: Record<string, string | number> = {};
            if (refreshToken) meta.refreshToken = refreshToken;
            if (account.expires_at) meta.expiresAt = account.expires_at;

            await prisma.userIntegration.upsert({
              where: {
                userId_source: { userId: dbUser.id, source: "google_calendar" },
              },
              update: {
                connected: true,
                accessToken: encrypt(accessToken),
                metadata: { enc: encrypt(JSON.stringify(meta)) },
                connectedAt: new Date(),
              },
              create: {
                userId: dbUser.id,
                source: "google_calendar",
                connected: true,
                accessToken: encrypt(accessToken),
                metadata: { enc: encrypt(JSON.stringify(meta)) },
                connectedAt: new Date(),
              },
            });
          }
        } catch {
          // Don't block sign-in if integration upsert fails.
        }
      }
      return true;
    },
  },
});
