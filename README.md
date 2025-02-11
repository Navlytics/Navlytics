# Navlytics - User Experience Tracking Framework

Navlytics ist ein leichtgewichtiges Web-Tracking-Framework zur automatisierten Analyse der User Experience (UX). Es erfasst Nutzerinteraktionen auf einer Webseite, visualisiert diese in einem Dashboard und hilft Entwicklern dabei, die Benutzerfreundlichkeit zu optimieren.

## Installation

Führe die folgenden Schritte aus, um Navlytics in dein Projekt zu integrieren:

1. Installiere das npm-Modul:
   ```sh
   npm install navlytics
   ```

2. Füge den folgenden Code am Anfang deiner Server-Datei hinzu:
   ```javascript
   const port = 3000;
   const app = express();
   const http = require('http').createServer(app);
   const io = require('socket.io')(http);
   const initializeTrackingServer = require('navlytics');
   
   initializeTrackingServer(io, app, port);
   
   app.use(express.static(__dirname));
   ```

3. Integriere die Tracking-Skripte in jede HTML-Datei, die überwacht werden soll:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.4/socket.io.js"></script>
   <script id="tracking-script" src="tracking.js"></script>
   ```

Nach der Installation ist das Dashboard unter `/monitoring` erreichbar.

## Wichtig: Vergabe von IDs
Achte darauf, dass jedes HTML-Element, das getrackt werden soll, eine eindeutige ID besitzt. Die Auswertung und das Tracking basieren auf diesen IDs, um Elemente eindeutig identifizieren zu können.

## Features

- **Maus-Tracking**: Erfasst Mausbewegungen, Klicks und Verweildauer.
- **Heatmap-Generierung**: Visualisiert Nutzeraktivitäten auf der Webseite.
- **Bot-Erkennung**: Identifiziert verdächtige Interaktionsmuster.
- **Responsive Analyse**: Unterstützt verschiedene Bildschirmgrößen und Geräte.
- **Live-Dashboard**: Echtzeit-Visualisierung der erfassten Nutzerdaten.

## Anwendung

1. **Server starten**
   ```sh
   node server.js
   ```

2. **Zugriff auf das Dashboard**
   Öffne deinen Browser und rufe `http://localhost:{PORT}/monitoring` auf.

3. **Nutzerinteraktionen auswerten**
   - Überprüfe Heatmaps zur Identifikation häufig genutzter Elemente.
   - Analysiere Mausbewegungen, um Schwachstellen im UX-Design zu erkennen.
   - Erkenne Bots und verhindere unerwünschte Interaktionen.

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Beiträge sind willkommen!

---

Bei Fragen oder Anregungen können Sie sich gerne an uns wenden.

<div class="horizontalflex">
<div class="verticalflex">
<b>Kagan Demirer</b><br>

<img src="https://avatars.githubusercontent.com/u/94038933?v=4" class="profile-picture" alt="Kagan Demirer Profilepicture">

Matrikelnummer: 5642666</br>
Mail: privat@kagandemirer.de</br>
[GitHub Profile](https://github.com/KaganDemirer)
</div>
<div class="verticalflex">
<b>Claudius Laur</b><br>

<img src="https://avatars.githubusercontent.com/u/121173722?v=4" class="profile-picture" alt="Claudius Laur Profilepicture">

Matrikelnummer: 1444877</br>
Mail: privat@claudiuslaur.de</br>
[GitHub Profile](https://github.com/DrmedAllel)
</div>
</div>
