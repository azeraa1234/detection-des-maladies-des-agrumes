import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ScanLine,
  LayoutDashboard,
  History,
  UserCircle2,
  Leaf,
  Bell,
  Menu,
  Bot,
  LogOut,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const NAV_ITEMS = [
  { to: "/", label: "Scanner", icon: ScanLine },
  { to: "/tableau-de-bord", label: "Tableau de Bord", icon: LayoutDashboard },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/assistant", label: "Assistant IA", icon: Bot },
  { to: "/a-propos", label: "À Propos", icon: UserCircle2 },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Scanner — Analyse d'Image",
  "/tableau-de-bord": "Tableau de Bord Agronomique",
  "/historique": "Historique des Détections",
  "/assistant": "Assistant IA — Khabir Zira3i",
  "/a-propos": "À Propos — Analysi M3ana",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const title = PAGE_TITLES[pathname] ?? "Analysi M3ana";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[240px] flex-col border-r border-border bg-[var(--sidebar-bg)] transition-transform md:static md:flex md:translate-x-0",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary glow-green">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="font-display text-lg font-bold tracking-tight">
            <span className="text-gradient-green">ANALYSI M3ANA</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-indicator"
                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary"
                  />
                )}
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">Système En Ligne</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-base font-semibold md:text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            <span className="hidden text-xs text-muted-foreground md:inline capitalize">
              {today}
            </span>

            <Popover>
              <PopoverTrigger asChild>
                <button className="relative grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      <Bell className="mb-2 h-8 w-8 opacity-20" />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.isRead && markAsRead(notif.id)}
                          className={cn(
                            "flex flex-col gap-1 border-b border-border p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                            !notif.isRead ? "bg-primary/5" : ""
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              notif.type === 'alert' ? "text-red-500" :
                              notif.type === 'success' ? "text-green-500" :
                              "text-foreground"
                            )}>
                              {notif.title}
                            </span>
                            {!notif.isRead && (
                              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {isAuthenticated ? (
              <button 
                onClick={() => { logout(); navigate({ to: '/login' }); }}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate({ to: '/login' })}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden md:inline">Connexion</span>
              </button>
            )}
          </div>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex-1 p-4 md:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}