export type DiseaseClass = "Black Spot" | "Greening" | "Canker" | "Fresh";

export interface Detection {
  class: DiseaseClass;
  classId: number;
  confidence: number;
  bbox: [number, number, number, number]; // normalized x_center, y_center, w, h
}

export const DISEASE_COLORS: Record<DiseaseClass, string> = {
  "Black Spot": "#EF4444",
  Greening: "#EAB308",
  Canker: "#F97316",
  Fresh: "#22C55E",
};

export const DEMO_DETECTIONS: Detection[] = [
  { class: "Black Spot", classId: 0, confidence: 0.94, bbox: [0.2, 0.245, 0.16, 0.13] },
  { class: "Canker", classId: 2, confidence: 0.87, bbox: [0.635, 0.515, 0.17, 0.19] },
  { class: "Fresh", classId: 3, confidence: 0.91, bbox: [0.49, 0.7, 0.38, 0.3] },
];

export const DEMO_IMAGE_URL =
  "https://images.unsplash.com/photo-1547514701-42782101795e?w=1200&q=80";

export interface HistoryEntry {
  id: string;
  filename: string;
  thumbnail: string | null;
  date: string; // ISO
  detections: Detection[];
  inferenceMs: number;
  model: "YOLOv8s" | "YOLOv12s";
}
// NOTE: loadHistory / saveHistory removed — history now lives in PostgreSQL.
// Use fetchHistory() and saveScan() from @/lib/api.ts instead.

// Dashboard mock data
export const KPI_DATA = {
  todayScans: 248,
  todayDelta: 12,
  infected: 187,
  infectedDelta: 8,
  healthy: 61,
  healthyDelta: 3,
  healthScore: 75.4,
};

export const TREND_DATA = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const healthy = 20 + Math.floor(Math.sin(i / 3) * 10 + Math.random() * 25 + i * 0.6);
  const infected = 30 + Math.floor(Math.cos(i / 4) * 15 + Math.random() * 30 + i * 0.4);
  return {
    date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    Sains: healthy,
    Infectés: infected,
  };
});

export const DISEASE_PIE = [
  { name: "Black Spot", value: 32, color: "#EF4444" },
  { name: "Greening", value: 18, color: "#EAB308" },
  { name: "Canker", value: 28, color: "#F97316" },
  { name: "Fresh", value: 22, color: "#22C55E" },
];

export const MODEL_COMPARISON = [
  { metric: "Précision", v8s: 0.905, v12s: 0.873 },
  { metric: "Rappel", v8s: 0.895, v12s: 0.874 },
  { metric: "mAP@50", v8s: 0.948, v12s: 0.933 },
  { metric: "Inférence (ms)", v8s: 4.7, v12s: 9.6, isLatency: true },
];

export const WEEKLY_TOP = [
  { name: "Black Spot", count: 142 },
  { name: "Canker", count: 118 },
  { name: "Greening", count: 76 },
  { name: "Mineuse", count: 41 },
  { name: "Cochenille", count: 22 },
];

// 12 weeks heatmap (84 days)
export const HEATMAP_DATA = Array.from({ length: 91 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (90 - i));
  return {
    date: d.toISOString().slice(0, 10),
    count: Math.floor(Math.random() * 18),
  };
});

// Countermeasures (DSS)
export interface Alert {
  level: "critical" | "warning" | "success";
  icon: string;
  title: string;
  message: string;
}

export function buildAlerts(detections: Detection[]): Alert[] {
  const classes = new Set(detections.map((d) => d.class));
  const alerts: Alert[] = [];
  if (classes.has("Greening")) {
    alerts.push({
      level: "critical",
      icon: "🚨",
      title: "Alerte Critique : Greening détecté",
      message:
        "Maladie incurable et très contagieuse. Arrachez et brûlez immédiatement les arbres infectés. Traitez contre le psylle asiatique (Diaphorina citri).",
    });
  }
  if (classes.has("Canker")) {
    alerts.push({
      level: "warning",
      icon: "⚠️",
      title: "Attention : Chancre Citrique",
      message:
        "Maladie bactérienne. Taillez et détruisez les branches infectées par temps sec. Appliquez des bactéricides à base de cuivre.",
    });
  }
  if (classes.has("Black Spot")) {
    alerts.push({
      level: "warning",
      icon: "🟠",
      title: "Attention : Tache Noire",
      message:
        "Maladie fongique. Ramassez les feuilles mortes et fruits tombés. Appliquez des fongicides préventifs (Mancozèbe, cuivre).",
    });
  }
  if (alerts.length === 0 && classes.has("Fresh")) {
    alerts.push({
      level: "success",
      icon: "✅",
      title: "Culture Saine",
      message: "Aucun signe de maladie détecté sur ce fruit. Continuez le programme de surveillance habituel.",
    });
  }
  return alerts;
}