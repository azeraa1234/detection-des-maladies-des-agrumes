/**
 * api.ts — Typed API client for the FastAPI backend.
 *
 * All scan history operations now go through these functions
 * instead of reading/writing to localStorage.
 */

const BASE_URL = "/api";

// ── Types (mirrors the backend ScanOut / DetectionOut schemas) ───────────────

export interface ApiDetection {
  id: string;
  class: string;
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number]; // [cx, cy, w, h] normalized
}

export interface ApiScan {
  id: string;
  filename: string;
  thumbnail: string | null;
  model: "YOLOv8s" | "YOLOv12s";
  inferenceMs: number;
  date: string; // ISO 8601
  detections: ApiDetection[];
}

export interface SaveScanPayload {
  filename: string;
  thumbnail: string | null;
  model: string;
  inferenceMs: number;
  detections: Array<{
    class: string;
    class_id: number;
    confidence: number;
    bbox: number[];
  }>;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Fetch all scans from the database (newest first).
 */
export async function fetchHistory(limit = 100): Promise<ApiScan[]> {
  const res = await fetch(`${BASE_URL}/scans?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Save a completed scan and its detections to the database.
 */
export async function saveScan(payload: SaveScanPayload): Promise<ApiScan> {
  const res = await fetch(`${BASE_URL}/scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to save scan: ${res.status} — ${detail}`);
  }
  return res.json();
}

/**
 * Delete a scan from the database by ID.
 */
export async function deleteScan(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/scans/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete scan: ${res.status}`);
  }
}

/**
 * Send a message to the chatbot.
 */
export async function sendChatMessage(message: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.status}`);
  }
  const data = await res.json();
  return data.reply;
}
