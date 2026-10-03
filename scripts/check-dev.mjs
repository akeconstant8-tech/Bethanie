/* Lancé automatiquement avant « npm run dev » (script « predev » de package.json).
 *
 * Si Béthanie tourne déjà dans un autre terminal, un second lancement démarre une seconde API qui se dispute le
 * port 4000 avec la première : à chaque redémarrage, l'une des deux plante (« EADDRINUSE: address already in use »)
 * et l'API peut devenir injoignable pendant un moment. On arrête donc le second lancement avec un message clair.
 */
import net from 'node:net';

const API_PORT = Number(process.env.PORT ?? 4000);

/** Un programme écoute-t-il déjà sur ce port ? */
const portInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const done = (used) => {
      socket.destroy();
      resolve(used);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1000, () => done(false));
  });

/** Ce programme est-il l'API de Béthanie ? */
const isBethanieApi = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    const body = await response.json();
    return body?.ok === true;
  } catch {
    return false;
  }
};

if (await portInUse(API_PORT)) {
  const red = (text) => `\x1b[31m${text}\x1b[0m`;
  if (await isBethanieApi(API_PORT)) {
    console.error(red(`\n✖ Béthanie est déjà lancée : l'API répond sur http://localhost:${API_PORT}.`));
    console.error('  Un autre « npm run dev » tourne dans un autre terminal (ou en arrière-plan).');
    console.error('  → Utilisez-le tel quel (adresse du site affichée dans ce terminal : http://localhost:3000 ou 3001),');
    console.error('    ou arrêtez-le avec Ctrl+C avant de relancer « npm run dev ».\n');
  } else {
    console.error(red(`\n✖ Le port ${API_PORT} est déjà utilisé par un autre programme.`));
    console.error(`  Arrêtez ce programme (Windows : « netstat -ano | findstr :${API_PORT} » donne son numéro de processus)`);
    console.error('  puis relancez « npm run dev ».\n');
  }
  process.exit(1);
}
