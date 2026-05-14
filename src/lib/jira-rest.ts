// Shared helper for hitting Jira REST API on behalf of a user via OAuth.
// Handles bearer-token auth, the cloudId-based base URL, and 401 refresh.

import { getIntegrationCredentials, updateAccessToken } from "./integration-credentials";
import { refreshAccessToken } from "./oauth/atlassian";

export type JiraRestCreds = {
  accessToken: string;
  refreshToken: string;
  cloudId: string;
};

export async function loadJiraCreds(userId: string): Promise<JiraRestCreds | null> {
  const creds = await getIntegrationCredentials(userId, "jira");
  if (!creds?.accessToken || !creds?.refreshToken || !creds?.cloudId) return null;
  return {
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    cloudId: creds.cloudId,
  };
}

export async function jiraFetch(opts: {
  userId: string;
  creds: JiraRestCreds;
  path: string;
  init?: RequestInit;
}): Promise<Response> {
  const url = `https://api.atlassian.com/ex/jira/${opts.creds.cloudId}/rest/api/3${opts.path}`;
  const doFetch = (token: string) =>
    fetch(url, {
      ...opts.init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(opts.init?.headers || {}),
      },
    });

  let res = await doFetch(opts.creds.accessToken);
  if (res.status === 401) {
    try {
      const tokens = await refreshAccessToken(opts.creds.refreshToken);
      opts.creds.accessToken = tokens.access_token;
      if (tokens.refresh_token) opts.creds.refreshToken = tokens.refresh_token;
      await updateAccessToken(opts.userId, "jira", {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      });
      res = await doFetch(opts.creds.accessToken);
    } catch {
      // surface the original 401
    }
  }
  return res;
}
