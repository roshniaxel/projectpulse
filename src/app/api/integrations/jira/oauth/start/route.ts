import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireDbUser } from "@/lib/auth-helpers";
import {
  buildAuthorizeUrl,
  isAtlassianOAuthConfigured,
  getRedirectUri,
} from "@/lib/oauth/atlassian";

const STATE_COOKIE = "pp_oauth_state_jira";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  if (!isAtlassianOAuthConfigured()) {
    return Response.json(
      {
        error:
          "Atlassian OAuth is not configured. Set ATLASSIAN_CLIENT_ID and ATLASSIAN_CLIENT_SECRET in .env",
      },
      { status: 500 }
    );
  }

  const origin = request.nextUrl.origin;
  const state = crypto.randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl({
    state,
    redirectUri: getRedirectUri(origin),
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  return response;
}
