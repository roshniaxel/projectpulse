import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth-helpers";

export async function GET() {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  return Response.json({
    autoPushClaudeTime: user.autoPushClaudeTime,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      autoPushClaudeTime:
        typeof body.autoPushClaudeTime === "boolean"
          ? body.autoPushClaudeTime
          : user.autoPushClaudeTime,
    },
  });

  return Response.json({
    autoPushClaudeTime: updated.autoPushClaudeTime,
  });
}
