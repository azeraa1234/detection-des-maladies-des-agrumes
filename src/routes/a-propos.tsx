import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, Cpu, Database, Github, Linkedin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À Propos — Analysi M3ana" },
      { name: "description", content: "À propos du projet Analysi M3ana — Détection IA des maladies des agrumes." },
    ],
  }),
  component: AboutPage,
});

const TECH = [
  { name: "Python", color: "#3776AB" },
  { name: "PyTorch", color: "#EE4C2C" },
  { name: "YOLOv8 / v12", color: "#22C55E" },
  { name: "React", color: "#61DAFB" },
  { name: "Tailwind", color: "#38BDF8" },
  { name: "OpenCV", color: "#5C3EE8" },
  { name: "Roboflow", color: "#A855F7" },
  { name: "ONNX", color: "#F59E0B" },
];

const DATASET = [
  { name: "Black Spot", count: 1876, color: "#EF4444" },
  { name: "Greening", count: 512, color: "#EAB308" },
  { name: "Canker", count: 2529, color: "#F97316" },
  { name: "Fresh", count: 3808, color: "#22C55E" },
];

function AboutPage() {
  const total = DATASET.reduce((s, d) => s + d.count, 0);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Projet de Fin d'Études — IA & Agriculture
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
          Analysi <span className="text-gradient-green">M3ana</span>
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Une plateforme de détection en temps réel des maladies des agrumes, combinant deep learning,
          edge computing et système d'aide à la décision agronomique pour le secteur agricole marocain.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={AlertTriangle} title="Le Problème" tone="danger">
          Le Maroc, 5ᵉ producteur mondial d'agrumes, perd chaque année <b>20–30%</b> de sa production
          à cause de maladies telles que le Greening, le Chancre et la Tache Noire. La détection
          tardive et manuelle aggrave les pertes économiques.
        </Card>
        <Card icon={Sparkles} title="La Solution" tone="primary">
          Une IA embarquée <b>YOLOv8s / YOLOv12s</b> capable de détecter et de classifier les maladies
          en moins de <b>50 ms</b> sur un appareil mobile, avec un système d'aide à la décision
          fournissant des contre-mesures agronomiques immédiates.
        </Card>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Dataset</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString("fr-FR")} images annotées · 4 classes · augmentation Mosaic + HSV
        </p>
        <div className="mt-5 space-y-3">
          {DATASET.map((d) => {
            const pct = (d.count / total) * 100;
            return (
              <div key={d.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{d.name}</span>
                  <span className="font-mono text-muted-foreground">
                    {d.count.toLocaleString("fr-FR")} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: d.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Stack Technique</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TECH.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-black/30 p-4 text-center transition-transform hover:-translate-y-0.5"
            >
              <div
                className="mx-auto h-2 w-8 rounded-full"
                style={{ background: t.color }}
              />
              <p className="mt-3 text-sm font-medium">{t.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/50 to-primary/10 font-display text-2xl font-bold text-primary">
            KA
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-xl font-semibold">Karim Amhaou</h3>
            <p className="text-sm text-muted-foreground">Ingénieur IA & Data Scientist</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Projet de Fin d'Études — Spécialité Intelligence Artificielle & Data Science.
              Créateur de la plateforme <span className="text-primary font-medium">Analysi M3ana</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="#"
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof AlertTriangle;
  title: string;
  tone: "danger" | "primary";
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <div
          className={
            tone === "danger"
              ? "grid h-9 w-9 place-items-center rounded-lg bg-red-500/15 text-red-400"
              : "grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </motion.div>
  );
}