import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.ts';
import { badRequest } from './http.ts';

fs.mkdirSync(config.uploadsDir, { recursive: true });

const FORMATS = {
  jpeg: { ext: 'jpg', check: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { ext: 'png', check: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { ext: 'webp', check: (b: Buffer) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
} as const;

/**
 * Enregistre une photo envoyée en data URL et renvoie son URL publique (/uploads/…).
 * Seuls JPEG, PNG et WebP sont acceptés, et le contenu doit correspondre au format annoncé
 * (le SVG est refusé : il peut contenir du script).
 */
export const saveImageDataUrl = (dataUrl: string): string => {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw badRequest('Photo invalide : formats acceptés JPEG, PNG ou WebP.');

  const format = FORMATS[match[1] as keyof typeof FORMATS];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > config.maxUploadBytes) throw badRequest('Photo trop lourde (2,5 Mo maximum).');
  if (!format.check(buffer)) throw badRequest('Le fichier ne correspond pas à une image valide.');

  const fileName = `${crypto.randomUUID()}.${format.ext}`;
  fs.writeFileSync(path.join(config.uploadsDir, fileName), buffer);
  return `/uploads/${fileName}`;
};

export const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';
