# White Class Pro

Eigenständiger Shop für Zahnaufhellung & zahnstärkende Nahrungsergänzung, unabhängig vom Dental Elements Hauptshop.
Kuratiert von Christian Penz, Zahntechnikermeister mit jahrzehntelanger Berufserfahrung und ehemals eigenem Dentallabor.

## Struktur
- `index.html` — Startseite (Hero, Kategorie-Kacheln, Bestseller-Produktgrid, Über-uns-Teaser, So funktioniert's, Testimonials, FAQ)
- `zahnaufhellung.html` — Kategorieseite mit 6 Zahnaufhellungs-Produkten
- `zahnstaerkung.html` — Kategorieseite mit 4 zahnstärkenden Nahrungsergänzungsmitteln
- `ueber-uns.html` — Über Christian Penz (Zahntechnikermeister, eigenes Dentallabor)
- `kontakt.html` — Kontaktseite
- `impressum.html`, `agb.html`, `datenschutz.html`, `widerruf.html`, `versand.html` — rechtliche Seiten (**Platzhalter — vor Live-Gang juristisch prüfen lassen**)
- `styles.css` — zentrale Styles & Farbvariablen, inkl. Kategorie-Kacheln, Katalog-Produktkarten und Experten-Sektion
- `logo.png` — White Class Pro Logo

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
Kein Build-Schritt nötig — einfach `index.html` im Browser öffnen. Für GitHub Pages: Repo unter Settings → Pages auf den `main`-Branch zeigen lassen, dann ist die Seite direkt live.

## Navigation
- Links: "Menü ▾" — Dropdown mit allen Bereichen (Zahnaufhellung, Zahnstärkung, Über uns, So funktioniert's, FAQ, Kontakt)
- Rechts: Sprachauswahl (🌐 DE ▾) — Umschalter für Englisch, Polnisch, Niederländisch, Französisch, Spanisch. Die Sprachen sind aktuell als "bald verfügbar" hinterlegt, da noch keine übersetzten Seiteninhalte existieren — das UI ist vorbereitet, die eigentliche Übersetzung ist ein separater nächster Schritt.
- Mobil: Hamburger-Menü (`script.js`) klappt die Navigation auf; "Menü" erscheint dabei links unter dem Logo, die Sprachauswahl gegenüber rechts. Beide öffnen ihr Dropdown per Tap als schwebende Karte darunter (wie am Desktop), nicht als ausklappende Liste, die den Header aufbläht — es ist dabei immer nur eines der beiden Dropdowns gleichzeitig offen.
- Die Dropdown-Menüs (Desktop) waren zeitweise nicht anklickbar (Hover-Lücke zwischen Button und Menü) — behoben durch eine nahtlose Hover-Brücke in `styles.css`.

## Fixierter Header
- Promo-Banner, Logo und Navigation sind auf allen 10 Seiten in `.site-header-fixed` zusammengefasst und per `position:fixed` dauerhaft am oberen Bildschirmrand sichtbar, auch beim Scrollen.
- `script.js` misst die tatsächliche Höhe dieses Bereichs bei jedem Laden/Resize und setzt sie als CSS-Variable `--header-h`, damit der Seiteninhalt exakt darunter beginnt (kein Überlappen, funktioniert unabhängig davon, ob der Promo-Banner ein- oder zweizeilig umbricht).
- Sprungmarken (`#faq`, `#so-funktioniert` usw.) berücksichtigen den fixierten Header automatisch (`scroll-padding-top`), Ziel-Abschnitte werden also nicht darunter versteckt.
- Mobil: Wird das aufgeklappte Menü auf einem kurzen Bildschirm höher als der sichtbare Bereich, wird es automatisch intern scrollbar statt über den Viewport hinauszulaufen.

## Mobile Ansicht
- Alle Seiten wurden bei 375px Breite geprüft (kein horizontales Scrollen mehr)
- Hero-, Kategorie-, Produkt- und Footer-Grids brechen auf Mobilgeräten in eine bzw. zwei Spalten um
- Navigation läuft über ein eigenes Hamburger-Menü (`script.js`, keine externen Abhängigkeiten)

## Offene Punkte
- Rechtstexte sind Platzhalter, kein finaler Rechtsinhalt
- Kontaktformular hat noch keine Backend-Anbindung
- Produktbilder sind Emoji-/Text-Platzhalter — echte Produktfotos vor Live-Gang einsetzen
- Kundenstimmen und Bewertungszahlen sind Platzhalter — durch echte Reviews ersetzen, sobald vorhanden
- Kein Warenkorb/Checkout — "Zur Bestellung"-Buttons verlinken aktuell auf die Kontaktseite
- Verkaufspreise sind vorläufig, keine Wirkversprechen zu den Nahrungsergänzungsmitteln ungeprüft übernehmen (Health-Claims-Verordnung beachten)
