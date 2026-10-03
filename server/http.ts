import type { NextFunction, Request, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';

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

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
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
  console.error('[api] erreur inattendue', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
};
