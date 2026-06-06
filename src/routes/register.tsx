import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/register')({
  component: Register,
});

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabels = ['', 'Faible', 'Moyen', 'Fort'];
  const strengthColors = ['', '#ef4444', '#eab308', '#22c55e'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erreur lors de l'inscription");
      }

      toast.success("Compte créé avec succès !", {
        description: "Connectez-vous maintenant.",
      });
      
      navigate({ to: '/login' });
    } catch (error: any) {
      toast.error("Erreur d'inscription", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex"
      style={{ background: 'oklch(0.18 0.012 160)' }}
    >
      {/* Left side — Form */}
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

          <div className="flex items-center gap-3 mb-2">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-primary"
              style={{ background: 'oklch(0.74 0.18 145 / 0.1)' }}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Créer un compte
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2 mb-8">
            Inscrivez-vous pour sauvegarder vos analyses et accéder à votre historique.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="reg-email">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-email"
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
              <label className="text-sm font-medium text-foreground" htmlFor="reg-password">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractères"
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

              {/* Password strength indicator */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 pt-1"
                >
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: passwordStrength >= level
                            ? strengthColors[passwordStrength]
                            : 'oklch(0.28 0.018 160)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColors[passwordStrength] }}>
                    {strengthLabels[passwordStrength]}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Features preview */}
            <div
              className="rounded-xl p-4 space-y-2.5"
              style={{
                background: 'oklch(0.235 0.014 160)',
                border: '1px solid oklch(0.32 0.03 155 / 0.4)',
              }}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Votre compte inclut
              </p>
              {[
                'Historique de toutes vos analyses',
                'Export CSV de vos détections',
                'Assistant IA agronomique',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground/80">{feature}</span>
                </div>
              ))}
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
                  Création du compte...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-sm text-muted-foreground">
              Déjà un compte ?{' '}
            </span>
            <Link
              to="/login"
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              Se connecter
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

      {/* Right side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Background gradient blobs */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'oklch(0.74 0.18 145)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
            style={{ background: 'oklch(0.74 0.18 145)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(oklch(0.74 0.18 145) 1px, transparent 1px), linear-gradient(90deg, oklch(0.74 0.18 145) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 max-w-md text-center"
        >
          <div
            className="mx-auto grid h-20 w-20 place-items-center rounded-2xl text-primary mb-8"
            style={{ background: 'oklch(0.74 0.18 145 / 0.15)', boxShadow: '0 0 60px -10px oklch(0.74 0.18 145 / 0.4)' }}
          >
            <Leaf className="h-10 w-10" />
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            <span className="text-gradient-green">ANALYSI M3ANA</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Jumeau Numérique Agrumicole — Agri 4.0
          </p>

          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground mb-4">
            Rejoignez la plateforme{' '}
            <span className="text-gradient-green">intelligente</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Détectez les maladies des agrumes avec l'intelligence artificielle. 
            Sauvegardez, analysez et partagez vos résultats.
          </p>

          {/* Animated dots */}
          <div className="mt-12 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="h-2 w-2 rounded-full"
                style={{ background: 'oklch(0.74 0.18 145)' }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
