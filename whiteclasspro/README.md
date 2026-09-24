# White Class Pro

Eigenständiger Shop für Zahnaufhellung & zahnstärkende Nahrungsergänzung, unabhängig vom Dental Elements Hauptshop.
Kuratiert von Christian Penz, Zahntechnikermeister mit jahrzehntelanger Berufserfahrung und ehemals eigenem Dentallabor.

## Struktur
- `index.html` — Startseite (Hero, Kategorie-Kacheln, Bestseller-Produktgrid, Über-uns-Teaser, Bewertungs-Hinweis, FAQ)
- `zahnaufhellung.html` — Kategorieseite mit 6 Zahnaufhellungs-Produkten
- `zahnstaerkung.html` — Kategorieseite mit 4 zahnstärkenden Nahrungsergänzungsmitteln
- `zahnreinigung.html` — Kategorieseite Zahnreinigung (z. B. Zahnsticks); noch ohne Produkte, zeigt "Produkte folgen"
- `ueber-uns.html` — Über Christian Penz (Zahntechnikermeister, eigenes Dentallabor)
- `kontakt.html` — Kontaktseite
- `impressum.html`, `agb.html`, `datenschutz.html`, `widerruf.html`, `versand.html` — rechtliche Seiten (**Platzhalter — vor Live-Gang juristisch prüfen lassen**)
- `lexikon.html` + `lexikon.js` + `lexikon.json` — Lexikon mit Suche über Begriffe **und** Produkte. Neue Begriffe einfach in `lexikon.json` ergänzen (`question`, `summary`, `body`, alternative Schreibweisen in `keywords`, Verweise in `related`/`products`). **Texte vor Live-Gang fachlich von Christian Penz prüfen lassen** (Health-Claims: nur zugelassene Formulierungen, keine Heilversprechen).
- `produkt.html` — Produktdetailseite; zeigt unten passende Vorschläge ("Das könnte dir auch gefallen") aus derselben bzw. anderen Kategorien
- `styles.css` — zentrale Styles & Farbvariablen, inkl. Kategorie-Kacheln, Katalog-Produktkarten und Experten-Sektion
- `logo.jpg` — White Class Pro Logo (komprimiert, ca. 30 KB); `favicon.png` / `apple-touch-icon.png` daraus abgeleitet

## Produktsortiment (Stand: aktuelle Recherche)

**Zahnaufhellung**
1. White Class Pro Zahnaufhellungs-Set (Flaggschiff, PAP-Formel) — 29,00 €
2. Whitening-Strips, 14er-Set — 14,90 €
3. Aktivkohle-Zahnweiß-Pulver — 12,90 €
4. Home-Whitening-Komplettset mit LED — 34,90 €
5. LED-Whitening-Lampe (Zubehör) — 19,90 €
6. Hydroxyapatit-Whitening-Zahncreme — 16,90 €

**Zahnstärkung**
7. Calcium-Magnesium-Zink + Vitamin D3/K2 Kapseln, 90 Stk — 19,90 €
8. Vitamin D3+K2 Tabletten, 200 Stk — 22,90 €
9. Magnesium-Citrat-Tabletten — 19,90 €
10. Calcium-Magnesium-Zink Patches, 30 Stk — 24,90 €

Verkaufspreise sind vorläufige Vorschläge auf Basis recherchierter Einkaufspreise (AliExpress) mit üblicher
Dropshipping-Marge — vor Go-live prüfen und ggf. anpassen. Einkaufspreise selbst erscheinen bewusst nirgends
auf der Website.

## Reine HTML/CSS-Version
Kein Build-Schritt nötig — einfach `index.html` im Browser öffnen. Checkout, Kundenkonto sowie robots.txt/sitemap.xml/Produkt-SEO (siehe unten) brauchen allerdings Vercel für die Serverfunktionen in `api/` — auf GitHub Pages liefen nur die statischen Seiten ohne diese Funktionen.

## SEO & Auffindbarkeit
- `api/robots.js` und `api/sitemap.js` erzeugen `/robots.txt` bzw. `/sitemap.xml` live bei jeder Anfrage (Weiterleitung dafür in `vercel.json`) — die Domain wird automatisch aus der Anfrage erkannt (wie bei `SITE_URL` in `api/checkout.js`), die Sitemap zieht ihre Produkt-URLs direkt aus `products.json` und bleibt so immer aktuell.
- `api/produkt.js` liefert `produkt.html` mit pro-Produkt `<title>`, Meta-Description, Open-Graph-Tags (für Vorschauen bei WhatsApp/Social) und `schema.org`-Product-Markup aus. **Bewusst ohne `aggregateRating`**, solange es kein echtes Bewertungssystem gibt — erfundene Bewertungssterne in Google-Snippets gelten als irreführende Werbung.
- Jede Seite hat jetzt ein Favicon (`favicon.png`, `apple-touch-icon.png`).

## Navigation
- Links neben dem Logo: direkte Links (Zahnaufhellung, Zahnstärkung, Zahnreinigung, Über uns, FAQ, Kontakt); rechts Sprache, Anmelden (Dummy login.html) und Warenkorb
- Kategorieseiten haben eine Such-/Sortierleiste über dem Produktgrid (Name durchsuchen, nach Preis sortieren) — rein clientseitig in `shop.js`, keine neue Abhängigkeit.
- Rechts: Sprachauswahl (🌐 DE ▾) — Umschalter für Englisch, Polnisch, Niederländisch, Französisch, Spanisch. Die Sprachen sind aktuell als "bald verfügbar" hinterlegt, da noch keine übersetzten Seiteninhalte existieren — das UI ist vorbereitet, die eigentliche Übersetzung ist ein separater nächster Schritt.
- Mobil: Hamburger-Menü (`script.js`) klappt die Navigation auf; "Menü" erscheint dabei links unter dem Logo, die Sprachauswahl gegenüber rechts. Beide öffnen ihr Dropdown per Tap als schwebende Karte darunter (wie am Desktop), nicht als ausklappende Liste, die den Header aufbläht — es ist dabei immer nur eines der beiden Dropdowns gleichzeitig offen.
- Die Dropdown-Menüs (Desktop) waren zeitweise nicht anklickbar (Hover-Lücke zwischen Button und Menü) — behoben durch eine nahtlose Hover-Brücke in `styles.css`.

## Fixierter Header
- Promo-Banner, Logo und Navigation sind auf allen 10 Seiten in `.site-header-fixed` zusammengefasst und per `position:fixed` dauerhaft am oberen Bildschirmrand sichtbar, auch beim Scrollen.
- `script.js` misst die tatsächliche Höhe dieses Bereichs bei jedem Laden/Resize und setzt sie als CSS-Variable `--header-h`, damit der Seiteninhalt exakt darunter beginnt (kein Überlappen, funktioniert unabhängig davon, ob der Promo-Banner ein- oder zweizeilig umbricht).
- Sprungmarken (`#faq` usw.) berücksichtigen den fixierten Header automatisch (`scroll-padding-top`), Ziel-Abschnitte werden also nicht darunter versteckt.
- Mobil: Wird das aufgeklappte Menü auf einem kurzen Bildschirm höher als der sichtbare Bereich, wird es automatisch intern scrollbar statt über den Viewport hinauszulaufen.

## Mobile Ansicht
- Alle Seiten wurden bei 375px Breite geprüft (kein horizontales Scrollen mehr)
- Hero-, Kategorie-, Produkt- und Footer-Grids brechen auf Mobilgeräten in eine bzw. zwei Spalten um
- Navigation läuft über ein eigenes Hamburger-Menü (`script.js`, keine externen Abhängigkeiten)

## Offene Punkte
- Rechtstexte sind Platzhalter, kein finaler Rechtsinhalt
- Kontaktformular hat noch keine Backend-Anbindung
- Produktbilder sind Emoji-/Text-Platzhalter — echte Produktfotos vor Live-Gang einsetzen
- Presselogos und Kundenstimmen wurden von der Startseite entfernt (gab es nicht); dort steht jetzt "Sind Sie mit uns zufrieden? … Hier abgeben" (`.review-cta` in `index.html`), der Button zeigt vorerst auf `kontakt.html` — auf den echten Bewertungslink (z. B. Google/Trustpilot) umstellen
- Die erfundenen Sternebewertungen wurden entfernt (`rating`/`reviews` gibt es in `products.json` nicht mehr, ebenso die Sortierung "Beste Bewertung"). Erst wieder anzeigen, wenn es ein echtes Bewertungssystem gibt; dann auch `aggregateRating` in `api/produkt.js` ergänzen.
- Checkout (Stripe) läuft über `api/checkout.js`; braucht die Vercel-Umgebungsvariable `STRIPE_SECRET_KEY` (nie im Code ablegen). Versand: `shipping.json` (4,90 €, kostenlos ab 50 €, nur DE).
- Rabattcodes: Eingabefeld im Warenkorb + `api/coupon.js`/`api/checkout.js` prüfen den Code live gegen Stripe. Damit ein Code funktioniert, muss er vorher im Stripe-Dashboard unter Produkte → Gutscheincodes (Coupon + zugehöriger Promotion Code) angelegt werden.

## Bestellübersicht im Kundenkonto (Stripe-Webhook)
Bezahlte Bestellungen landen jetzt automatisch in einer Supabase-Tabelle und erscheinen im
Kundenkonto unter "Meine Bestellungen" (`konto.html`). Drei Schritte, damit das live funktioniert:

1. **Supabase-Tabelle anlegen:** Inhalt von `supabase/orders.sql` im Supabase-Dashboard unter
   *SQL Editor* ausführen (legt die Tabelle `orders` inkl. Row-Level-Security an — Kunden können
   darüber nur ihre eigenen Bestellungen lesen, nie schreiben).
2. **Webhook in Stripe anlegen:** Stripe-Dashboard → *Entwickler → Webhooks → Endpunkt hinzufügen*.
   - URL: `https://<eure-domain>/api/webhook`
   - Events: `checkout.session.completed` und `checkout.session.async_payment_succeeded`
   - Nach dem Anlegen das angezeigte **Signing Secret** (beginnt mit `whsec_...`) kopieren.
3. **Zwei neue Vercel-Umgebungsvariablen setzen** (Projekt → Settings → Environment Variables),
   dann neu deployen:
   - `STRIPE_WEBHOOK_SECRET` — das eben kopierte Signing Secret
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase-Dashboard → Project Settings → API → **service_role**-Key
     (nicht der `anon`/`publishable`-Key aus `supabase-config.js`!). Dieser Key umgeht Row Level
     Security komplett — nirgends außer in dieser einen Vercel-Variable eintragen, niemals ins
     Git-Repo oder in clientseitigen Code.

Zum Testen: eine Test-Bestellung durchklicken (Stripe-Testmodus, Testkarte `4242 4242 4242 4242`),
danach im Stripe-Dashboard unter dem Webhook-Endpunkt prüfen, ob die Zustellung mit Status 200
ankam, und im Supabase Table Editor, ob eine Zeile in `orders` erschienen ist.
- Verkaufspreise sind vorläufig, keine Wirkversprechen zu den Nahrungsergänzungsmitteln ungeprüft übernehmen (Health-Claims-Verordnung beachten)

## Checkliste vor dem Live-Gang
Offene Platzhalter auflisten: `node pruefe-platzhalter.js` (endet mit Fehlercode, solange welche da sind). Nicht darin enthalten: Emoji-Produktbilder (durch echte Fotos ersetzen).

**Pflichten für den Versand an Privatkunden in Deutschland** (Platzhalter dazu stehen gelb markiert auf `versand.html`; rechtlich von IHK oder Fachanwalt prüfen lassen):
- [ ] **Verpackungsgesetz:** vor dem ersten Verkauf im Verpackungsregister LUCID registrieren (kostenlos), Verpackungen bei einem dualen System lizenzieren und die Mengen melden. Registrierungsnummer und Systemname auf `versand.html` eintragen. Gilt bei Direktversand aus dem Ausland in der Praxis für uns als Verkäufer, nicht für den Lieferanten.
- [ ] **Batteriegesetz** (nur wenn Produkte Batterien oder Akkus enthalten, z. B. LED-Lampe oder LED-Set): Registrierung beim Umweltbundesamt, Rückgabe-Hinweis im Shop.
- [ ] **Elektrogesetz** (nur wenn Elektrogeräte verkauft werden): Registrierung bei der Stiftung ear (WEEE-Nummer), Rücknahme-Hinweis im Shop.
- [ ] **Kosmetikverordnung** (Zahnaufhellungsprodukte): verantwortliche Person in der EU benennen, Produkte im EU-Portal CPNP notifizieren, Kennzeichnung prüfen; für Wasserstoffperoxid gelten Grenzwerte.
- [ ] **Nahrungsergänzungsmittel:** Erstinverkehrbringen beim BVL anzeigen; nur zugelassene Health Claims verwenden (die Produkttexte werden später mit den echten Produkten überarbeitet).
- [ ] Rechtstexte (Impressum, AGB, Datenschutz, Widerruf) juristisch prüfen lassen.
- [ ] Werbeaussagen prüfen: "30 Tage Geld-zurück" nur behalten, wenn es wirklich angeboten wird (gesetzlich sind 14 Tage Widerruf). "Made in Germany" ist entfernt, weil nichts in Deutschland gefertigt wird; "Designed in Germany" nur, wenn Entwicklung/Design tatsächlich in Deutschland stattfinden. Lieferzeit 7–10 Werktage steht auf Startseite, Versand-Seite und in den AGB.
- [ ] TikTok-Link, Produktfotos und den Bewertungslink ("Hier abgeben") ersetzen.
