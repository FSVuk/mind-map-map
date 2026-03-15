import type { AppState } from "@/types";
import { createDefaultState } from "./store";

/**
 * Storage backend abstraction.
 * - If DATABASE_URL is set: uses Neon Postgres (JSONB row)
 * - Otherwise: falls back to a local JSON file (for dev without DB)
 */

const usePostgres = !!process.env.DATABASE_URL;

// ── Neon Postgres backend ─────────────────────────────────────────

function getSql() {
  // Dynamic import avoids build errors when @neondatabase/serverless isn't needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

let tableReady = false;

async function ensureTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  tableReady = true;
}

async function pgLoad(): Promise<AppState> {
  const sql = getSql();
  if (!tableReady) await ensureTable();
  const rows = await sql`SELECT data FROM app_state WHERE id = 'main'`;
  if (rows.length === 0) return createDefaultState();
  return rows[0].data as AppState;
}

async function pgSave(state: AppState): Promise<void> {
  const sql = getSql();
  if (!tableReady) await ensureTable();
  await sql`
    INSERT INTO app_state (id, data, updated_at)
    VALUES ('main', ${JSON.stringify(state)}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET data = ${JSON.stringify(state)}::jsonb, updated_at = NOW()
  `;
}

// ── File backend (local dev) ──────────────────────────────────────

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "app-state.json");

function fileLoad(): AppState {
  try {
    if (!fs.existsSync(STATE_FILE)) return createDefaultState();
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw) as AppState;
  } catch {
    return createDefaultState();
  }
}

function fileSave(state: AppState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

// ── Public API ────────────────────────────────────────────────────

export async function loadAppState(): Promise<AppState> {
  if (usePostgres) return pgLoad();
  return fileLoad();
}

export async function saveAppState(state: AppState): Promise<void> {
  if (usePostgres) return pgSave(state);
  fileSave(state);
}
