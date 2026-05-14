// Atlassian OAuth 2.0 (3LO) helpers — see
// https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/

// Atlassian supports two scope models. Pick the one that matches what you
// enabled in the developer console (developer.atlassian.com → Permissions →
// Jira API → Classic OR Granular tab).
//
// Atlassian rejects the OAuth request if you ask for a scope your app hasn't
// been granted, so the arrays here must match the console exactly.

const CLASSIC_SCOPES = [
  "read:jira-work",
  "read:jira-user",
  "write:jira-work",
  "offline_access",
];

const GRANULAR_SCOPES = [
  "read:project:jira",
  "read:issue:jira",
  "read:issue-meta:jira",
  "read:user:jira",
  "read:issue.time-tracking:jira",
  "read:issue.worklog:jira",
  "write:issue.worklog:jira",
  "write:issue.time-tracking:jira",
  "offline_access",
];

// Toggle via env: ATLASSIAN_SCOPE_MODE=granular (defaults to classic)
export const ATLASSIAN_SCOPES =
  process.env.ATLASSIAN_SCOPE_MODE === "granular"
    ? GRANULAR_SCOPES
    : CLASSIC_SCOPES;

export function getOAuthEnv() {
  const clientId = process.env.ATLASSIAN_CLIENT_ID || "";
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}

export function isAtlassianOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getOAuthEnv();
  return !!(clientId && clientSecret);
}

export function buildAuthorizeUrl(opts: {
  state: string;
  redirectUri: string;
}): string {
  const { clientId } = getOAuthEnv();
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId,
    scope: ATLASSIAN_SCOPES.join(" "),
    redirect_uri: opts.redirectUri,
    state: opts.state,
    response_type: "code",
    prompt: "consent",
  });
  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

export type AtlassianTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export async function exchangeCodeForTokens(opts: {
  code: string;
  redirectUri: string;
}): Promise<AtlassianTokenResponse> {
  const { clientId, clientSecret } = getOAuthEnv();
  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AtlassianTokenResponse> {
  const { clientId, clientSecret } = getOAuthEnv();
  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type AccessibleResource = {
  id: string; // this is the cloudId
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
};

export async function fetchAccessibleResources(
  accessToken: string
): Promise<AccessibleResource[]> {
  const res = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch accessible resources: ${res.status} ${await res.text()}`
    );
  }
  return res.json();
}

export function getRedirectUri(origin: string): string {
  return `${origin}/api/integrations/jira/oauth/callback`;
}
