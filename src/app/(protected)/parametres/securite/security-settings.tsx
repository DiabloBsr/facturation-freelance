"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, Spinner } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Feedback = { tone: "success" | "error"; text: string } | null;

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={
        feedback.tone === "success"
          ? "text-xs leading-snug text-success"
          : "text-xs leading-snug text-danger"
      }
    >
      {feedback.text}
    </p>
  );
}

export function SecuritySettings({
  email,
  twoFactorEnabled: initialTwoFactor,
}: {
  email: string;
  twoFactorEnabled: boolean;
}) {
  return (
    <div className="grid gap-6">
      <PasswordCard />
      <TwoFactorCard initialEnabled={initialTwoFactor} />
      <SessionsCard email={email} />
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (next.length < 12) {
      setFeedback({ tone: "error", text: "12 caractères minimum." });
      return;
    }
    if (next !== confirm) {
      setFeedback({ tone: "error", text: "La confirmation ne correspond pas." });
      return;
    }
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setFeedback({ tone: "error", text: "Mot de passe actuel incorrect." });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setFeedback({
      tone: "success",
      text: "Mot de passe changé. Les autres appareils ont été déconnectés.",
    });
  }

  return (
    <Card>
      <CardHeader
        title="Mot de passe"
        description="12 caractères minimum. Le changer déconnecte tous les autres appareils."
      />
      <form onSubmit={submit} className="mt-4 grid max-w-md gap-3">
        <Field label="Mot de passe actuel" htmlFor="pw-current" required>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="pw-next" required>
          <Input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
        </Field>
        <Field label="Confirmer" htmlFor="pw-confirm" required>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
        <FeedbackLine feedback={feedback} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Changer le mot de passe
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TwoFactorCard({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [password, setPassword] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const enrolling = qrDataUrl !== null;

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setPending(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data || !("totpURI" in data)) {
      setFeedback({ tone: "error", text: "Mot de passe incorrect." });
      return;
    }
    setPassword("");
    setBackupCodes(data.backupCodes ?? []);
    setQrDataUrl(await QRCode.toDataURL(data.totpURI, { width: 220, margin: 1 }));
  }

  async function confirmEnroll(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setPending(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setPending(false);
    if (error) {
      setFeedback({ tone: "error", text: "Code invalide, réessayez." });
      return;
    }
    setEnabled(true);
    setQrDataUrl(null);
    setCode("");
    setFeedback({ tone: "success", text: "Double authentification activée." });
  }

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setPending(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (error) {
      setFeedback({ tone: "error", text: "Mot de passe incorrect." });
      return;
    }
    setPassword("");
    setEnabled(false);
    setFeedback({ tone: "success", text: "Double authentification désactivée." });
  }

  return (
    <Card>
      <CardHeader
        title="Double authentification (2FA)"
        description="Un code à 6 chiffres depuis une application (Google Authenticator, Aegis, 1Password…) est exigé à chaque connexion."
      />

      {enrolling ? (
        <div className="mt-4 grid max-w-md gap-4">
          <p className="text-[13px] text-muted">
            1. Scannez ce QR code avec votre application d&apos;authentification.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code d'enrôlement 2FA"
            className="h-[220px] w-[220px] rounded-[var(--radius)] border border-line bg-white p-2"
          />
          <div>
            <p className="text-[13px] text-muted">
              2. Conservez ces codes de secours en lieu sûr (un seul usage chacun) :
            </p>
            <ul className="tnum mt-2 grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-line bg-surface-2 p-3 text-[13px]">
              {backupCodes.map((backup) => (
                <li key={backup}>{backup}</li>
              ))}
            </ul>
          </div>
          <form onSubmit={confirmEnroll} className="grid gap-3">
            <Field label="3. Code affiché par l'application" htmlFor="totp-code" required>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="tnum max-w-40 text-center tracking-[0.3em]"
                required
              />
            </Field>
            <FeedbackLine feedback={feedback} />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                Activer
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQrDataUrl(null);
                  setCode("");
                  setFeedback(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <form onSubmit={enabled ? disable : start} className="mt-4 grid max-w-md gap-3">
          <p className="text-[13px]">
            État :{" "}
            <span className={enabled ? "font-medium text-success" : "font-medium text-muted"}>
              {enabled ? "activée" : "désactivée"}
            </span>
          </p>
          <Field
            label="Mot de passe"
            htmlFor="tf-password"
            hint={
              enabled
                ? "Requis pour désactiver la double authentification."
                : "Requis pour démarrer l'activation."
            }
            required
          >
            <Input
              id="tf-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <FeedbackLine feedback={feedback} />
          <div>
            <Button type="submit" variant={enabled ? "secondary" : "primary"} disabled={pending}>
              {pending && <Spinner />}
              {enabled ? "Désactiver la 2FA" : "Activer la 2FA"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function SessionsCard({ email }: { email: string }) {
  const [pending, setPending] = useState<"others" | "logout" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function revokeOthers() {
    setFeedback(null);
    setPending("others");
    const { error } = await authClient.revokeOtherSessions();
    setPending(null);
    setFeedback(
      error
        ? { tone: "error", text: "Impossible de révoquer les autres sessions." }
        : { tone: "success", text: "Tous les autres appareils ont été déconnectés." },
    );
  }

  async function logout() {
    setPending("logout");
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <Card>
      <CardHeader
        title="Sessions"
        description={`Connecté en tant que ${email}.`}
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={revokeOthers} disabled={pending !== null}>
          {pending === "others" && <Spinner />}
          Déconnecter les autres appareils
        </Button>
        <Button variant="secondary" onClick={logout} disabled={pending !== null}>
          {pending === "logout" && <Spinner />}
          Se déconnecter
        </Button>
      </div>
      <div className="mt-3">
        <FeedbackLine feedback={feedback} />
      </div>
    </Card>
  );
}
