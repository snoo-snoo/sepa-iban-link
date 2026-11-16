<?php

declare(strict_types=1);

/** @var string $legalPage 'impressum'|'datenschutz' */
/** @var string $basePrefix */

$homeHref = ($basePrefix !== '' ? $basePrefix : '') . '/';
$impressumHref = ($basePrefix !== '' ? $basePrefix : '') . '/impressum';
$datenschutzHref = ($basePrefix !== '' ? $basePrefix : '') . '/datenschutz';
$isImpressum = ($legalPage === 'impressum');
?>
<div class="sepa-legal-page" data-legal-page="<?= htmlspecialchars($legalPage, ENT_QUOTES, 'UTF-8') ?>">
    <header class="sepa-topbar">
        <a class="sepa-brand sepa-brand--link" href="<?= htmlspecialchars($homeHref, ENT_QUOTES, 'UTF-8') ?>">
            <span class="sepa-brand__mark" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            <span class="sepa-brand__name">SEPA-Link</span>
            <span class="sepa-brand__region">AT · DE</span>
        </a>
        <nav class="sepa-legal-switch" aria-label="Rechtliche Seiten">
            <a class="sepa-legal-switch__link<?= $isImpressum ? ' is-active' : '' ?>" href="<?= htmlspecialchars($impressumHref, ENT_QUOTES, 'UTF-8') ?>"<?= $isImpressum ? ' aria-current="page"' : '' ?>>Impressum</a>
            <a class="sepa-legal-switch__link<?= !$isImpressum ? ' is-active' : '' ?>" href="<?= htmlspecialchars($datenschutzHref, ENT_QUOTES, 'UTF-8') ?>"<?= !$isImpressum ? ' aria-current="page"' : '' ?>>Datenschutz</a>
        </nav>
        <div class="sepa-topbar__theme" data-legal-theme-slot></div>
    </header>

    <main class="sepa-legal-main">
        <p class="sepa-legal-back-wrap">
            <a class="sepa-legal-back" href="<?= htmlspecialchars($homeHref, ENT_QUOTES, 'UTF-8') ?>">← Zurück zum SEPA-Link Generator</a>
        </p>

<?php if ($isImpressum): ?>
        <article class="sepa-legal-card">
            <p class="sepa-legal-eyebrow">Offenlegung gem. § 5 ECG, § 14 UGB, § 63 GewO &amp; § 25 MedienG</p>
            <h1 class="sepa-legal-title">Impressum</h1>

            <section class="sepa-legal-section" aria-labelledby="imp-company">
                <h2 id="imp-company">Medieninhaber &amp; Diensteanbieter</h2>
                <dl class="sepa-legal-dl">
                    <div>
                        <dt>Firma</dt>
                        <dd><strong>MPI GmbH</strong></dd>
                    </div>
                    <div>
                        <dt>Unternehmensgegenstand</dt>
                        <dd>Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik</dd>
                    </div>
                    <div>
                        <dt>Geschäftsführung</dt>
                        <dd>Michael Plöckinger</dd>
                    </div>
                    <div>
                        <dt>Anschrift</dt>
                        <dd>Badstraße 14<br>A-4160 Aigen-Schlägl<br>Österreich</dd>
                    </div>
                    <div>
                        <dt>Kontakt</dt>
                        <dd>
                            E-Mail: <a href="mailto:office@mpi-erp.at">office@mpi-erp.at</a><br>
                            Web: <a href="https://www.mpi-erp.at" rel="noopener noreferrer" target="_blank">www.mpi-erp.at</a>
                        </dd>
                    </div>
                </dl>
            </section>

            <section class="sepa-legal-section" aria-labelledby="imp-register">
                <h2 id="imp-register">Firmenbuch, UID &amp; Aufsicht</h2>
                <dl class="sepa-legal-dl">
                    <div>
                        <dt>Firmenbuchnummer</dt>
                        <dd>FN 563135s</dd>
                    </div>
                    <div>
                        <dt>Firmenbuchgericht</dt>
                        <dd>Landesgericht Linz</dd>
                    </div>
                    <div>
                        <dt>UID-Nummer</dt>
                        <dd>ATU77218903</dd>
                    </div>
                    <div>
                        <dt>Kammerzugehörigkeit</dt>
                        <dd>Mitglied der Wirtschaftskammer Oberösterreich (WKOÖ), Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie (UBIT)</dd>
                    </div>
                    <div>
                        <dt>Aufsichts-/Gewerbebehörde</dt>
                        <dd>Bezirkshauptmannschaft Rohrbach</dd>
                    </div>
                    <div>
                        <dt>Berufsrechtliche Vorschriften</dt>
                        <dd>Österreichische Gewerbeordnung (GewO), E-Commerce-Gesetz (ECG) – abrufbar unter <a href="https://www.ris.bka.gv.at" rel="noopener noreferrer" target="_blank">www.ris.bka.gv.at</a></dd>
                    </div>
                </dl>
            </section>

            <section class="sepa-legal-section" aria-labelledby="imp-purpose">
                <h2 id="imp-purpose">Grundlegende Richtung (Blattlinie) &amp; Hinweis zum Dienst</h2>
                <p>Diese Website stellt ein kostenloses, rein clientseitig im Webbrowser ausgeführtes Hilfswerkzeug bereit, mit dem Nutzer standardisierte SEPA-QR-Codes (EPC069-12 / STUZZA-QR / GiroCode) und Überweisungslinks für Banken in Österreich und Deutschland erzeugen können.</p>
                <p><strong>Kein Zahlungsdienst:</strong> Die MPI GmbH erbringt über diese Website <strong>keine Zahlungsdienste</strong> im Sinne des österreichischen Zahlungsdienstegesetzes 2018 (ZaDiG 2018) bzw. der EU-Zahlungsdiensterichtlinie (PSD2). Es werden zu keinem Zeitpunkt Kundengelder entgegengenommen, verwaltet oder Zahlungen über Bank-Schnittstellen ausgelöst. Jede Überweisung wird ausschließlich vom jeweiligen Nutzer selbst in seiner eigenen Banking-App geprüft und freigegeben.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="imp-liability">
                <h2 id="imp-liability">Haftung für Inhalte &amp; Zahlungsdaten</h2>
                <p>Das Werkzeug wird unentgeltlich und ohne Gewähr für ständige Verfügbarkeit bereitgestellt. Da Zahlungslinks lokal von Nutzern selbst erstellt und direkt über Drittkanäle (z.&nbsp;B. Messenger) weitergegeben werden, hat die MPI GmbH keinen Einblick in und keinen Einfluss auf die darin codierten Angaben. Bitte prüfen Sie Empfängername, IBAN, Betrag und Verwendungszweck vor jeder Freigabe sorgfältig direkt in Ihrer Banking-App.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="imp-dispute">
                <h2 id="imp-dispute">Verbraucherstreitbeilegung &amp; Urheberrecht</h2>
                <p>Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Bei Anliegen erreichen Sie uns jederzeit direkt unter <a href="mailto:office@mpi-erp.at">office@mpi-erp.at</a>.</p>
                <p>Sämtliche auf dieser Website erstellten Texte, Quelltexte und Grafiken unterliegen dem Urheberrecht. Marken- und Bankbezeichnungen (wie George, Mein ELBA, Sparkasse u.&nbsp;a.) sind Eigentum der jeweiligen Rechteinhaber und dienen ausschließlich der sachlichen Kompatibilitätsbeschreibung.</p>
            </section>
        </article>
<?php else: ?>
        <article class="sepa-legal-card">
            <p class="sepa-legal-eyebrow">Informationen gem. Art. 13 &amp; 14 DSGVO sowie § 165 Abs. 3 TKG 2021</p>
            <h1 class="sepa-legal-title">Datenschutzerklärung</h1>

            <div class="sepa-legal-highlight">
                <strong>Das Wichtigste vorab (Privacy by Design):</strong>
                <ul>
                    <li><strong>0 Bytes Zahlungsdaten am Server:</strong> IBAN, Name, Betrag und Verwendungszweck werden beim Erstellen und Öffnen von <code>#p=…</code>-Links technisch niemals an unseren Webserver übertragen.</li>
                    <li><strong>Keine Cookies &amp; kein Tracking:</strong> Wir setzen weder Analyse-, Werbe- noch Session-Cookies ein und binden keine externen Tracker oder CDNs ein.</li>
                    <li><strong>Rein lokale Speicherung:</strong> Wenn Sie Ihre IBAN speichern, liegt sie ausschließlich im lokalen Speicher (<code>localStorage</code>) Ihres eigenen Geräts und kann jederzeit mit einem Tipp gelöscht werden.</li>
                </ul>
            </div>

            <section class="sepa-legal-section" aria-labelledby="ds-controller">
                <h2 id="ds-controller">1. Verantwortlicher</h2>
                <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
                <p>
                    <strong>MPI GmbH</strong><br>
                    Badstraße 14, A-4160 Aigen-Schlägl, Österreich<br>
                    Vertreten durch: Geschäftsführer Michael Plöckinger<br>
                    E-Mail: <a href="mailto:office@mpi-erp.at">office@mpi-erp.at</a>
                </p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-fragment">
                <h2 id="ds-fragment">2. Verarbeitung von Zahlungsdaten ausschließlich im Browser (URL-Fragment)</h2>
                <p>Beim Erstellen eines SEPA-Überweisungslinks werden Empfängername, IBAN, optional BIC, Betrag und Verwendungszweck direkt in Ihrem Browser in ein sogenanntes URL-Fragment hinter dem Rautezeichen (<code>#p=…</code>) codiert. Auch der zugehörige EPC-QR-Code sowie optionale Zahlschein-Bilder (PNG) oder PDF-Dateien werden zu 100&nbsp;% lokal auf Ihrem Endgerät berechnet.</p>
                <p>Gemäß dem verbindlichen Internet-Standard <strong>RFC 9110 (Abschnitt 7.1)</strong> übertragen Webbrowser den Teil einer Adresse hinter dem <code>#</code>-Zeichen beim Abruf einer Webseite <strong>nicht</strong> an den Webserver. Unser Server liefert lediglich das leere statische Programmgerüst aus und erfährt weder beim Erstellen noch beim Öffnen eines <code>#p=…</code>-Links, welche Kontodaten oder Beträge verwendet werden. Eine serverseitige Kodier-Schnittstelle ist technisch dauerhaft deaktiviert (HTTP-Status <code>410 Gone</code>).</p>
                <p><em>Hinweis zu älteren Kompatibilitäts-Links (<code>/p/…</code>):</em> Sollte ausnahmsweise ein älterer Pfad-Link ohne <code>#</code>-Fragment aufgerufen werden, verarbeitet der Server das im Pfad enthaltene Token ausschließlich flüchtig im Arbeitsspeicher zur unmittelbaren Auslieferung der Ansicht (mit Header <code>Cache-Control: no-store</code>) und speichert keinerlei Zahlungsdaten in einer Datenbank.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-localstorage">
                <h2 id="ds-localstorage">3. Lokaler Gerätespeicher (<code>localStorage</code>) statt Cookies</h2>
                <p>Diese Website verwendet <strong>keine Cookies</strong>. Ausschließlich dann, wenn Sie selbst aktiv Funktionen zur Komfort-Speicherung nutzen, legt Ihr Browser folgende Einträge lokal auf Ihrem Endgerät ab:</p>
                <ul>
                    <li><code>sepa_saved_profile</code>: Ihr eingegebener Empfängername, Ihre IBAN und optional Ihr BIC, wenn Sie aktiv auf „Speichern“ tippen, damit Sie beim nächsten Aufruf nur noch den Betrag eingeben müssen.</li>
                    <li><code>sepa_payer_bank:AT</code> / <code>sepa_payer_bank:DE</code>: Ihre zuletzt gewählte Banking-App auf der Zahlungsseite, um sofort die passende Kurzanleitung anzuzeigen.</li>
                    <li><code>sepa_theme</code>: Ihre gewählte Darstellung (helles oder dunkles Design).</li>
                </ul>
                <p>Diese Einträge verbleiben ausschließlich auf Ihrem Gerät, werden bei keinem Seitenaufruf an unseren Server gesendet und können jederzeit direkt in der Anwendung über „Löschen“ oder in Ihren Browser-Einstellungen entfernt werden. Rechtsgrundlage für diesen technisch erforderlichen lokalen Zugriff auf Ihr Endgerät ist §&nbsp;165 Abs.&nbsp;3 TKG&nbsp;2021 (Österreich) bzw. §&nbsp;25 Abs.&nbsp;2 Nr.&nbsp;2 TDDDG (Deutschland) sowie Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-hosting">
                <h2 id="ds-hosting">4. Hosting &amp; technische Server-Logfiles</h2>
                <p>Diese Website wird bei einem europäischen Hosting-Dienstleister betrieben:</p>
                <p><strong>ALL-INKL.COM – Neue Medien Münnich</strong><br>Inhaber: René Münnich, Hauptstraße 68, D-02742 Friedersdorf, Deutschland (Serverstandort: Deutschland / EU).</p>
                <p>Mit dem Hosting-Anbieter besteht ein Vertrag über Auftragsverarbeitung gemäß Art.&nbsp;28 DSGVO. Beim Aufruf der Website (Auslieferung von HTML-, CSS- und JavaScript-Dateien) erfasst der Webserver technisch notwendige Zugriffsdaten in sogenannten Server-Logfiles:</p>
                <ul>
                    <li>IP-Adresse des anfragenden Endgeräts</li>
                    <li>Datum und Uhrzeit der Anfrage</li>
                    <li>Aufgerufener Dateipfad (<strong>ohne</strong> <code>#p=…</code>-Fragment, da dieses vom Browser nicht gesendet wird) und HTTP-Statuscode</li>
                    <li>Übertragene Datenmenge sowie Browser-/Betriebssystem-Kennung (User-Agent)</li>
                </ul>
                <p>Durch die strikte Einstellung <code>Referrer-Policy: no-referrer</code> werden keine Referrer-Informationen weitergegeben. Die Verarbeitung erfolgt gemäß Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO auf Basis unseres berechtigten Interesses an der technisch sicheren, stabilen Auslieferung der Website sowie der Abwehr von Missbrauch und Angriffen. Logdaten werden nach den gesetzlichen bzw. betrieblichen Fristen des Hosters automatisch gelöscht.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-sharing">
                <h2 id="ds-sharing">5. Teilen über WhatsApp oder Banking-Apps</h2>
                <p>Auf der Website sind keinerlei Social-Media-Plugins oder externe Skripte eingebunden. Erst wenn Sie selbst aktiv auf „Per WhatsApp senden“ (Aufruf von <code>wa.me</code>) oder auf den Teilen-Button Ihres Betriebssystems (<code>navigator.share</code> zur Übergabe des QR-Zahlscheins an Ihre installierte Banking-App wie George, Mein ELBA oder Sparkasse) tippen, übergeben Sie selbst die entsprechenden Daten an die von Ihnen gewählte App. Ab diesem Zeitpunkt gilt die Datenschutzerklärung des jeweiligen App-Anbieters bzw. Kreditinstituts.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-contact">
                <h2 id="ds-contact">6. Kontaktaufnahme per E-Mail</h2>
                <p>Wenn Sie per E-Mail an <a href="mailto:office@mpi-erp.at">office@mpi-erp.at</a> mit uns Kontakt aufnehmen, verarbeiten wir Ihre angegebenen Kontaktdaten und den Inhalt Ihrer Nachricht ausschließlich zur Bearbeitung und Beantwortung Ihres Anliegens (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b bzw. lit.&nbsp;f DSGVO). Wir löschen diese Daten, sobald die Anfrage abschließend geklärt ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
            </section>

            <section class="sepa-legal-section" aria-labelledby="ds-rights">
                <h2 id="ds-rights">7. Ihre Rechte &amp; Beschwerdestelle</h2>
                <p>Ihnen stehen nach der DSGVO grundsätzlich die Rechte auf <strong>Auskunft</strong> (Art.&nbsp;15), <strong>Berichtigung</strong> (Art.&nbsp;16), <strong>Löschung</strong> (Art.&nbsp;17), <strong>Einschränkung der Verarbeitung</strong> (Art.&nbsp;18), <strong>Datenübertragbarkeit</strong> (Art.&nbsp;20) sowie <strong>Widerspruch</strong> (Art.&nbsp;21) zu. Wenden Sie sich hierzu jederzeit formlos an <a href="mailto:office@mpi-erp.at">office@mpi-erp.at</a>.</p>
                <p>Darüber hinaus haben Sie gemäß Art.&nbsp;77 DSGVO das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. In Österreich ist dies die:</p>
                <p>
                    <strong>Österreichische Datenschutzbehörde</strong><br>
                    Barichgasse 40–42, 1030 Wien<br>
                    Telefon: +43 1 52 152-0 · E-Mail: <a href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a> · Web: <a href="https://www.dsb.gv.at" rel="noopener noreferrer" target="_blank">www.dsb.gv.at</a>
                </p>
                <p>Nutzer mit gewöhnlichem Aufenthalt in Deutschland können sich zudem an die zuständige Datenschutz-Aufsichtsbehörde ihres Bundeslandes wenden.</p>
                <p class="sepa-legal-meta">Stand: November 2026</p>
            </section>
        </article>
<?php endif; ?>
    </main>

    <footer class="sepa-landing-footer">
        <nav class="sepa-legal-footer-nav" aria-label="Rechtliches &amp; Startseite">
            <a class="sepa-legal-footer-nav__link" href="<?= htmlspecialchars($homeHref, ENT_QUOTES, 'UTF-8') ?>">SEPA-Link Generator</a>
            <a class="sepa-legal-footer-nav__link" href="<?= htmlspecialchars($impressumHref, ENT_QUOTES, 'UTF-8') ?>">Impressum</a>
            <a class="sepa-legal-footer-nav__link" href="<?= htmlspecialchars($datenschutzHref, ENT_QUOTES, 'UTF-8') ?>">Datenschutzerklärung</a>
        </nav>
        <p>MPI GmbH · Keine Cookies · 0 Bytes Zahlungsdaten am Server</p>
    </footer>
</div>
