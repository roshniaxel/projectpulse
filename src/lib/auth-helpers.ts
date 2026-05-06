import { auth } from "./auth";

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

// Map user email to Jira display name for filtering
// roshni.upadhyay@axelerant.com → Roshni Upadhyay
export function emailToJiraUser(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
