/**
 * Modèles de relance d'impayé, du rappel courtois à la mise en demeure.
 * Le texte est généré puis modifiable : il sert de point de départ, pas de carcan.
 */

import { formatDate } from "./dates";
import { formatMoney, type CurrencyFormat } from "./money";

export type ReminderContext = {
  level: number;
  number: string | null;
  subject: string | null;
  clientName: string;
  contactName: string | null;
  issueDate: Date;
  dueDate: Date | null;
  balanceDue: number;
  currency: CurrencyFormat;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  daysLate: number;
  latePenaltyRate: number;
};

export function reminderSubject(ctx: ReminderContext): string {
  const ref = ctx.number ? `n° ${ctx.number}` : "en attente";
  if (ctx.level >= 4) return `Mise en demeure de payer — facture ${ref}`;
  if (ctx.level === 3) return `Dernier rappel avant mise en demeure — facture ${ref}`;
  if (ctx.level === 2) return `Relance — facture ${ref} échue depuis ${ctx.daysLate} jours`;
  return `Rappel — facture ${ref}`;
}

export function reminderBody(ctx: ReminderContext): string {
  const greeting = ctx.contactName ? `Bonjour ${ctx.contactName},` : "Bonjour,";
  const ref = ctx.number ? `n° ${ctx.number}` : "en référence";
  const amount = formatMoney(ctx.balanceDue, ctx.currency);
  const due = ctx.dueDate ? formatDate(ctx.dueDate) : "à réception";
  const object = ctx.subject ? ` (${ctx.subject})` : "";

  const signature = [
    "",
    "Bien cordialement,",
    ctx.companyName,
    ctx.companyEmail,
    ctx.companyPhone,
  ]
    .filter(Boolean)
    .join("\n");

  if (ctx.level >= 4) {
    return [
      greeting,
      "",
      `Malgré nos relances successives, la facture ${ref}${object} du ${formatDate(
        ctx.issueDate,
      )}, échue le ${due}, demeure impayée à ce jour, soit un retard de ${ctx.daysLate} jours.`,
      "",
      `Par la présente, nous vous mettons en demeure de régler la somme de ${amount} sous huitaine à compter de la réception de ce courrier.`,
      "",
      "À défaut de règlement dans ce délai, nous nous réservons le droit d'engager toute procédure de recouvrement, sans autre avis.",
      signature,
    ].join("\n");
  }

  if (ctx.level === 3) {
    return [
      greeting,
      "",
      `Sauf erreur de notre part, la facture ${ref}${object} d'un montant de ${amount}, échue le ${due}, reste impayée malgré nos précédentes relances (${ctx.daysLate} jours de retard).`,
      "",
      "Nous vous remercions de procéder au règlement sous 8 jours. Passé ce délai, une mise en demeure vous sera adressée.",
      ctx.latePenaltyRate > 0
        ? `Nous vous rappelons que tout retard de paiement donne lieu à des pénalités calculées au taux annuel de ${
            ctx.latePenaltyRate / 100
          } %.`
        : "",
      signature,
    ]
      .filter((part) => part !== "")
      .join("\n");
  }

  if (ctx.level === 2) {
    return [
      greeting,
      "",
      `Nous revenons vers vous au sujet de la facture ${ref}${object} d'un montant de ${amount}, échue le ${due} et accusant à ce jour ${ctx.daysLate} jours de retard.`,
      "",
      "Nous vous serions reconnaissants de bien vouloir procéder à son règlement dans les meilleurs délais, ou de nous indiquer la date à laquelle il interviendra.",
      "",
      "Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.",
      signature,
    ].join("\n");
  }

  return [
    greeting,
    "",
    `Sauf erreur de notre part, la facture ${ref}${object} du ${formatDate(
      ctx.issueDate,
    )}, d'un montant de ${amount}, arrivée à échéance le ${due}, n'a pas encore été réglée.`,
    "",
    "Il s'agit très probablement d'un simple oubli : nous vous remercions par avance de bien vouloir procéder au règlement.",
    "",
    "Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.",
    signature,
  ].join("\n");
}
