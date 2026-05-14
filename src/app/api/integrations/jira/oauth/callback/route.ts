import { type NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import {
  exchangeCodeForTokens,
  fetchAccessibleResources,
  getRedirectUri,
} from "@/lib/oauth/atlassian";
import { saveOAuthCredentials } from "@/lib/integration-credentials";

const STATE_COOKIE = "pp_oauth_state_jira";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const settingsUrl = new URL("/settings", url.origin);

  if (error) {
    settingsUrl.searchParams.set("oauth_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    settingsUrl.searchParams.set("oauth_error", "invalid_state");
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: getRedirectUri(url.origin),
    });

    // Find the first accessible Jira workspace; for multi-workspace users we
    // pick the first one and let them switch via the project selector.
    const resources = await fetchAccessibleResources(tokens.access_token);
    const jiraResource =
      resources.find((r) => r.scopes.some((s) => s.includes("jira"))) || resources[0];

    if (!jiraResource) {
      settingsUrl.searchParams.set("oauth_error", "no_jira_workspace");
      const res = NextResponse.redirect(settingsUrl);
      res.cookies.delete(STATE_COOKIE);
      return res;
    }

    await saveOAuthCredentials(user.id, "jira", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      extra: {
        cloudId: jiraResource.id,
        workspaceUrl: jiraResource.url,
        workspaceName: jiraResource.name,
      },
    });

    settingsUrl.searchParams.set("connected", "jira");
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e) {
    settingsUrl.searchParams.set(
      "oauth_error",
      e instanceof Error ? e.message : "unknown_error"
    );
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }
}
