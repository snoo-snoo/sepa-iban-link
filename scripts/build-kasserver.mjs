#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-kasserver');

const COPY_ENTRIES = [
  { src: 'public', dest: 'public' },
  { src: 'src', dest: 'src' },
  { src: 'views', dest: 'views' },
  { src: 'config/config.example.php', dest: 'config/config.example.php' },
  { src: '.htaccess', dest: '.htaccess' },
  { src: 'composer.json', dest: 'composer.json' },
];

const KASSERVER_PUBLIC_HTACCESS = `# ALL-INKL (kasserver.com) — document root /public/ with PHP 8.5 CGI
AddHandler php85-cgi .php

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L]
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 7 days"
    ExpiresByType application/javascript "access plus 7 days"
    ExpiresByType image/png "access plus 30 days"
    ExpiresByType image/jpeg "access plus 30 days"
    ExpiresByType image/svg+xml "access plus 1 day"
</IfModule>
`;

async function copyPath(srcRel, destRel) {
  const src = join(root, srcRel);
  const dest = join(out, destRel);
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
}

async function main() {
  await mkdir(out, { recursive: true });
  for (const entry of COPY_ENTRIES) {
    await copyPath(entry.src, entry.dest);
  }

  const repoPublicHtaccess = join(root, 'public', '.htaccess');
  let publicHtaccess = KASSERVER_PUBLIC_HTACCESS;
  try {
    const existing = await readFile(repoPublicHtaccess, 'utf8');
    if (existing && !publicHtaccess.includes('RewriteRule')) {
      publicHtaccess = `AddHandler php85-cgi .php\n\n${existing}`;
    }
  } catch {
    /* use template */
  }

  await writeFile(join(out, 'public', '.htaccess'), publicHtaccess, 'utf8');
  console.log(`dist-kasserver/ ready for SFTP upload (KAS Zielverzeichnis → …/public/)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
