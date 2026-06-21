import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      console.log(`[Auth Middleware] path: ${pathname}, isLoggedIn: ${isLoggedIn}`);

      const isProtectedRoute =
        pathname.startsWith("/dashboard") || pathname.startsWith("/projects");

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        console.log(`[Auth Middleware] Redirecting to login because not logged in for path: ${pathname}`);
        return false; // Redirect unauthenticated users to login page
      }

      const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/register");

      if (isAuthRoute && isLoggedIn) {
        console.log(`[Auth Middleware] Redirecting to dashboard because already logged in for path: ${pathname}`);
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Populated in auth.ts
} satisfies NextAuthConfig;
