# SEPA-Überweisungslink (AT · DE)

Web-App zum Erstellen geteilbarer SEPA-Überweisungslinks mit EPC069-12-QR (GiroCode), `payto://`- und `bank://`-URIs sowie Zahlschein-Bild/PDF für George Scan & Pay, Mein ELBA, Sparkassen-Fotoüberweisung und VR-Banking.

## Funktionen

- **Österreich & Deutschland**: IBAN-Prüfung, Bank-Erkennung (George, Mein ELBA, Bank Austria, BAWAG, Sparkasse DE, VR, ING, DKB, N26, …)
- **George Scan & Pay / Mein ELBA**: Zahlschein als Bild oder PDF teilen, QR in der Banking-App importieren
- **EPC069-12** (11 Zeilen, 331-Byte-Limit), **RFC 8905** `payto://` mit `instruction=` / `message=`
- **WhatsApp-Vorschau**: OpenGraph-Titel, Beschreibung und 1200×630 PNG/SVG-Vorschaubild auf `/p/…` (Server-Link)
- **Privat-Modus**: Hash-Token `#p=…` nur im Browser — ohne Server-Preview, ideal für sensible Daten
- **Optionale HMAC-Signatur** (`config/config.local.php` → `hmacSecret`) für verifizierte Links

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

## API-Kurzüberblick

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `GET` | `/` | Generator |
| `GET` | `/p/{token}` | Zahlungsseite |
| `POST` | `/api/encode` | Token erzeugen (JSON) |
| `GET` | `/og/{token}.png` | OpenGraph-Vorschaubild (PNG via GD, Fallback `.svg`) |
| `GET` | `/health` | Status JSON |
