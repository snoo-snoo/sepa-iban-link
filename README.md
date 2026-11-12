# SEPA-Überweisungslink (AT · DE)

DSGVO-konforme Web-App zum Erstellen geteilbarer SEPA-Überweisungslinks mit **100 % Zero-Data-Storage**: Zahlungsdaten werden ausschließlich im Browser (`localStorage` + URL-Fragment) verarbeitet — der Server speichert und akzeptiert keine IBANs per POST.

## Zero-Data-Storage & DSGVO-Architektur

- **Kein Server-Speicher**: `POST /api/encode` antwortet mit **410 Gone** — nachweislich keine serverseitige Kodierung oder Persistenz.
- **`#p=…` nach RFC 9110**: Das Fragment (`#p=<token>`) wird beim HTTP-Request **nicht** an den Server gesendet; Links bleiben Ende-zu-Ende im Browser.
- **Lokales Onboarding**: IBAN einmalig im `localStorage` hinterlegen → Betrag & Verwendungszweck wählen → teilbarer Link mit `#p=…`.
- **Legacy-Lesezugriff** (nur GET): `/p/{token}` und `/og/{token}.(png|svg)` für bestehende Server-Links; HTML mit `Cache-Control: no-store, no-cache, must-revalidate, private`.
- **Sichere Labels** in der UI: klare Hinweise zu lokaler Verarbeitung, DSGVO-Konformität und Zero-Bytes-Server-Speicherung.
- **WhatsApp / OpenGraph**: Beim Teilen von `https://domain/#p=…` crawlt WhatsApp nur `GET /` (ohne Fragment) — **Standard-Vorschaubild** unter `/og/default.png` bzw. `.svg` mit DSGVO-Botschaft (keine Zahlungsdaten).

### HTTP-Security-Header (jede Antwort)

`X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, restriktive `Permissions-Policy`, CSP mit `form-action 'none'` und `frame-ancestors 'none'`.

## Funktionen

- **Österreich & Deutschland**: IBAN-Prüfung, Bank-Erkennung (George, Mein ELBA, Bank Austria, BAWAG, Sparkasse DE, VR, ING, DKB, N26, …)
- **George Scan & Pay / Mein ELBA**: Zahlschein als Bild oder PDF teilen, QR in der Banking-App importieren
- **EPC069-12** (11 Zeilen, 331-Byte-Limit), **RFC 8905** `payto://` mit `instruction=` / `message=`
- **Optionale HMAC-Signatur** (`config/config.local.php` → `hmacSecret`) für verifizierte Legacy-Tokens

## Lokale Entwicklung

```bash
npm install
npm run build
npm run test:all
php -S 127.0.0.1:8080 -t public public/index.php
```

Frontend-Quellen: `static/src/js/`, Styles: `static/src/scss/`. Vite schreibt nach `public/assets/`.

## Deployment auf ALL-INKL (`kasserver.com`) mit PHP 8.5

### Variante A: Build am Server (SSH)

```bash
/usr/bin/php85 /usr/bin/composer install --no-dev
npm ci && npm run build
```

KAS: Domain-**Zielverzeichnis** auf `/…/public/` setzen. In `public/.htaccess` im Repo ist `AddHandler php85-cgi .php` auskommentiert (lokale Kompatibilität) — auf dem Server aktivieren oder `dist-kasserver/` nutzen (siehe unten).

PHP-Einstellungen bei ALL-INKL bevorzugt per **`public/.user.ini`**, nicht per `php_value` in `.htaccess` (CGI → HTTP 500).

Optional: `config/config.local.php` (von `config.example.php`) mit `hmacSecret`, `baseUrl`, `appTitle`.

### Variante B: Upload `dist-kasserver/`

```bash
npm run build:kasserver
```

Den Ordner `dist-kasserver/` per SFTP/FTP hochladen. Enthält `public/`, `src/`, `views/`, `config/config.example.php`, `composer.json`, Root-`.htaccess`. **`dist-kasserver/public/.htaccess`** enthält bereits `AddHandler php85-cgi .php` für PHP 8.5.

KAS **Zielverzeichnis**: `…/public/` (nicht das Repo-Root).

## Tests

| Befehl | Inhalt |
|--------|--------|
| `npm test` | Vitest (`static/src/js/**/*.test.js`) |
| `composer test` / `php tests/run.php` | PHP-Domänentests ohne PHPUnit-Laufzeit |
| `npm run test:all` | Beides nacheinander |

## HTTP-Routen (Kurzüberblick)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/` | Generator, lokales Onboarding, Hydration via `#p=…` |
| `GET` | `/p/{token}` | Legacy-Zahlungsseite (nur Lesen) |
| `POST` | `/api/encode` | **410 Gone** — Zero-Data-Storage (keine Kodierung am Server) |
| `GET` | `/og/default.(png\|svg)` | DSGVO-Standard-OpenGraph-Karte (WhatsApp `GET /`) |
| `GET` | `/og/{token}.(png\|svg)` | Legacy-Vorschaubild für `/p/…` |
| `GET` | `/health` | Status JSON |
