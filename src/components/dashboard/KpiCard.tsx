import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
  icon: LucideIcon;
  tone?: "primary" | "danger" | "success" | "warning";
  decimals?: number;
}

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  primary: "text-primary bg-primary/15",
  danger: "text-red-400 bg-red-500/15",
  success: "text-primary bg-primary/15",
  warning: "text-amber-400 bg-amber-500/15",
};

export function KpiCard({ label, value, delta, suffix, icon: Icon, tone = "primary", decimals = 0 }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const animate = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {display.toFixed(decimals)}
            {suffix}
          </p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof delta === "number" && (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            delta >= 0 ? "text-primary" : "text-red-400",
          )}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs hier
        </p>
      )}
    </motion.div>
  );
}