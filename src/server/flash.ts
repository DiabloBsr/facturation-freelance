import { redirect } from "next/navigation";

export type FlashTone = "success" | "error" | "info";

/**
 * Redirige en emportant un message : les actions serveur perdent l'état React
 * après redirection, le message est donc rejoué en toast par <FlashToaster />.
 */
export function redirectWithFlash(
  path: string,
  message: string,
  tone: FlashTone = "success",
): never {
  const [base, existing] = path.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set("flash", message);
  if (tone !== "success") params.set("tone", tone);
  redirect(`${base}?${params.toString()}`);
}
