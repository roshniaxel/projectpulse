import { auth } from "./auth";
import { prisma } from "./prisma";
import { tzToday, tzDaysAgo } from "./date-range";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id || "",
    name: session.user.name || null,
    email: session.user.email || null,
    image: session.user.image || null,
  };
}

// Throws a 401 Response if no session. Use at the top of every API route.
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user?.email) {
    return {
      user: null,
      unauthorized: Response.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { user, unauthorized: null } as const;
}

// Ensure a User row exists for the current session and return its DB id.
// JWT sessions don't auto-create User rows, so we upsert lazily before any
// write that needs a foreign key to User.
export async function requireDbUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) {
    return {
      user: null,
      unauthorized: Response.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  const dbUser = await prisma.user.upsert({
    where: { email: sessionUser.email },
    update: { name: sessionUser.name, image: sessionUser.image },
    create: {
      email: sessionUser.email,
      name: sessionUser.name,
      image: sessionUser.image,
    },
  });
  return { user: dbUser, unauthorized: null } as const;
}

// Parse ?from= and ?to= query params into YYYY-MM-DD date strings.
// Defaults: from = 7 days ago, to = today (inclusive), both in the team's
// configured timezone (APP_TIMEZONE, default Asia/Kolkata).
export function parseDateRange(searchParams: URLSearchParams): {
  from: string;
  to: string;
} {
  const from = searchParams.get("from") || tzDaysAgo(7);
  const to = searchParams.get("to") || tzToday();
  return { from, to };
}
