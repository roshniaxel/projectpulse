import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";
import type { IntegrationSource } from "./types";

// Each integration declares the fields it needs. The connect dialog renders
// these inputs and POSTs them to /api/integrations/[source]. The connector
// factory pulls them back out via getIntegrationCredentials().
export type CredField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  required?: boolean;
  hint?: string;
};

// Jira uses Atlassian OAuth (3LO) — handled by /api/integrations/jira/oauth/*
// Google Calendar inherits scopes from the Google sign-in — auto-connected.
// Everything else uses the generic paste-token ConnectDialog below.
export const CREDENTIAL_SCHEMA: Partial<Record<IntegrationSource, CredField[]>> = {
  github: [
    {
      name: "apiToken",
      label: "Personal access token",
      type: "password",
      required: true,
      hint: "github.com → Settings → Developer settings → Personal access tokens",
    },
  ],
  slack: [
    {
      name: "botToken",
      label: "Bot token (xoxb-…)",
      type: "password",
      required: true,
      hint: "Slack app → OAuth & Permissions → Bot User OAuth Token",
    },
  ],
  zoom: [
    {
      name: "accountId",
      label: "Account ID",
      required: true,
      hint: "marketplace.zoom.us → your app → Account ID",
    },
    { name: "clientId", label: "Client ID", required: true },
    {
      name: "clientSecret",
      label: "Client secret",
      type: "password",
      required: true,
    },
  ],
  mavenlink: [
    {
      name: "accountId",
      label: "Account ID",
      required: true,
    },
    {
      name: "apiToken",
      label: "API token",
      type: "password",
      required: true,
      hint: "Kantata → Settings → API & Integrations",
    },
  ],
  granola: [
    {
      name: "webhookSecret",
      label: "Webhook secret",
      type: "password",
      required: true,
    },
  ],
};

// Only paste-token sources have a PRIMARY_FIELD. OAuth sources (jira,
// google_calendar) go through saveOAuthCredentials() below.
const PRIMARY_FIELD: Partial<Record<IntegrationSource, string>> = {
  github: "apiToken",
  slack: "botToken",
  zoom: "clientSecret",
  mavenlink: "apiToken",
  granola: "webhookSecret",
};

export type IntegrationCredentials = Record<string, string>;

export async function saveIntegrationCredentials(
  userId: string,
  source: IntegrationSource,
  values: IntegrationCredentials
): Promise<void> {
  const schema = CREDENTIAL_SCHEMA[source];
  const primaryField = PRIMARY_FIELD[source];
  if (!schema || !primaryField) {
    throw new Error(`${source} uses OAuth, not paste-token`);
  }
  for (const f of schema) {
    if (f.required && !values[f.name]?.trim()) {
      throw new Error(`Missing required field: ${f.label}`);
    }
  }

  const primary = values[primaryField] || "";
  const rest: Record<string, string> = {};
  for (const f of schema) {
    if (f.name !== primaryField) rest[f.name] = values[f.name] || "";
  }

  const encryptedMetadata = encrypt(JSON.stringify(rest));

  await prisma.userIntegration.upsert({
    where: { userId_source: { userId, source } },
    update: {
      connected: true,
      accessToken: encrypt(primary),
      metadata: { enc: encryptedMetadata },
      connectedAt: new Date(),
    },
    create: {
      userId,
      source,
      connected: true,
      accessToken: encrypt(primary),
      metadata: { enc: encryptedMetadata },
      connectedAt: new Date(),
    },
  });
}

export async function disconnectIntegration(
  userId: string,
  source: IntegrationSource
): Promise<void> {
  await prisma.userIntegration.deleteMany({
    where: { userId, source },
  });
}

export async function getIntegrationCredentials(
  userId: string,
  source: IntegrationSource
): Promise<IntegrationCredentials | null> {
  const row = await prisma.userIntegration.findUnique({
    where: { userId_source: { userId, source } },
  });
  if (!row || !row.connected || !row.accessToken) return null;

  const primaryValue = decrypt(row.accessToken);
  const metaEnc = (row.metadata as { enc?: string } | null)?.enc;
  const rest: Record<string, string> = metaEnc
    ? JSON.parse(decrypt(metaEnc))
    : {};

  // OAuth tools (jira, google_calendar) don't have an entry in PRIMARY_FIELD;
  // for them, the primary value is the OAuth access token.
  const primaryKey = PRIMARY_FIELD[source] || "accessToken";

  return {
    ...rest,
    [primaryKey]: primaryValue,
  };
}

export async function listUserConnections(userId: string) {
  const rows = await prisma.userIntegration.findMany({
    where: { userId, connected: true },
    select: { source: true, connectedAt: true },
  });
  return rows;
}

// Save OAuth tokens (Atlassian, Google, Slack, GitHub, etc.) — different shape
// than paste-token. accessToken is the bearer token; refreshToken + everything
// else go in metadata.enc.
export async function saveOAuthCredentials(
  userId: string,
  source: IntegrationSource,
  opts: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number; // unix seconds
    extra?: Record<string, string>; // e.g. cloudId, workspaceId
  }
): Promise<void> {
  const meta: Record<string, string | number> = { ...(opts.extra || {}) };
  if (opts.refreshToken) meta.refreshToken = opts.refreshToken;
  if (opts.expiresAt) meta.expiresAt = opts.expiresAt;

  const encryptedMetadata = encrypt(JSON.stringify(meta));

  await prisma.userIntegration.upsert({
    where: { userId_source: { userId, source } },
    update: {
      connected: true,
      accessToken: encrypt(opts.accessToken),
      metadata: { enc: encryptedMetadata },
      connectedAt: new Date(),
    },
    create: {
      userId,
      source,
      connected: true,
      accessToken: encrypt(opts.accessToken),
      metadata: { enc: encryptedMetadata },
      connectedAt: new Date(),
    },
  });
}

// Update only the access token + expiry (for refresh-token rotation).
// Leaves refreshToken + extras in metadata intact.
export async function updateAccessToken(
  userId: string,
  source: IntegrationSource,
  opts: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }
): Promise<void> {
  const existing = await prisma.userIntegration.findUnique({
    where: { userId_source: { userId, source } },
  });
  if (!existing) return;

  const metaEnc = (existing.metadata as { enc?: string } | null)?.enc;
  const rest: Record<string, string | number> = metaEnc
    ? JSON.parse(decrypt(metaEnc))
    : {};

  if (opts.refreshToken) rest.refreshToken = opts.refreshToken;
  if (opts.expiresAt) rest.expiresAt = opts.expiresAt;

  await prisma.userIntegration.update({
    where: { id: existing.id },
    data: {
      accessToken: encrypt(opts.accessToken),
      metadata: { enc: encrypt(JSON.stringify(rest)) },
    },
  });
}
