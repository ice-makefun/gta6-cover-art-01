// Neon Coast Cover Studio — the entry program (Node 22, standard library
// only). It hands the app in: copies app/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json with buildDossier from the
// vendored make.fun library, exactly as the kit's starter does. Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (from the kit's gate): only text_max_bytes shapes the
// dossier's bytes; the other caps refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in app/
// or 48 MiB of app files, in all, or a path under app/ over 1000 bytes).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Read the dossier back so a truncated or failed write is never silent: the
// entry is only handed in when the file on disk has the bytes we wrote.
const written = readFileSync(dossierPath);
if (written.length === 0) throw new Error('dossier.json was written empty');
console.log(`Neon Coast Cover Studio: wrote ${dossierPath} (${written.length} bytes)`);
