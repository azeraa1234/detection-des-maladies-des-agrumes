import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur de connexion');
      }

      const data = await response.json();
      login(data.access_token);

      // Show connecting animation
      setIsConnecting(true);
      
      toast.success("Connexion réussie !");

      setTimeout(() => {
        navigate({ to: '/' });
      }, 2000);
    } catch (error: any) {
      toast.error("Erreur de connexion", {
        description: error.message,
      });
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isConnecting ? (
        <motion.div
          key="connecting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'oklch(0.18 0.012 160)' }}
        >
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{ background: 'radial-gradient(circle, oklch(0.74 0.18 145 / 0.3), transparent 70%)' }}
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: 'radial-gradient(circle, oklch(0.74 0.18 145 / 0.2), transparent 70%)' }}
            />
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 grid h-20 w-20 place-items-center rounded-2xl bg-primary/15 text-primary mb-8"
            style={{ boxShadow: '0 0 60px -10px oklch(0.74 0.18 145 / 0.5)' }}
          >
            <Leaf className="h-10 w-10" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 font-display text-2xl font-bold tracking-tight text-foreground mb-3"
          >
            Connexion en cours...
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative z-10 flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="text-sm text-muted-foreground">Préparation de votre espace de travail</span>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative z-10 mt-8 w-64 h-1 rounded-full overflow-hidden"
            style={{ background: 'oklch(0.28 0.018 160)' }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, oklch(0.74 0.18 145), oklch(0.8 0.15 145))' }}
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex"
          style={{ background: 'oklch(0.18 0.012 160)' }}
        >
          {/* Left side — Branding panel */}
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
            {/* Background gradient blobs */}
            <div className="absolute inset-0">
              <div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
                style={{ background: 'oklch(0.74 0.18 145)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
                style={{ background: 'oklch(0.74 0.18 145)' }}
              />
              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `linear-gradient(oklch(0.74 0.18 145) 1px, transparent 1px), linear-gradient(90deg, oklch(0.74 0.18 145) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px',
                }}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative z-10 max-w-md"
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="grid h-14 w-14 place-items-center rounded-2xl text-primary"
                  style={{ background: 'oklch(0.74 0.18 145 / 0.15)', boxShadow: '0 0 40px -8px oklch(0.74 0.18 145 / 0.4)' }}
                >
                  <Leaf className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    <span className="text-gradient-green">ANALYSI M3ANA</span>
                  </h1>
                  <p className="text-xs text-muted-foreground">Jumeau Numérique Agrumicole</p>
                </div>
              </div>

              <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground mb-4">
                Détection IA des maladies{' '}
                <span className="text-gradient-green">en temps réel</span>
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Analysez vos agrumes avec YOLOv8s & YOLOv12s. Identifiez Black Spot, Greening, 
                Canker et plus — instantanément.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {['YOLOv8s', 'YOLOv12s', 'SAHI', 'Super-Résolution', 'Multi-Scale'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-primary"
                    style={{
                      background: 'oklch(0.74 0.18 145 / 0.1)',
                      border: '1px solid oklch(0.74 0.18 145 / 0.2)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-10 grid grid-cols-3 gap-6">
                {[
                  { value: '4', label: 'Maladies détectées' },
                  { value: '95%', label: 'Précision' },
                  { value: '<2s', label: 'Temps d\'analyse' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right side — Login form */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full max-w-[420px]"
            >
              {/* Mobile logo */}
              <div className="flex items-center gap-3 mb-10 lg:hidden">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-primary"
                  style={{ background: 'oklch(0.74 0.18 145 / 0.15)' }}
                >
                  <Leaf className="h-6 w-6" />
                </div>
                <span className="font-display text-lg font-bold text-gradient-green">ANALYSI M3ANA</span>
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Bon retour 👋
              </h2>
              <p className="text-sm text-muted-foreground mt-2 mb-8">
                Connectez-vous pour accéder à vos analyses.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="login-email">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder="exemple@email.com"
                      className="flex h-12 w-full rounded-xl pl-11 pr-4 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      style={{
                        background: 'oklch(0.235 0.014 160)',
                        border: '1px solid oklch(0.32 0.03 155 / 0.6)',
                        color: 'oklch(0.985 0.025 145)',
                      }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="login-password">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="flex h-12 w-full rounded-xl pl-11 pr-11 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      style={{
                        background: 'oklch(0.235 0.014 160)',
                        border: '1px solid oklch(0.32 0.03 155 / 0.6)',
                        color: 'oklch(0.985 0.025 145)',
                      }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, oklch(0.74 0.18 145), oklch(0.65 0.2 150))',
                    color: 'oklch(0.18 0.012 160)',
                    boxShadow: '0 4px 20px -4px oklch(0.74 0.18 145 / 0.4)',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <span className="text-sm text-muted-foreground">
                  Pas encore de compte ?{' '}
                </span>
                <Link
                  to="/register"
                  className="text-sm font-semibold text-primary hover:underline transition-colors"
                >
                  Créer un compte
                </Link>
              </div>

              {/* Bottom decorative line */}
              <div className="mt-10 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'oklch(0.32 0.03 155 / 0.4)' }} />
                <Leaf className="h-3.5 w-3.5 text-primary/30" />
                <div className="flex-1 h-px" style={{ background: 'oklch(0.32 0.03 155 / 0.4)' }} />
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground/60">
                Agri 4.0 — Jumeau Numérique Agrumicole
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
