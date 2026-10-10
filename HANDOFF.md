# Fitme — przekazanie projektu (handoff)

Notatka dla Claude, który przejmuje pracę (np. w chmurze). Komunikuj się z użytkownikiem **po polsku**.
Użytkownik jest wymagający: chce, żeby było „porządnie, bez błędów". Każdą zmianę wizualną weryfikuj renderem,
zanim ją zgłosisz.

## Czym jest Fitme
Fitme to kreator outfitów 3D z polskim interfejsem.
- Na manekinie (mężczyzna albo kobieta) układa się ubrania, buty, fryzurę i akcesoria.
- Gotowe fity można zapisywać i udostępniać kodem `FIT3.…`.
- Są gotowe stylizacje (zakładka „Społeczność") i pozy manekina.
- Technologia: three.js r147, zwykłe skrypty `<script>` ze wspólnym globalnym zakresem, bez bundlera.
- Jest wersja przeglądarkowa (`fitme.html`) i aplikacja desktopowa Electron 44 (`app/`).

## Struktura plików
```
fitme.html          strona: CSS, układ UI, <script src="js/…?v=12"> (podbijaj ?v= przy zmianach)
js/core.js          narzędzia, geometria (tube/surf/ribbon), tekstury tkanin (weaveTex/colorTex/paintStruct),
                    materiały (fabric/plain/metalMat), finalize() (scala meshe per materiał), QUALITY/GEO_Q
js/data.js          dane: TOPS/OUTERS/BOTTOMS/SHOES, CATALOG, kolory, BODY_TYPES, DEFAULT (stan), INSPO (gotowe fity)
js/mhdata.js        WYGENEROWANY (tools/mh/process.py): siatka MakeHuman (CC0), wagi kości, delty sylwetek
js/mh.js            manekin: mhMorph (mięśnie/tłuszcz), mhShape (proporcje), Catmull-Clark, smoothSpots,
                    neckFlare, seamAttrs (szwy), coreModel
js/body.js          setupBody (wzrost, głowa-jajo, BC.*), skinMat (shader szwów i dzianiny), głowa
js/fit.js           tabele kadłuba (fitTables), mapTorso/mapLeg/mapArm, rozmiary (sizeEase, pantsSize)
js/shell.js         ★ SILNIK UBRAŃ (szczegóły niżej)
js/clothes.js       buildTop/buildBottom/spódnice — „wykroje" parametryczne + detale (kieszenie, guziki, pasek)
js/outer.js         kurtki, płaszcze, swetry rozpinane (buildOuter/buildMid)
js/shoes.js         buty (kopyto dopasowane do stopy BC.foot), skarpetki (z powierzchni nogi)
js/acc.js           akcesoria: czapki, okulary, zegarek, biżuteria, torby, szaliki, bandany, rękawiczki
js/hair.js          fryzury (proceduralne: powłoka + opadające arkusze + pukle), zarost
js/pose.js          pozy: wagi kości → DQ skinning całej ubranej figury; POSES (stand, relaxed, walk, hip, open, apose, tpose)
js/app.js           UI, buildInto (cache BUILT, szybka podmiana materiałów), opcje (OPT/applyOpts), strony, zapis
app/                Electron: main.js, build.js (kopiuje web + three.js do app/web), package.json
tools/mh/           pipeline MakeHuman: process.py + recipe.json + base.obj + *.target + szkielet/wagi
tools/qa/           skrypty QA (CDP do aplikacji): cdp.js, shot.js, sync.sh, cpuprof.js, fa/fb/final2.js, sw.js
dev.js, reload.js   pomocnicze (dev)
podglad-stylizacji.png  ostatni podgląd wysłany użytkownikowi
```

## Pipeline budowy postaci (buildInto w app.js)
1. `setupBody()`: ciało z mhMorph(mus, fat) i mhShape (suwaki proporcji). Liczy wymiary BC.* (headC, hd, shX, shY, foot, meas).
2. `runBuilders`: budowanie „wykrojów" w kolejności bottom, top, mid, outer, hair, acc, shoes. Meshe dostają tagi
   `userData.ctx/layer/main` (mk / mkMain w core.js).
3. `buildShells(G,GS)` w shell.js zamienia główne rury wykrojów na powłoki zrobione z powierzchni ciała:
   - **Siatki wykrojów.** PGrid to siatki biegunowe per region: 0 tułów, 1/2 ręce, 3/4 nogi.
   - **Dopasowanie per wierzchołek ciała.** Liczy pokrycie f (SDF), luz e i cel X.
     - `shLayerFit`: L.fitE (luz z kroju i rozmiaru), L.rank (kolejność warstw), L.waistK (zależnie od kroju spodni), L.sleeveless.
     - Pod klatką limit luzu `wcap` (to naprawiło „+20 cm w pasie").
     - „Falls straight down": materiał opada z klatki, biustu (`B.rawAt`) i brzucha.
   - **Relaks i kolejność.** `shRelax`, potem `shOrder` (warstwy wg rank), potem `shObstacleGrids` / `shObstacles` (buty, cholewki).
   - **Grawitacja.** `shDrape`: symulacja PBD na siatce poziomu 1. „hold" w ramionach, pasie i biuście; L.comp to
     ściśnięcie, które pogłębia fałdy.
   - **Wykończenie.** shHull (mostki nad zagłębieniami klatki dla sztywnych warstw), shFolds, shMidline, shBodyClear (krok,
     „nie pod skórą"), drugi shOrder, shEmit (cięcie po f=0, zawinięta krawędź, normalne w punktach sutków/pępka).
   - **Poniżej krocza.** Koszule, kurtki i płaszcze mają tam „kurtynę" `shCurtain`, zwisającą z krawędzi powłoki.
   - **Detale.** Kieszenie, guziki itp. są przesadzane (shShiftGrid/shReseat). Zakryte wyższą warstwą są ukrywane
     (shHideCovered plus przejście „late").
   - **Przepychanie na zewnątrz.** Torby (`shBagsOut`), zegarek pod mankietem (`shUnderSleeves`), włosy (`shReseatHair`).
4. Opcjonalnie poza: `poseAssign` (wagi), potem `finalize` (scalenie i WARP pionowy), potem `posePose`.
5. Cache:
   - `BUILT` trzyma ubraną figurę. Zmiana tylko pozy: ok. 0,15 s.
   - Zmiana tylko kolorów: podmiana materiałów (`shapeKey`/`LOOK_KEYS`), ok. 0,4 s.
   - Pełna przebudowa: ok. 1,7–3,5 s.

## Generowanie manekina (tools/mh)
- `python process.py` (wymaga numpy) czyta `recipe.json` (osobno płeć m i f) i pliki `*.target` MakeHuman, a zapisuje `mhdata.js`.
  Skopiuj wynik do `js/mhdata.js`.
- Eksportuje: pozycje, wagi kości (skinI/skinW, 19 grup), punkty kotwic stawów, delty sylwetek (mp/mn/wp/wn = więcej/mniej
  mięśni i tłuszczu).
- Kąty rąk (R1 8,5°, R2) są ustawione w funkcji `make()`.
- Brakujące targety można dobrać z
  https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/... (CC0).

## Pakowanie aplikacji desktopowej (Windows)
`cd app && npm install && npm run package` daje `app/dist/Fitme-win32-x64/Fitme.exe`. Przy EPERM przy rename uruchom ponownie.
`node_modules` i `dist` nie są w repo (patrz .gitignore).

## QA / weryfikacja
- Lokalnie (Windows) używałem kopii aplikacji z `--remote-debugging-port=9333`, synchronizacji (`tools/qa/sync.sh`,
  ścieżki zależą od maszyny) i `node cdp.js @skrypt.js out.png`.
- `shot.js` wstrzykuje `window.__shots([[etykieta, s=>{…mutacja stanu…}, kamera], …], W, H)`. Zwraca PNG obok siebie,
  w oknie offscreen. Kamery są w `CAMS` (full/side/back/upper/legs).
- W chmurze, bez Windows/Electrona:
  - serwuj katalog (`npx http-server .`) i otwórz `fitme.html` w headless Chromium (Playwright) z WebGL
    (np. `--use-gl=swiftshader`);
  - wstrzyknij treść `tools/qa/shot.js` i wołaj `__shots` tak samo;
  - `buildInto(group, state, false)` buduje bez cache.
- Błędy łapie hook `window.__errs` w shot.js. Zawsze sprawdzaj, że jest pusty.
- Profilowanie: `cpuprof.js` (CDP Profiler, tryb `incl`).

## Pułapki
- Pliki JS mają końce linii **LF** (stara notatka o CRLF jest nieaktualna).
- three.js r147 (stare API: `examples/js`, `outputEncoding`, `sRGBEncoding`). Nie aktualizuj bez potrzeby.
- Gęstość siatki: powłoki liczone są tylko na poziomie 1 (`hiQ=false` w buildShells), bo poziom 2 był 4× wolniejszy przy
  podobnym wyglądzie.
- Lookupy przestrzenne w `poseHash` (pose.js) mają memo i granice. Bez tego pozy liczą się kilkanaście sekund.
- Klucze liczbowe (`posKey`) zamiast stringów, bo inaczej GC zjada czas.

## Historia próśb użytkownika (w skrócie)
Kolejne rundy:
1. Manekin taki jak na zdjęciach referencyjnych. Ubrania mają leżeć naturalnie, „jak zbroja w grach", nie sztywno.
   Rozmiary (XS–3XL, W/L, EU), bandany, rękawiczki, więcej kategorii, aplikacja desktopowa.
2. Manekin z tkaniny (szwy). Matowe materiały i włosy, błyszczące metale. Menu Opcje, które naprawdę działa. Górny pasek
   Kreator / Społeczność / Zachowane, wolne miejsce na środku. Pozy. Szersze rozpięcie kurtek.
3. Czarny manekin domyślnie. Realne typy sylwetek (kulturysta itp.), więcej masy. Głowa skaluje się z ciałem. Lepsze
   fryzury. Szybkość. Ubrania mniej „wykrochmalone".
4. Pas koszulek i kurtek „+20–30 cm". Mniej detali w teksturach. Pozy tylko w zakładce Manekin. Większy zakres tłuszczu.
   Szorty, kurtki. Naturalnie wiszące ręce. Ubrania dopasowują się do siebie (slim/relaxed spodnie a talia kurtki).
5. (ostatnia, zrobiona) Kamizelka odstająca od bluzy, sylwetka kobieca („jak alien"), przejście szyja–głowa, chude nogi,
   pasek przenika, torba niewidoczna, skarpetki odstają, materiały dzianina/pika/wafel, zegarek prześwituje, mankiety.

## Znane niedoskonałości / co dalej
- Pod biustem w obcisłych topach lekki cień/fałd. U bardzo puszystej sylwetki z koszulką na wierzch płytkie wgłębienie
  pod brzuchem.
- Ściągacz na dole kurtki jeansowej jest kanciasty. Klapy ramoneski są płaskie.
- Pełna przebudowa trwa 1,7–3,5 s. Kolejny krok: przeniesienie buildShells do Web Workera.
- Fryzury są proceduralne (nie z biblioteki). Dalsza poprawa możliwa (pasma, końcówki przy barkach).
- „Społeczność" to na razie przykładowe fity, bez kont i backendu.
- Wersja webowa była publikowana jako artefakt claude.ai (stara wersja). Od tamtej pory nie aktualizowana.

## Stan na 2026-10-10 (sesja w chmurze)
- Kontener w chmurze startuje **pusty**. Kod trzeba dostarczyć: archiwum `scratch-2026-10-05-039e5e11.7z` od użytkownika
  (rozpakowanie: `pip install py7zr`, potem `py7zr.SevenZipFile(p).extractall(dir)`) albo repo GitHub, jeśli powstanie.
- W archiwum **nie ma** `tools/mh` ani `tools/qa`. Bez `tools/mh` nie da się przegenerować `mhdata.js`.
- Harness QA: `tools/qa/render.js` (Playwright z `/opt/node-tools`, SwiftShader, przechwytuje CDN do `app/web/vendor`).
  Uruchomienie: `node tools/qa/render.js spec.js out/`. Spec: `{W,H,shots:[{name, inspo:'<id>' | state:s=>{…}, cams:[…]}]}`.
  Kamery: full/side/back/q/upper/upperq/uside/legs/head/feet. Stan bazowy pochodzi z `INSPO[].state` albo `DEFAULT`.
- Render 18 gotowych stylizacji: 0 błędów JS, budowa 1,0–2,6 s.
- Do sprawdzenia: drzazgi na brzegach płaszczy (trenchday, minimal), artefakty łańcuszka (goth), plamki (może SwiftShader).
