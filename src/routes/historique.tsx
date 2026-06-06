import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, Clock, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DISEASE_COLORS,
  type DiseaseClass,
  type HistoryEntry,
} from "@/lib/mock-data";
import { BoundingBoxCanvas } from "@/components/scanner/BoundingBoxCanvas";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique — Agri 4.0" },
      { name: "description", content: "Historique des détections enregistrées." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }

    fetch("/api/scans", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then((data) => setEntries(data))
      .catch((err) => {
        console.error(err);
        toast.error("Erreur API", { description: "Impossible de charger l'historique depuis le serveur backend." });
      });
  }, []);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (query) list = list.filter((e) => e.filename.toLowerCase().includes(query.toLowerCase()));
    if (filter !== "all") list = list.filter((e) => e.detections.some((d) => d.class === filter));
    if (sort === "recent") list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (sort === "oldest") list.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    if (sort === "confidence")
      list.sort((a, b) => avgConf(b.detections) - avgConf(a.detections));
    return list;
  }, [entries, query, filter, sort]);

  const exportCsv = () => {
    const rows = [
      ["id", "filename", "date", "model", "inference_ms", "classes", "avg_confidence"],
      ...filtered.map((e) => [
        e.id,
        e.filename,
        e.date,
        e.model,
        String(e.inferenceMs),
        e.detections.map((d) => d.class).join(";"),
        avgConf(e.detections).toFixed(3),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="space-y-5">
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom de fichier…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            <SelectItem value="Black Spot">Black Spot</SelectItem>
            <SelectItem value="Greening">Greening</SelectItem>
            <SelectItem value="Canker">Canker</SelectItem>
            <SelectItem value="Fresh">Fresh</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récents</SelectItem>
            <SelectItem value="oldest">Plus anciens</SelectItem>
            <SelectItem value="confidence">Confiance ↓</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Exporter CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          Aucune entrée trouvée.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <HistoryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const classes = Array.from(new Set(entry.detections.map((d) => d.class))) as DiseaseClass[];
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <img
          src={entry.thumbnail}
          alt={entry.filename}
          className="h-20 w-28 flex-shrink-0 rounded-lg border border-border object-cover"
        />
        <div className="flex-1">
          <p className="font-medium">{entry.filename}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(entry.date).toLocaleString("fr-FR")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {classes.map((c) => (
              <span
                key={c}
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: DISEASE_COLORS[c],
                  borderColor: `${DISEASE_COLORS[c]}55`,
                  background: `${DISEASE_COLORS[c]}15`,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-xs sm:text-right">
          <div>
            <p className="text-muted-foreground">Objets</p>
            <p className="font-display text-lg font-semibold">{entry.detections.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Conf. moy.</p>
            <p className="font-display text-lg font-semibold text-primary">
              {Math.round(avgConf(entry.detections) * 100)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" /> Inf.
            </p>
            <p className="font-display text-lg font-semibold">{entry.inferenceMs}ms</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Cpu className="h-3 w-3" />
          {entry.model}
        </div>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="details" className="border-t border-border">
          <AccordionTrigger className="px-4 text-sm">Voir Détails</AccordionTrigger>
          <AccordionContent className="p-4">
            <BoundingBoxCanvas imageSrc={entry.thumbnail} detections={entry.detections} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function avgConf(dets: { confidence: number }[]) {
  if (!dets.length) return 0;
  return dets.reduce((s, d) => s + d.confidence, 0) / dets.length;
}
