import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const claspDir = dirname(fileURLToPath(import.meta.url));
const periodDir = join(claspDir, '..');
const buildDir = join(claspDir, 'build');

const files = [
  ['automation/apps-script-ad26.js', 'apps-script-ad26.js'],
  ['automation/apps-script-email-preview-ad26.js', 'apps-script-email-preview-ad26.js'],
  ['templates/email-invitacion-ad26.html', 'email-invitacion-ad26.html'],
  ['templates/email-recordatorio-asignacion-ad26.html', 'email-recordatorio-asignacion-ad26.html'],
  ['clasp/appsscript.json', 'appsscript.json']
];

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });

for (const [source, destination] of files) {
  await cp(join(periodDir, source), join(buildDir, destination));
}

console.log(`Apps Script AD26 preparado: ${files.length} archivos.`);
