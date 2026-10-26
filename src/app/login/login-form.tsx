"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Spinner } from "@/components/ui/button";
import { Field, Input, Checkbox } from "@/components/ui/field";

type Step = "credentials" | "totp";

export function LoginForm() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });
    setPending(false);
    if (err) {
      setError(
        err.status === 429
          ? "Trop de tentatives. Réessayez dans une minute."
          : "Identifiants incorrects.",
      );
      return;
    }
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      setStep("totp");
      return;
    }
    window.location.href = "/";
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice });
    setPending(false);
    if (err) {
      setError(
        err.status === 429
          ? "Trop de tentatives. Réessayez dans une minute."
          : "Code invalide.",
      );
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-sm)]">
      <h1 className="text-lg font-semibold tracking-tight text-ink">Facturation</h1>
      <p className="mt-1 text-[13px] text-muted">
        {step === "credentials"
          ? "Connectez-vous pour accéder à votre espace."
          : "Saisissez le code de votre application d'authentification."}
      </p>

      {step === "credentials" ? (
        <form onSubmit={submitCredentials} className="mt-5 grid gap-4">
          <Field label="E-mail" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Mot de passe" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {error && <p className="text-xs leading-snug text-danger">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-5 grid gap-4">
          <Field
            label={useBackup ? "Code de secours" : "Code à 6 chiffres"}
            htmlFor="code"
            required
          >
            <Input
              id="code"
              inputMode={useBackup ? "text" : "numeric"}
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="tnum text-center tracking-[0.3em]"
              required
              autoFocus
            />
          </Field>
          {!useBackup && (
            <Checkbox
              label="Faire confiance à cet appareil pendant 60 jours"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
            />
          )}
          {error && <p className="text-xs leading-snug text-danger">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Vérification…" : "Valider"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setUseBackup((value) => !value);
              setCode("");
              setError(null);
            }}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            {useBackup
              ? "Utiliser le code de l'application"
              : "Appareil perdu ? Utiliser un code de secours"}
          </button>
        </form>
      )}
    </div>
  );
}
