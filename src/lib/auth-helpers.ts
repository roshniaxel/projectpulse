import { auth } from "./auth";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

// Map user email to Jira display name for filtering
// In production, this would come from the UserIntegration table
export function emailToJiraUser(email: string | null | undefined): string {
  if (!email) return "";
  // Extract name from email: roshni.upadhyay@axelerant.com → Roshni Upadhyay
  const local = email.split("@")[0];
  return local
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
