import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe NextAuth instance for the middleware. Mounts only the
// edge-compatible callbacks (authorized/jwt/session). The full instance
// in `@/lib/auth` adds the Node-only `signIn` callback for route handlers.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    // Exclude:
    //  - login page
    //  - NextAuth endpoints
    //  - Static assets
    //  - Internal-token endpoints (track-time.sh, /logtime — auth via
    //    X-Internal-Token + X-User-Email headers, not the session cookie)
    "/((?!login|api/auth|api/tool-sessions|api/time-entries|_next/static|_next/image|favicon.ico).*)",
  ],
};
