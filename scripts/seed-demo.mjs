// Seed demo TimeEntry rows for the current user so the dashboard, /tools,
// and /timesheet look populated for a hackathon demo.
//
// Usage:
//   node scripts/seed-demo.mjs                       # uses .env's PROJECTPULSE_USER_EMAIL
//   node scripts/seed-demo.mjs you@axelerant.com     # explicit email
//   node scripts/seed-demo.mjs --clear               # wipe seeded rows first
//
// Seeded entries are tagged with description prefix "[demo]" so --clear can
// remove only seed data and leave real entries (manual / track-time.sh) alone.

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

// Tiny .env reader so we can run before any framework loads dotenv.
function readEnv() {
  const out = {};
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    // No .env — fall back to process.env
  }
  return out;
}
const env = { ...readEnv(), ...process.env };
if (!process.env.DATABASE_URL && env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;

const args = process.argv.slice(2);
const clear = args.includes("--clear");
const explicitEmail = args.find((a) => !a.startsWith("--"));
const email = explicitEmail || env.PROJECTPULSE_USER_EMAIL;

if (!email) {
  console.error(
    "✖ No email. Pass it as an argument or set PROJECTPULSE_USER_EMAIL in .env."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `✖ No User row for ${email}. Sign in once at http://localhost:3000 first.`
    );
    process.exit(1);
  }

  if (clear) {
    const { count } = await prisma.timeEntry.deleteMany({
      where: {
        userId: user.id,
        description: { startsWith: "[demo]" },
      },
    });
    console.log(`✓ Cleared ${count} previously-seeded TimeEntry rows.`);
    return;
  }

  // 9 entries spread across the last 7 days, varied source + status + project.
  const entries = [
    // Today
    {
      source: "claude_code",
      ticketKey: "RGU-224",
      description: "[demo] Wired up Settings dialog for Slack OAuth",
      startedAt: daysAgo(0, 9, 15),
      durationMin: 47,
      status: "draft",
    },
    {
      source: "manual",
      ticketKey: "RGU-224",
      description: "[demo] Reviewed PR feedback, drafted response",
      startedAt: daysAgo(0, 14, 0),
      durationMin: 25,
      status: "draft",
    },
    {
      source: "google_calendar",
      ticketKey: null,
      description: "[demo] Standup",
      startedAt: daysAgo(0, 10, 30),
      durationMin: 15,
      status: "approved",
    },
    // Yesterday
    {
      source: "claude_code",
      ticketKey: "RGU-217",
      description: "[demo] Built JQL search migration to /search/jql",
      startedAt: daysAgo(1, 11, 0),
      durationMin: 92,
      status: "logged",
    },
    {
      source: "zoom",
      ticketKey: "RGU-217",
      description: "[demo] Architecture sync with @amol",
      startedAt: daysAgo(1, 15, 0),
      durationMin: 30,
      status: "logged",
    },
    // 2 days ago
    {
      source: "manual",
      ticketKey: "RGU-201",
      description: "[demo] Schema design for UserIntegration table",
      startedAt: daysAgo(2, 10, 0),
      durationMin: 60,
      status: "logged",
    },
    {
      source: "google_calendar",
      ticketKey: null,
      description: "[demo] 1:1 with EM",
      startedAt: daysAgo(2, 16, 0),
      durationMin: 30,
      status: "approved",
    },
    // 4 days ago
    {
      source: "claude_code",
      ticketKey: "RGU-198",
      description: "[demo] AES-256-GCM crypto helper + key derivation",
      startedAt: daysAgo(4, 13, 30),
      durationMin: 108,
      status: "logged",
    },
    // 6 days ago
    {
      source: "manual",
      ticketKey: "RGU-198",
      description: "[demo] Threat-modeled cred storage; picked SHA-256(secret)",
      startedAt: daysAgo(6, 11, 0),
      durationMin: 40,
      status: "approved",
    },
  ];

  let inserted = 0;
  for (const e of entries) {
    const endedAt = addMinutes(e.startedAt, e.durationMin);
    await prisma.timeEntry.create({
      data: {
        userId: user.id,
        source: e.source,
        ticketKey: e.ticketKey,
        description: e.description,
        startedAt: e.startedAt,
        endedAt,
        durationSec: e.durationMin * 60,
        status: e.status,
      },
    });
    inserted++;
  }
  console.log(`✓ Seeded ${inserted} demo TimeEntry rows for ${email}.`);
  console.log("  Reload http://localhost:3000 — Pending Timesheet should populate.");
  console.log("  To remove later: node scripts/seed-demo.mjs --clear");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
