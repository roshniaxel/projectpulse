import { prisma } from "./prisma";
import { getSessionUser } from "./auth-helpers";

// Tool sessions can be hit from two contexts:
//   1. The browser (NextAuth session cookie) — normal user actions.
//   2. The local `track-time.sh` shell script — has no cookie, so it sends
//      X-Internal-Token + X-User-Email headers.
// Resolve the user from whichever auth path is present.
export async function resolveToolSessionUser(
  request: Request
): Promise<{ userId: string; email: string } | null> {
  const internalToken = request.headers.get("x-internal-token");
  const headerEmail = request.headers.get("x-user-email");
  const expected = process.env.INTERNAL_API_TOKEN;

  if (internalToken && expected && headerEmail && internalToken === expected) {
    const dbUser = await prisma.user.upsert({
      where: { email: headerEmail },
      update: {},
      create: { email: headerEmail },
    });
    return { userId: dbUser.id, email: dbUser.email! };
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) return null;

  const dbUser = await prisma.user.upsert({
    where: { email: sessionUser.email },
    update: { name: sessionUser.name, image: sessionUser.image },
    create: {
      email: sessionUser.email,
      name: sessionUser.name,
      image: sessionUser.image,
    },
  });
  return { userId: dbUser.id, email: dbUser.email! };
}
