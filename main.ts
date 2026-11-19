// Neon Shore Cover Studio — entry program for gta6-cover-art-01.
//
// Node 22, standard library only. It gathers what the grader needs: the
// static web app in app/, the screenshots in screenshots/, and a dossier
// built from them with the vendored make.fun library.
//
// The program runs twice in a clean container with no network, a read-only
// copy of this repository and a writable output folder, so it must be
// deterministic: copy the same files, write the same dossier bytes. It
// writes nothing else and reads nothing outside this repository.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the folder holding this file.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// The grader hands us /output; a local run names its own folder instead.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// Hand in the whole app folder: index.html, its styles, scripts, fonts and
// sample photos — everything the browser needs, nothing else.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// Hand in the screenshots, if the folder is there (it always is in the repo).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Build the dossier the judge reads, with the same caps the sealed scorer
// enforces (reference/gate.json): at most 160 KiB of source text, 4
// screenshots of at most 256 KiB each, app/ at most 993 entries and 48 MiB,
// no app/ path longer than 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
