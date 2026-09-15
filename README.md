# ClipRush

ClipRush ist ein Song-Guessing-Spiel auf Basis von Audius. Die UI baut auf dem bereitgestellten Figma/React-Prototyp auf, wurde aber von Demo-Daten auf echte Audius-Suche und Audius-Streams umgestellt.

## Funktionen

- Login & Registrierung mit lokalem Java/H2-Backend
- Genres: All, Pop, Rock, Hip-Hop, R&B, Electronic, Jazz, Classical
- zufälliger Audius-Track aus Trending-Pool
- Hörstufen 0.1s → 0.5s → 2s → 4s → 8s
- Live-Suche nach Track/Künstler über Audius
- Punkte nach Hörstufe und Schwierigkeit
- Ergebnisansicht mit vollständigem Audius-Stream
- persistente Rangliste
- Multiplayer-Matchmaking; wenn kein zweiter Spieler gefunden wird, startet nach 7 Sekunden ein Bot-Duell

## Voraussetzungen

- Node.js 20+
- Java 21+
- Maven 3.9+
- Internetzugang für Audius

## Starten

Terminal 1:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Dann `http://localhost:5173` öffnen.

## Produktion

Frontend bauen:

```bash
cd frontend
npm install
npm run build
```

Backend bauen:

```bash
cd backend
mvn clean package
java -jar target/cliprush-api-1.0.0.jar
```

Für eine echte Deployment-Umgebung sollten Frontend und Backend unter derselben Domain oder per Reverse Proxy betrieben werden.

## Audius

Standardmäßig verwendet das Backend `https://api.audius.co/v1`. Du kannst die Basis-URL und den App-Namen überschreiben:

```bash
export AUDIUS_API_BASE=https://api.audius.co/v1
export AUDIUS_APP_NAME=ClipRush
```

Hinweis: Welche Songs verfügbar sind, hängt vom Audius-Katalog ab. Der Katalog ist nicht identisch mit Spotify.
