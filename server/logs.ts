/* Journaux sans secret : tout texte venu de l'extérieur (erreur d'une bibliothèque, réponse de GeniusPay, de Google
 * ou de l'API Claude) passe par redact() avant console.log/console.error ; une erreur est résumée par describeError(),
 * jamais affichée en entier (certaines bibliothèques y joignent la requête, en-têtes d'autorisation compris).
 */

/** Variables dont la valeur ne doit jamais apparaître dans un journal (en plus des motifs ci-dessous). */
const SENSITIVE_NAME = /SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|CLIENT_EMAIL/i;

const sensitiveValues = () =>
  Object.entries(process.env)
    .filter(([name, value]) => SENSITIVE_NAME.test(name) && typeof value === 'string' && value.trim().length >= 8)
    .flatMap(([, value]) => {
      const v = value!.trim();
      // Clé privée écrite avec des « \n » littéraux dans les variables : les deux formes sont masquées.
      return v.includes('\\n') ? [v, v.replace(/\\n/g, '\n')] : [v];
    })
    .sort((a, b) => b.length - a.length);

const PATTERNS: [RegExp, string][] = [
  [/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '[clé privée masquée]'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [masqué]'],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '[jeton masqué]'],
  [/\b(sk|pk)_(sandbox|live|test)_[A-Za-z0-9]+/g, '$1_$2_[masqué]'],
  [/\bwhsec_[A-Za-z0-9]+/g, 'whsec_[masqué]'],
  [/\bsk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-[masqué]'],
  [/([?&](?:auth[_-]?token|token|api[_-]?key|key|secret|password|signature)=)[^&\s"']+/gi, '$1[masqué]'],
  // Valeur déjà masquée (« [ ») laissée telle quelle.
  [/("?\b(?:authorization|x-api-key|api[_-]?key|secret|password|auth[_-]?token|access[_-]?token|token|private[_-]?key)\b"?\s*[:=]\s*"?)[^"\s,}[]+/gi, '$1[masqué]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[e-mail masqué]'],
];

/** Texte sûr pour un journal : valeurs des variables secrètes, clés, jetons, mots de passe et e-mails masqués. */
export const redact = (text: string): string => {
  let out = text;
  for (const value of sensitiveValues()) out = out.split(value).join('[secret masqué]');
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  return out;
};

/** Résumé d'une erreur pour les journaux : type, code, message, cause et 3 premières lignes de la pile, masqués. */
export const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) return redact(String(error)).slice(0, 500);
  const code = (error as { code?: unknown }).code;
  const cause = error.cause instanceof Error ? ` — cause : ${error.cause.message}` : '';
  const where = (error.stack ?? '').split('\n').slice(1, 4).map((line) => line.trim()).join(' < ');
  return redact(`${error.name}${code ? ` (${String(code)})` : ''} : ${error.message}${cause}${where ? ` — ${where}` : ''}`).slice(0, 1000);
};
