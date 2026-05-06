import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");

      // Allow auth API routes always
      if (isApiAuth) return true;

      // Redirect logged-in users away from login page
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      // Require login for all other pages
      if (!isLoggedIn && !isOnLogin) return false;

      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
