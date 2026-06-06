import { createFileRoute } from "@tanstack/react-router";
import {
  ScanLine,
  ShieldAlert,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  DISEASE_COLORS,
  MODEL_COMPARISON,
  loadHistory,
  type HistoryEntry,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de Bord — Analysi M3ana" },
      { name: "description", content: "Tableau de bord agronomique basé sur vos analyses réelles : KPIs, tendances et comparaison des modèles IA." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    
    fetch("/api/scans", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Chargement des statistiques...</div>;
  }

  // ── KPIs from real history ──────────────────────────────────────────────
  const totalScans = history.length;

  const allDetections = history.flatMap((e) => e.detections);

  const infectedEntries = history.filter((e) =>
    e.detections.some((d) => d.class !== "Fresh")
  );
  const healthyEntries = history.filter(
    (e) =>
      e.detections.length === 0 ||
      e.detections.every((d) => d.class === "Fresh")
  );

  const healthScore =
    totalScans > 0
      ? Math.round((healthyEntries.length / totalScans) * 1000) / 10
      : 0;

  // ── Trend: group entries by day ─────────────────────────────────────────
  const trendMap = new Map<string, { Sains: number; Infectés: number }>();
  history.forEach((e) => {
    const day = new Date(e.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
    if (!trendMap.has(day)) trendMap.set(day, { Sains: 0, Infectés: 0 });
    const entry = trendMap.get(day)!;
    const isHealthy = e.detections.every((d) => d.class === "Fresh") || e.detections.length === 0;
    if (isHealthy) entry.Sains++;
    else entry.Infectés++;
  });
  const trendData = Array.from(trendMap.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .slice(-30);

  // ── Pie: disease class distribution ─────────────────────────────────────
  const classCounts: Record<string, number> = {};
  allDetections.forEach((d) => {
    classCounts[d.class] = (classCounts[d.class] || 0) + 1;
  });
  const diseasePie = Object.entries(classCounts).map(([name, value]) => ({
    name,
    value,
    color:
      DISEASE_COLORS[name as keyof typeof DISEASE_COLORS] || "#22C55E",
  }));

  // ── Weekly Top diseases ─────────────────────────────────────────────────
  const weeklyTop = Object.entries(classCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Heatmap: last 91 days ──────────────────────────────────────────────
  const heatmapMap = new Map<string, number>();
  history.forEach((e) => {
    const day = new Date(e.date).toISOString().slice(0, 10);
    heatmapMap.set(day, (heatmapMap.get(day) || 0) + 1);
  });
  const heatmapData = Array.from({ length: 91 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (90 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return { date: dateStr, count: heatmapMap.get(dateStr) || 0 };
  });

  // ── No data state ────────────────────────────────────────────────────────
  if (totalScans === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <ScanLine className="h-8 w-8" />
        </div>
        <h2 className="font-display text-xl font-semibold">Aucune analyse encore</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Allez dans le Scanner, analysez une image et sauvegardez-la — le tableau de bord
          se mettra à jour automatiquement avec vos données réelles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Analyses totales" value={totalScans} icon={ScanLine} />
        <KpiCard label="Images Infectées" value={infectedEntries.length} icon={ShieldAlert} tone="danger" />
        <KpiCard label="Images Saines" value={healthyEntries.length} icon={CheckCircle2} tone="success" />
        <KpiCard label="Score de Santé Global" value={healthScore} suffix="%" decimals={1} icon={Activity} tone="warning" />
      </div>

      {/* Row 2 charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <h3 className="font-display text-lg font-semibold">Tendance des Analyses</h3>
          <p className="text-xs text-muted-foreground">Basé sur votre historique réel</p>
          <div className="mt-4 h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="g-sains" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-inf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2e25" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#111915", border: "1px solid #1f2e25", borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="Sains" stroke="#22c55e" strokeWidth={2} fill="url(#g-sains)" />
                  <Area type="monotone" dataKey="Infectés" stroke="#ef4444" strokeWidth={2} fill="url(#g-inf)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pas encore de données</div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Répartition des Maladies</h3>
          <p className="text-xs text-muted-foreground">Détections réelles</p>
          <div className="mt-4 h-72">
            {diseasePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diseasePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {diseasePie.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111915", border: "1px solid #1f2e25", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pas encore de détections</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold">Comparaison des Modèles IA</h3>
          <p className="text-xs text-muted-foreground">YOLOv8s vs YOLOv12s</p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Métrique</th>
                <th className="py-2 font-medium">YOLOv8s</th>
                <th className="py-2 font-medium">YOLOv12s</th>
                <th className="py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_COMPARISON.map((m) => {
                const better = m.isLatency ? m.v12s < m.v8s : m.v12s > m.v8s;
                const delta = m.isLatency ? m.v8s - m.v12s : m.v12s - m.v8s;
                return (
                  <tr key={m.metric} className="border-t border-border">
                    <td className="py-3 font-medium">{m.metric}</td>
                    <td className="py-3 font-mono">{m.isLatency ? `${m.v8s}ms` : m.v8s.toFixed(3)}</td>
                    <td className="py-3 font-mono text-primary">{m.isLatency ? `${m.v12s}ms` : m.v12s.toFixed(3)}</td>
                    <td className={cn("py-3 font-mono", better ? "text-primary" : "text-red-400")}>
                      {better ? "+" : ""}
                      {m.isLatency ? `${delta}ms` : delta.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg font-semibold">Top Maladies Détectées</h3>
          <div className="mt-4 h-64">
            {weeklyTop.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTop} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2e25" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ background: "#111915", border: "1px solid #1f2e25", borderRadius: 8 }} cursor={{ fill: "#1f2e25" }} />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pas encore de données</div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-lg font-semibold">Calendrier d'Activité</h3>
        <p className="text-xs text-muted-foreground">3 derniers mois — analyses par jour</p>
        <Heatmap data={heatmapData} />
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  const intensity = (c: number) => {
    if (c === 0) return "bg-white/[0.04]";
    const ratio = c / max;
    if (ratio > 0.75) return "bg-primary";
    if (ratio > 0.5) return "bg-primary/70";
    if (ratio > 0.25) return "bg-primary/45";
    return "bg-primary/20";
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex gap-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date} · ${d.count} analyse(s)`}
                className={cn("h-3 w-3 rounded-[3px] transition-transform hover:scale-125", intensity(d.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Moins</span>
        <div className="h-3 w-3 rounded-[3px] bg-white/[0.04]" />
        <div className="h-3 w-3 rounded-[3px] bg-primary/20" />
        <div className="h-3 w-3 rounded-[3px] bg-primary/45" />
        <div className="h-3 w-3 rounded-[3px] bg-primary/70" />
        <div className="h-3 w-3 rounded-[3px] bg-primary" />
        <span>Plus</span>
      </div>
    </div>
  );
}
