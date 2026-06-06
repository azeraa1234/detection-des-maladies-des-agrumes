import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus,
  ScanLine,
  Loader2,
  EyeOff,
  Download,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "../contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { BoundingBoxCanvas } from "@/components/scanner/BoundingBoxCanvas";
import {
  DEMO_IMAGE_URL,
  DISEASE_COLORS,
  buildAlerts,
  type Detection,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scanner — Jumeau Numérique Agrumicole" },
      {
        name: "description",
        content:
          "Analyse IA en temps réel : détection des maladies des agrumes avec YOLOv8s / YOLOv12s et alertes agronomiques.",
      },
    ],
  }),
  component: ScannerPage,
});

type Model = "YOLOv8s" | "YOLOv12s";

function ScannerPage() {
  const { token, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };
  const [model, setModel] = useState<Model>("YOLOv8s");
  const [confidence, setConfidence] = useState(0.45);
  const [useSahi, setUseSahi] = useState(false);
  const [useTta, setUseTta] = useState(false);
  const [useMultiScale, setUseMultiScale] = useState(false);
  const [useZoomIn, setUseZoomIn] = useState(false);
  const [useSuperResolution, setUseSuperResolution] = useState(false);
  const [status, setStatus] = useState<"empty" | "loading" | "results">("empty");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [inferenceMs, setInferenceMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté", { description: "Utilisez JPG, PNG ou WEBP." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", { description: "Taille maximale : 10 MB." });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setFilename(file.name);
      setStatus("empty");
      setDetections([]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = async () => {
    if (!imageSrc) {
      toast.error("Aucune image", { description: "Veuillez sélectionner une image." });
      return;
    }

    setStatus("loading");
    setProgress(0);
    const start = performance.now();

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 100);

    try {
      let fileToUpload: File | null = selectedFile;
      if (!fileToUpload && imageSrc.startsWith("data:")) {
        fileToUpload = dataURLtoFile(imageSrc, filename || "upload.jpg");
      }

      if (!fileToUpload) {
        throw new Error("Impossible de récupérer le fichier de l'image.");
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("model", model); // "YOLOv8s" or "YOLOv12s"
      formData.append("sahi", useSahi.toString());
      formData.append("tta", useTta.toString());
      formData.append("multi_scale", useMultiScale.toString());
      formData.append("zoom_in", useZoomIn.toString());
      formData.append("super_res", useSuperResolution.toString());

      const response = await fetch("/api/detect", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur API (${response.status})`);
      }

      const data = await response.json();
      clearInterval(interval);
      setProgress(100);

      const mappedDetections: Detection[] = data.detections.map((d: any) => {
        const [x1, y1, x2, y2] = d.bbox;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const bw = x2 - x1;
        const bh = y2 - y1;

        let label = d.label;
        const matches = ["black spot", "greening", "canker", "fresh"];
        const normalized = matches.find(m => m === label.toLowerCase());
        if (normalized) {
          if (normalized === "black spot") label = "Black Spot";
          else if (normalized === "greening") label = "Greening";
          else if (normalized === "canker") label = "Canker";
          else if (normalized === "fresh") label = "Fresh";
        } else {
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }

        return {
          class: label as any,
          classId: 0,
          confidence: d.confidence,
          bbox: [cx, cy, bw, bh],
        };
      });

      const filtered = mappedDetections.filter((d) => d.confidence >= confidence);
      const elapsedMs = Math.round(performance.now() - start);

      setDetections(filtered);
      setInferenceMs(elapsedMs);
      setStatus("results");

      // ── Trigger Notification ─────────────────────────────────────────
      if (filtered.length > 0) {
        // Check if there's any disease (anything other than 'Fresh')
        const diseases = filtered.filter(d => d.class.toLowerCase() !== 'fresh');
        
        if (diseases.length > 0) {
          // Get unique disease names
          const uniqueDiseases = Array.from(new Set(diseases.map(d => d.class)));
          const diseaseNames = uniqueDiseases.join(', ');
          
          addNotification({
            title: "Maladie Détectée !",
            message: `Attention, le scan a détecté : ${diseaseNames}. Consulter l'assistant IA pour des conseils de traitement.`,
            type: "alert"
          });
        } else {
          addNotification({
            title: "Plante Saine",
            message: "Excellente nouvelle ! Aucun signe de maladie n'a été détecté sur cette image.",
            type: "success"
          });
        }
      }

      // ── Auto-save to history (API) ───────────────────────────────────
      if (imageSrc) {
        const payload = {
          filename: filename || "scan.jpg",
          thumbnail: imageSrc,
          model: model,
          inferenceMs: elapsedMs,
          detections: filtered.map(d => ({
            class: d.class,
            confidence: d.confidence,
            bbox: d.bbox
          }))
        };
        fetch("/api/scans", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Failed to save scan:", err));
      }

      toast.success("Analyse terminée", {
        description: `${filtered.length} objet(s) détecté(s) avec ${model}. Sauvegardé dans l'historique.`,
      });

    } catch (error: any) {
      clearInterval(interval);
      setStatus("empty");
      console.error(error);
      const msg = error?.message || String(error);
      toast.error("Erreur d'analyse", {
        description: `Détail de l'erreur : ${msg}`,
      });
    }
  };

  const loadDemo = async () => {
    try {
      setImageSrc(DEMO_IMAGE_URL);
      setFilename("demo_citrus.jpg");
      setStatus("empty");
      setDetections([]);
      
      const response = await fetch(DEMO_IMAGE_URL);
      const blob = await response.blob();
      const file = new File([blob], "demo_citrus.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      
      toast.info("Image démo chargée");
    } catch (error) {
      console.error("Failed to load demo image file", error);
      toast.info("Image démo chargée (aperçu uniquement)");
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setFilename("");
    setStatus("empty");
    setDetections([]);
  };

  const saveToHistory = async () => {
    if (!imageSrc || detections.length === 0) {
      toast.error("Rien à sauvegarder");
      return;
    }
    const payload = {
      filename: filename || "scan.jpg",
      thumbnail: imageSrc,
      model: model,
      inferenceMs: inferenceMs,
      detections: detections.map(d => ({
        class: d.class,
        confidence: d.confidence,
        bbox: d.bbox
      }))
    };
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("API Error");
      toast.success("Sauvegardé dans la base de données");
    } catch (err) {
      console.error(err);
      toast.error("Erreur API", { description: "Impossible de sauvegarder le scan." });
    }
  };

  const downloadReport = () => {
    const report = {
      filename,
      date: new Date().toISOString(),
      model,
      confidenceThreshold: confidence,
      inferenceMs,
      detections,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport téléchargé");
  };

  const alerts = buildAlerts(detections);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT: Upload & Settings */}
      <section className="glass rounded-2xl p-5 md:p-6">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold">Analyse d'Image Agrumicole</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Téléchargez une photo, sélectionnez le modèle et lancez la détection.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all",
            dragging
              ? "border-primary bg-primary/10"
              : "border-primary/40 bg-black/20 hover:border-primary hover:bg-primary/5",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {imageSrc ? (
            <div className="flex w-full flex-col items-center gap-3">
              <img
                src={imageSrc}
                alt="Aperçu"
                className="max-h-48 rounded-lg border border-border object-cover"
              />
              <p className="text-xs text-muted-foreground">{filename}</p>
              <p className="text-xs text-primary">Cliquez pour changer d'image</p>
            </div>
          ) : (
            <>
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <ImagePlus className="h-7 w-7" />
              </div>
              <p className="mt-4 font-medium">Glissez et déposez l'image ici</p>
              <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-black/30 px-3 py-1 text-[11px] text-muted-foreground">
                JPG · PNG · WEBP · Max 10MB
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Modèle IA
            </label>
            <Select value={model} onValueChange={(v) => setModel(v as Model)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YOLOv8s">YOLOv8s (Stable)</SelectItem>
                <SelectItem value="YOLOv12s">YOLOv12s (Expérimental)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Seuil de Confiance</span>
              <span className="font-mono text-primary">{confidence.toFixed(2)}</span>
            </label>
            <Slider
              min={0.1}
              max={0.9}
              step={0.05}
              value={[confidence]}
              onValueChange={(v) => setConfidence(v[0])}
              className="py-2"
            />
          </div>
          <div className="col-span-full grid gap-2">
            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 bg-black/10">
              <Switch id="tta-mode" checked={useTta} onCheckedChange={setUseTta} />
              <div className="flex flex-col">
                <label htmlFor="tta-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activer TTA (Test-Time Augmentation)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Améliore la précision globale en testant l'image sous plusieurs angles.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 bg-black/10">
              <Switch id="sahi-mode" checked={useSahi} onCheckedChange={setUseSahi} />
              <div className="flex flex-col">
                <label htmlFor="sahi-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activer SAHI (Slicing Aided Hyper Inference)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Améliore la détection des très petits objets en découpant l'image. (Plus lent)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 bg-black/10">
              <Switch id="multiscale-mode" checked={useMultiScale} onCheckedChange={setUseMultiScale} />
              <div className="flex flex-col">
                <label htmlFor="multiscale-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activer Inférence Multi-Échelles (Multi-Scale)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Combine les détections de 3 résolutions (640, 1280, 1920) pour plus de détails.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 bg-black/10">
              <Switch id="zoomin-mode" checked={useZoomIn} onCheckedChange={setUseZoomIn} />
              <div className="flex flex-col">
                <label htmlFor="zoomin-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activer Two-Stage "Zoom-In" (Region Proposal)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Étape 1: Trouve les fruits/plantes. Étape 2: Zoom et cherche les maladies.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border border-border p-3 bg-black/10">
              <Switch id="superres-mode" checked={useSuperResolution} onCheckedChange={setUseSuperResolution} />
              <div className="flex flex-col">
                <label htmlFor="superres-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activer IA Super-Résolution (Upscaling)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Améliore la netteté et la taille de l'image via IA avant l'analyse. (Lourd)
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={status === "loading" || !imageSrc}
          className="mt-6 h-12 w-full text-base font-semibold glow-green"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <ScanLine className="mr-2 h-5 w-5" />
              Lancer l'Analyse
            </>
          )}
        </Button>

        <button
          onClick={loadDemo}
          className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" /> Essayer une image démo
        </button>
      </section>

      {/* RIGHT: Results */}
      <section className="glass rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Résultats de Détection</h2>
          {status === "results" && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {model} · {inferenceMs}ms
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          {status === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid min-h-[420px] place-items-center rounded-xl border-2 border-dashed border-border bg-black/20 p-6 text-center"
            >
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                  <EyeOff className="h-7 w-7" />
                </div>
                <p className="mt-4 font-medium">En attente d'analyse…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les détections et alertes apparaîtront ici.
                </p>
              </div>
            </motion.div>
          )}

          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="h-56 animate-pulse rounded-xl bg-muted/50" />
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Inférence IA en cours…</p>
                <Progress value={progress} />
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {status === "results" && imageSrc && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <BoundingBoxCanvas imageSrc={imageSrc} detections={detections} />

              {/* DSS Alerts */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Système d'Aide à la Décision
                </h3>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Aucune détection au-dessus du seuil.
                    </div>
                  ) : (
                    alerts.map((a, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                          "rounded-lg border p-4",
                          a.level === "critical" &&
                            "border-red-500/40 bg-red-500/10",
                          a.level === "warning" &&
                            "border-amber-500/40 bg-amber-500/10",
                          a.level === "success" &&
                            "border-primary/40 bg-primary/10",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{a.icon}</span>
                          <div>
                            <p
                              className={cn(
                                "font-semibold",
                                a.level === "critical" && "text-red-300",
                                a.level === "warning" && "text-amber-300",
                                a.level === "success" && "text-primary",
                              )}
                            >
                              {a.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Detections list */}
              {detections.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Objets détectés ({detections.length})
                  </h3>
                  <div className="space-y-2">
                    {detections.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-border bg-black/30 p-3"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: DISEASE_COLORS[d.class as keyof typeof DISEASE_COLORS] || "#22C55E" }}
                        />
                        <span className="w-28 text-sm font-medium">{d.class}</span>
                        <div className="relative flex-1 overflow-hidden rounded-full bg-muted/40">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${d.confidence * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className="h-2 rounded-full"
                            style={{ backgroundColor: DISEASE_COLORS[d.class as keyof typeof DISEASE_COLORS] || "#22C55E" }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                          {Math.round(d.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="ghost" onClick={downloadReport}>
                  <Download className="mr-2 h-4 w-4" /> Télécharger Rapport
                </Button>
                <Button onClick={saveToHistory}>
                  <Save className="mr-2 h-4 w-4" /> Sauvegarder
                </Button>
                <Button variant="ghost" onClick={reset} className="text-red-400 hover:text-red-300">
                  <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
