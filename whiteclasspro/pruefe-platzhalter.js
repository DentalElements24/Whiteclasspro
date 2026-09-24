// Vor dem Live-Gang ausführen:   node pruefe-platzhalter.js
// Listet alle noch offenen Platzhalter in den Seiten und Datendateien auf. Endet mit Fehlercode 1,
// solange noch welche da sind. (Emoji-Produktbilder erkennt das Skript nicht — siehe README-Checkliste.)
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter((f) => /\.(html|json)$/.test(f));
let found = 0;

files.forEach((f) => {
  fs.readFileSync(path.join(__dirname, f), 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (/platzhalter/i.test(line)) {
      found++;
      const text = line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(f + ':' + (i + 1) + '  ' + text.slice(0, 140));
    }
  });
});

console.log(found ? '\n' + found + ' offene Platzhalter — vor dem Live-Gang ersetzen oder entfernen.' : 'Keine Platzhalter gefunden.');
process.exit(found ? 1 : 0);
