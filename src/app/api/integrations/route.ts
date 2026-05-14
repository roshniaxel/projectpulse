import { requireDbUser } from "@/lib/auth-helpers";
import { listUserConnections } from "@/lib/integration-credentials";

export async function GET() {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const connections = await listUserConnections(user.id);
  return Response.json({ connections });
}
