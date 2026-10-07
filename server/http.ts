import type { NextFunction, Request, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';
import { describeError, redact } from './logs.ts';

/** Erreur métier renvoyée telle quelle au client (message en français). */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message = 'Ressource introuvable.') => new HttpError(404, message);
export const forbidden = (message = 'Action non autorisée.') => new HttpError(403, message);
export const conflict = (message: string) => new HttpError(409, message);

// Messages par défaut en français ; les schémas précisent un message dédié pour les champs saisis par l'utilisateur.
z.setErrorMap((issue) => {
  const field = issue.path.join('.') || 'valeur';
  if (issue.code === 'invalid_string' && issue.validation === 'email') return { message: 'Adresse e-mail invalide.' };
  if (issue.code === 'too_small') return { message: `Champ « ${field} » trop court.` };
  if (issue.code === 'too_big') return { message: `Champ « ${field} » trop long.` };
  return { message: `Champ « ${field} » invalide.` };
});

/** Valide un corps de requête ; lève une erreur 400 lisible sinon. */
export const parse = <S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> => {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest(result.error.issues[0].message);
  return result.data;
};

/**
 * Un message d'erreur de Béthanie est toujours une phrase courte, écrite à la main, en français (voir les ~50
 * appels à `new HttpError(...)`, `badRequest()`, `conflict()`… dans `server/`). Ce garde-fou ne change donc rien
 * aujourd'hui : il protège contre une future erreur d'inattention (ex. `throw new HttpError(500, dbError.message)`)
 * qui renverrait au client un message de pilote de base de données, une trace d'appel ou un chemin de fichier.
 */
const looksLikeInternalLeak = (message: string) =>
  message.length > 300 ||
  /\n|\bat \S+ \(|node_modules|[A-Za-z]:\\|\/home\/|\/var\/|\bSELECT\b.*\bFROM\b|stack trace/i.test(message);

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    if (looksLikeInternalLeak(err.message)) {
      console.error('[api] Message d’erreur suspect bloqué avant envoi au client :', redact(err.message.slice(0, 500)));
      res.status(err.status).json({ error: 'Une erreur est survenue. Réessayez dans un instant.' });
      return;
    }
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Données invalides.' });
    return;
  }
  // Erreurs des middlewares Express : JSON mal formé, corps trop gros, fichier statique absent…
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const messages: Record<number, string> = {
      400: 'Requête mal formée.',
      404: 'Fichier introuvable.',
      413: 'Fichier ou requête trop volumineux.',
    };
    res.status(status).json({ error: messages[status] ?? 'Requête refusée.' });
    return;
  }
  // Résumé masqué, jamais l'objet entier : certaines bibliothèques y joignent la requête et ses en-têtes.
  console.error('[api] erreur inattendue :', describeError(err));
  res.status(500).json({ error: 'Erreur interne du serveur.' });
};
