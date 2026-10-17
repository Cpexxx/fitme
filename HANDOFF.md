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
Na Linuksie (użytkownik pracuje teraz na Ubuntu): `npm run package:linux` daje `app/dist/Fitme-linux-x64/Fitme`.
`app/web` jest generowane przez `node app/build.js` (sprawdzone: wynik = zawartość repo); commituj je razem z `js/`.
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
- `tools/mh` i `tools/qa` są już w repo `Cpexxx/fitme` (tools/mh odtworzone: process.py + recipe.json z Drive `claudescratch/mh`,
  pliki MakeHuman CC0 z github.com/makehumancommunity/makehuman, rozmiary sprawdzone 1:1 z Drive).
  `cd tools/mh && python3 process.py` (numpy, ~4 s) daje mhdata.js identyczny z js/mhdata.js poza kolejnością/wyborem
  lustrzanych wierzchołków w `anch` (remisy w np.argsort, różnica <2 mm) — nie podmieniaj bez potrzeby.
- Repo: https://github.com/Cpexxx/fitme (gałąź main). W nowej sesji: add_repo Cpexxx/fitme i git clone.
- Harness QA: `tools/qa/render.js` (Playwright z `/opt/node-tools`, SwiftShader, przechwytuje CDN do `app/web/vendor`).
  Uruchomienie: `node tools/qa/render.js spec.js out/`. Spec: `{W,H,shots:[{name, inspo:'<id>' | state:s=>{…}, cams:[…]}]}`.
  Kamery: full/side/back/q/upper/upperq/uside/legs/head/feet. Stan bazowy pochodzi z `INSPO[].state` albo `DEFAULT`.
- Render 18 gotowych stylizacji: 0 błędów JS, budowa 1,0–2,6 s.
- Hook `.claude/hooks/session-start.sh` (tylko chmura) doinstalowuje numpy + py7zr.
- render.js: kamera może być tablicą `[x,y,z, tx,ty,tz, fov]` (zbliżenia). Funkcje `state` są serializowane (bez domknięć);
  w nich można podmieniać globalne funkcje silnika (np. `shFolds=()=>{}`) do testów A/B.

## Runda 5b (2026-10-10, kontrola zbliżeń) — naprawione
- Postrzępione mankiety płaszczy: fałdy-pierścienie (shFolds) wygaszane przy krawędzi cięcia (`edgeK`), niższa częstotliwość, limit głębokości na rękawie.
- Rękawiczki w pozach (płat od dłoni do kolana w `office`/hip): rękawiczka niesie `bodySrc` (indeksy wierzchołków ciała), poseAssign bierze wagi ciała.
- Łańcuchy (portfel, cuban, bransoletka): ogniwa były ustawione w poprzek łańcucha (oś torusa = styczna) → białe kreski.
- Jeans przez kurtynę trencza: `floor` w shCurtain próbkuje też krawędzie trójkątów niższych warstw (rzędy co 1 cm vs siatka ~1,5 cm).
- Piła w kroku pod rozpiętą kurtką (`work`): usuwanie zakrytej tkaniny tylko ≥2 cm w głąb wyższej warstwy (sdf na newG).
- Próg + zęby nad dołem nogawki: `shBlendKept` – zachowana rura nogawki przechodzi płynnie w promień powłoki.
- Szlufki: przy pasku obejmują pasek (±4 mm), bez paska leżą płasko. Kaptur bluzy pod kamizelką/kurtką: `shHoodsOut` (wypychany, nie cięty).
- Kurtyna: nie łączy kolumn z „klifem” dołu > 2,5 cm. fitme.html ?v=13. Zestawienie: `qa-runda5-przed-po.png`.
- Nie są błędami: duży biały krzyż w goth to nadruk koszulki; „pętla” od klamry w oldmoney to sznurek lnianych spodni.
- Zostało: cienka linia na styku powłoki i dołu nogawki; drobna nierówność krawędzi pachy kamizelki; ciemne ukośne „rysy”
  na jeansach w trenczu (prawdopodobnie cień szalika – niezbadane); pasek torby gorp (nie zbadany z bliska).

## Runda 6 (2026-10-10, uwagi użytkownika po uruchomieniu na Ubuntu)
- **Płynność:** u użytkownika Electron nie widział GPU (log: `wayland … drmGetDevices2() has not found any devices`), więc
  renderował SwiftShaderem. Zmiany: `app/main.js` na Wayland wymusza `--ozone-platform=x11` (XWayland; `FITME_OZONE=wayland`
  przywraca natywny) i wypisuje w terminalu `[Fitme] GPU: …`; `core.js` `GL_INFO` wykrywa renderowanie programowe → domyślnie
  tryb `perf` + komunikat; `app.js` adaptacyjna rozdzielczość (×0,5 podczas obracania, gdy klatki >34 ms; ostra klatka po 200 ms).
  Profil SwiftShader (std): pusta scena 78 ms, pełna 946 ms; najdroższe: mapa otoczenia (~430 ms), cienie (~190 ms).
  NIE POTWIERDZONE u użytkownika, czy GPU zadziałało po zmianie — poproś o linię `[Fitme] GPU:`.
- Okulary: zauszniki po powierzchni głowy (headPt) za ucho; `hairOverTemples` unosi włosy nad nimi.
- Szalik: tagowany `userData.scarf`, `shScarfOut` wypycha go nad dopasowane ubrania (przesunięcie per komórka kąt×wysokość).
- Łańcuch portfela: większe ogniwa (R 6,2 mm, drut 1,7 mm, rozstaw 10,5 mm) — wcześniej z daleka wyglądał jak pręt.
- Kieszenie naszywane (`userData.pocket`): `shPocketOnFabric` obraca je w bok, jeśli wystają poza poły rozpiętej kurtki.
- Włosy (lekko): głębsze pasma, cieniowanie wierzchołków (`hairShade`), nieregularny dół (niska częstotliwość), połysk
  strand roughness .78 / sheen .2 (użytkownik w rundzie 2 chciał matowe włosy — nie przesadzać).
- Próbowano „membrany” krocza (otoczka wypukła per rząd) — brak widocznej różnicy, wycofane.
- Do zrobienia: ramoneska `goth` — pasek u dołu wygląda jak półprzezroczyste szkło z odłamkami; fryzury nadal „proceduralne”
  (większa przebudowa: karty pasm z alfą); doły nogawek (użytkownik: „nierealistyczne, na razie przejdzie”).
- Diagnoza u użytkownika: Ubuntu w **maszynie wirtualnej Hyper-V** (`systemd-detect-virt` = microsoft), `/dev/dri` ma tylko
  `card1` (hyperv_drm), brak `renderD*` → brak GPU w VM. `ignore-gpu-blocklist` powodował crash procesu GPU (exit 139),
  bez niego WebGL był „blocklisted” (brak manekina). Teraz `main.js`: Linux bez `renderD*` → `--use-gl=angle
  --use-angle=swiftshader --enable-unsafe-swiftshader`; log `[Fitme] WebGL: {...}` po starcie. Przetestowane pod Xvfb (bez GPU):
  manekin się renderuje, tryb perf. Płynnie będzie tylko na hoście Windows (prawdziwe GPU).

## Wydania (od 2026-10-10) — dwie wersje po każdej poprawce
- `.github/workflows/build.yml`: każdy push na `main` (zmiany w js/, fitme.html, app/) buduje na GitHub Actions paczkę Windows
  (windows-latest, `npm run package`) i Linux (ubuntu-latest, `npm run package:linux` + `fitme.sh` z `--no-sandbox`) i podmienia
  wydanie `latest`: https://github.com/Cpexxx/fitme/releases/tag/latest (Fitme-windows.zip, Fitme-linux.tar.gz).
- Użytkownik testuje Windows (host, prawdziwe GPU = „dobry sprzęt”) i Ubuntu w Hyper-V (bez GPU = „słaby sprzęt”).
- Weryfikacja w chmurze: pobierz asset przez REST (`gh api -H "Accept: application/octet-stream" repos/Cpexxx/fitme/releases/assets/<id>`,
  `gh release download` nie działa — GraphQL zablokowany), rozpakuj i `xvfb-run -a Fitme-linux-x64/fitme.sh`; w logu
  `[Fitme] WebGL: {"webgl":true,...}`. Stan Actions: `gh api repos/Cpexxx/fitme/commits/<sha>/check-runs`.
- W paczce Linux bez GPU potrzebne `disable-gpu-sandbox` (inaczej SwiftShader/Vulkan nie startuje → brak WebGL).
- Repo jest PUBLICZNE (od 2026-10-10). Wersja przeglądarkowa: https://cpexxx.github.io/fitme/ — job `pages` w build.yml
  wypycha fitme.html (+ index.html) i js/ na gałąź `gh-pages`; GitHub wdraża ją sam (sprawdzone: check-run `deploy` success).
  Z kontenera github.io jest niedostępne (proxy) — stan wdrożenia: `gh api repos/Cpexxx/fitme/commits/gh-pages/check-runs`.
- Do zrobienia: ramoneska `goth` — przy rozpiętych połach poszarpane narożniki powłoki pod paskiem (pasek przesunięty na dół).
- Linux/Wayland: wymuszenie X11 tylko gdy jest `/dev/dri/renderD*` (GPU). W VM bez GPU X11/XWayland dawał puste okno
  (sama ikonka na pasku, log `XGetWindowAttributes failed`). Bez GPU zostaje natywny Wayland (test: Xvfb → weston
  x11-backend pixman → Fitme jako klient Wayland: okno i manekin OK). FITME_OZONE=x11|wayland wymusza. Okno pokazuje się
  najpóźniej po 4 s, nawet bez `ready-to-show`.
- 2026-10-12: użytkownik ma też Ubuntu na prawdziwym sprzęcie (host `zpxn`, AMD RX 7900 `1002:744c` + Intel iGPU). Wymuszony
  X11 → proces GPU crash (exit 139) ×3 → brak WebGL. Zmiany w main.js: NIE wymuszamy X11 (FITME_OZONE=x11|wayland ręcznie),
  `force_high_performance_gpu` tylko macOS, `enable-unsafe-swiftshader` zawsze na Linuksie, po crashu procesu GPU
  (`child-process-gone`) app.relaunch z `--fitme-soft` (SwiftShader). Test: FITME_GPU_FORCE=1 FITME_TEST_GPU_CRASH=1 (chrome://gpucrash).
  PRZYCZYNA crasha na AMD nieustalona — czekamy na log z wersji bez wymuszonego X11.
- 2026-10-12: użytkownik przeszedł z Windowsa na **Kubuntu na prawdziwym sprzęcie** (KDE Plasma, AMD RX 7900 + Intel iGPU).
  Wersja Windows niepotrzebna „na razie” — job `windows` w build.yml tylko ręcznie (workflow_dispatch, input windows=true);
  wydanie `latest` zawiera wtedy tylko Fitme-linux.tar.gz. Polecenie aktualizacji dla użytkownika:
  `D=$(xdg-user-dir DOWNLOAD); cd "$D" && rm -rf Fitme-linux-x64 Fitme-linux.tar.gz && wget -q --show-progress https://github.com/Cpexxx/fitme/releases/download/latest/Fitme-linux.tar.gz && tar -xzf Fitme-linux.tar.gz && ./Fitme-linux-x64/fitme.sh`

## Runda 7 (2026-10-12): uwagi 1-9 + głęboki skan
- Narzędzia QA: `tools/qa/sweep.js <out> [regexp] [--shots]` — buduje KAŻDĄ pozycję katalogu (1854 przypadki: typy, kroje,
  długości, materiały, akcesoria, fryzury, pozy, sylwetki, rozmiary, wzory, obie płcie, 18 inspo × 7 póz) i sprawdza wyjątki,
  NaN, elementy poza postacią, brak warstwy, czas. `tools/qa/ui.js <out>` — klika interfejs jak użytkownik (zapisz, udostępnij
  w obie strony, zły kod, losuj, wyczyść+cofnij, opcje, panele, społeczność, polubienia, menu, przeładowanie, telefon 390 px).
  Max 2 procesy Chromium równolegle (4 się zakleszczały). Pod SwiftShaderem klikać z `force:true`.
- Naprawione w tej rundzie: puchówka (pikowanie w shFolds przez L.quilt, mniejszy luz), miękki limit luzu `easeCap` (fit.js),
  listwy krawędzi rozpiętych pół usunięte (outer.js), żuchwa (headPt) + szyja (neckFlare bez poszerzania do przodu), proporcje
  kobiece i łagodniejsze mięśnie (recipe.json + VARS 'mp' w process.py, mhdata przegenerowane), Losuj losuje też bandanę/chustę/
  rękawiczki, nagłówek na telefonie (@media 560px), krawat na koszuli (LAYERS_TOP) i pod swetrem ukryty, łańcuch portfela na
  spodniach (zakrywa go płaszcz: shHideCovered sprawdza też region tułowia dla nóg), pierścionki pod rękawiczkami ukryte,
  poły koszuli kończącej się nad kroczem dopasowane (była 'wstęga'), krawędzie cięcia trzymane przy drapowaniu (hold).
- Nie udało się odtworzyć: pkt 1 (pas przenika kurtki) — pasek nie przebija żadnej z 21 kurtek; pkt 6 (spodnie bez stanu)
  — wszystkie 16 dołów mają pas; pkt 8 (biało-czerwony element z tyłu). Potrzebne kody FIT3 od użytkownika.
- Znane: poziomy pas cieniowania na koszulkach na wysokości bioder = granica powłoka/kurtyna (shCurtain zaczyna się 2 mm
  na zewnątrz; wsunięcie pod powłokę dawało z-fighting na płaszczach — wycofane). Rękaw bomberki lekko odstaje nad ściągaczem.

## Runda 8 (2026-10-13): okulary, fryzury, T-shirty, manekin kobiety, oversize, tekstury
- **Luźne ubrania** (shell.js): `shLoose` (po shRelax i drugi raz po shHull) — dla luzu > ~1,2 cm promień tkaniny jest
  wygładzany gaussem w siatce biegunowej regionu (tułów 4 cm, rękawy 3 cm), oparty na zaokrąglonym „podparciu" ciała,
  a poniżej biustu/klatki tkanina wisi (nie podwija się). Fałdy (`shFolds`) liczone na współrzędnych i normalnych samej
  tkaniny (było: ciała → szum pod biustem). `shUntangle` rozprowadza wierzchołki stycznie (sierpy pod biustem).
  `L.fe` = odległość od PRAWDZIWEJ krawędzi (bez cięcia kurtyny) — używana w drape/folds/untangle/shLoose.
- **Kurtyna** (shCurtain): zaczyna się DOKŁADNIE na dolnej krawędzi powłoki (`shLowerRim`: pozycja + normalna na kąt),
  przez 6 cm przechodzi w swój zwis; luki (krocze na środku, odrzucone punkty blisko osi) interpolowane do 26 kolumn
  i podniesione pod powłokę. Ukryty pas 1,6 cm pod powłoką (pęknięcia przy chodzie). Powłoka płaszcza kończy się 2 cm
  nad cięciem tylko w regionach tułowia/nóg (NIE rękawy — inaczej mankiet wisiał jako obręcz). Szczegóły poniżej cięcia
  (kieszenie trencza) reseatowane na tułów (`shReseat(...,trunkOnly=lowerCut)`).
- Ściągacze dołu (userData.band) podnoszone nad tkaninę (`shBandOnFabric`).
- **Manekin kobiety**: recipe f — averagecup-maxfirmness 1.0, maxcup 0.32; usunięte sztuczne podnoszenie biustu w mhShape
  (ściskało fałd pod biustem w półkę). Próby analitycznego biustu (mhBustForm) wycofane — zawijały siatkę.
- **Okulary** (acc.js): `GL_SPEC` + `glOutline` + `buildGlasses` od nowa: front dopasowany do szerokości głowy, obręcze
  acetatowe (ExtrudeGeometry z otworem) lub drut, mostki, noski, zawiasy, zauszniki `glTemple` sprawdzane `headRAt` (prawdziwy
  promień głowy w danym kierunku — headPt ma kąt parametryczny!). Typy: aviator, wayfarer, clubmaster, round, rect, oversize,
  cat, oval, rimless, shield.
- **Fryzury** (hair.js + core.js): materiał matowy (MeshStandard, rough .9), karty pasm `hairCards` (tekstura `hairCardTex`
  z alfą, `hairCardMat` alphaTest) wzdłuż kierunku czesania na powłoce, arkuszu, kucyku, koku; brak kart pod czapką
  (`hatLineNy`); arkusz startuje stycznie z powłoki (thin=0.85·thick); `hairOutward` odwraca normalne do środka.
- **Tekstury** (colorTex): denim, dresówka, wełna (tweed), płótno, len, flanela, nylon (ripstop), dzianina w skali 1,5–6 mm;
  BUMPY denim .22, fleece .3, flannel .22 (większe dawały moiré/tynk).
- Znane: w pozie „chód" przód płaszcza nad nogą wysuniętą tworzy lekki stopień na szwie powłoka/kurtyna (różne wagi skinningu).
- Pułapka sesji: NIE robić `git checkout <commit> -- js` w roboczym katalogu (nadpisuje niezacommitowane zmiany) — do
  porównań używać `git worktree add <scratch>/wt <commit>` (+ skopiować app/web/vendor i tools/qa/render.js).

## Runda 9 (2026-10-14): screenshoty, bielizna, sagging, długie włosy
- **Bielizna** (`S.under`: bottom/bra/color/color2; `color:'auto'` = czarne/szare dla mężczyzn zależnie od skóry, nude dla
  kobiet): `buildUnder` w body.js; `bodyPatch(geo,[f1,f2..],th,mat)` wycina łatkę z powierzchni ciała (każde ograniczenie
  przycina trójkąt dokładnie, zachowuje `bodySrc` do pozowania), `bodyStrap` = ramiączka. Typy: UNDER_M/UNDER_F/BRAS w data.js.
  `shUnderHide` usuwa bieliznę pod ubraniem (nic nie przebija). Ze stanikiem: `BC.bra` → większy promień wygładzania sutków
  (mh.js spots 0.06, klucz cache 'b') i `shLoose` wygładza biust dla każdej góry. Gorset → stanik bez ramiączek.
- **Sagging**: `S.bottom.sag` none/low/heavy (SAGS) — pas spodni niżej (`buildPants`, nie niżej niż krocze+1,6 cm), nogawki
  dłuższe; wymusza `tuck:'out'`. Długie topy (hem 0.855) i tak go zakrywają — widać przy tankach/krótkich topach/bez góry.
- Screenshoty: koszule/flanele kończące się przy kroczu dostają kurtynę (`lowOf(T)<CY+0.09`), kurtyna dziedziczy UV powłoki
  (wzór ciągły), obszycie/ściągacz jedzie na dół kurtyny (`shHemOnCurtain`, `userData.hemPiece`); `shDetailOnFabric` dociąga
  szlufki/nity do tkaniny; łańcuch portfela od szlufki do tylnej kieszeni (`buildWalletChain`); ręce nie wchodzą w biodra —
  `mhShape` (pętla odwodzenia ramion wg stawów palców) i `poseHandClear` w pose.js (dla póz, odstęp 1 cm, `handRest` w 'hip').
- **Włosy**: `hairSheet` dwa przejścia (wymagany promień, potem pomost 1.4·krok nad przeszkodami), koniec przy kontakcie z
  ramieniem; `hairBandK` (opaska na czoło leży na włosach); `shHairOverNeckwear` — włosy nad bandaną (`userData.neckwear`)
  i cienkimi kołnierzami (`isHair` taguje runBuilders).
- Sweep: nowe przypadki under/…, bra/…, sag/….

## Runda 10 (2026-10-16): ekran powitania, konta, społeczność, dokumenty prawne
- **Pliki:** `js/config.js` (adres Supabase + klucz anon, dane operatora, `legalVersion`, `minAge`), `js/social.js` (warstwa
  danych, supabase-js), `js/account.js` (cały interfejs kont), `js/legal.js` (treść dokumentów, jedno źródło dla okna i
  `legal.html`), `js/boot.js` (start aplikacji: przeniesiony z końca app.js), `supabase/schema.sql` + `supabase/README.md`.
- **Bez serwera** (`cloud.url` puste): `Social.on=false`. Tryb gościa jak dawniej, powitanie pokazuje tylko „Przejdź do
  projektowania”. Konta zaczną działać po wpisaniu adresu i klucza w config.js (instrukcja: supabase/README.md).
- **Bezpieczeństwo jest w bazie:** RLS na każdej tabeli, pomocnicze funkcje w schemacie `fitme_private` (niewystawionym przez
  API, zawsze względem `auth.uid()`), granty kolumnowe (liczniki i właściciel poza zasięgiem klienta), triggery dla liczników,
  powiadomień, limitów nadużyć, historii konta. Konto prywatne = prośby o obserwowanie; blokada działa w obie strony.
- **Pamięć urządzenia:** `prefSet/prefGet` (core.js). Preferencje (`PREF_KEYS`) trafiają do localStorage tylko za zgodą z
  banera, bez zgody do sessionStorage. Niezbędne: `fitme.auth`, `fitme.consent`, `fitme.welcomed`, zapisane i polubione fity.
- **Bez CDN:** three.js, supabase-js 2.75.0 i czcionka Archivo (OFL) leżą w `vendor/`. build.js i workflow Pages je kopiują.
- **Testy:**
  - `node tools/cloud/stack.js --reset` stawia lokalny stos zgodny z Supabase: Postgres 16, GoTrue, PostgREST,
    bramka :54321, skrzynka SMTP. Binarki są w `FITME_BIN`, a w sesji w chmurze trzeba je pobrać z GitHub Releases.
  - `NODE_PATH=…/node_modules node tools/cloud/test-db.js` (115 testów RLS).
  - `node tools/cloud/e2e.js <dir>` (scenariusz w przeglądarce).
  - QA renderów (render/sweep/ui) ustawia zgodę i „powitanie widziane” skryptem startowym.

## Runda 11 (2026-10-17): długie włosy (fizyka), bielizna, buty, mięśnie, szyja
- **Długie włosy (`js/hair.js`):** każda kolumna arkusza (long, lob, wolf, bob, mullet) i każdy lok (dreads, braids) to
  symulowane pasmo: `hairDrapeSim` to „dynamic follow the leader” (nierozciągliwe, Verlet, korekta prędkości 0.9), kolizje z polem
  `hairField` (promień głowy wokół osi głowy i obwiednia ciała + ubrań wokół osi tułowia, stablicowane po y i kącie, z
  pochodną po y: na barkach pasmo jest wypychane w górę), tarcie przy kontakcie, luźne więzy z sąsiednią kolumną.
  Włosy sięgające barków dzielą się na panele (`sA=1.5` rad od przodu): kosmyki przed barkami, reszta na plecach (siła
  wyboru tylko w pasie barku, `xt` = gdzie pasmo ma się ułożyć w poprzek). Arkusz: symulowane co 3. pasmo, pośrednie
  interpolowane + `hairKeepOff`. Wynik w `DRAPE_CACHE` (klucz: korzenie + sygnatura pola), więc zmiana koloru/butów nic nie kosztuje.
  Grzywka (`noBody`) zostaje na starym, statycznym generatorze `sheetColsStatic`. Twists (`short`) też po staremu.
- **Bielizna (`buildUnder`):** stanik to jedna ciągła funkcja konturu `top(x,z)` (przód: mostek, miseczki, skrzydła; tył:
  pas lub racerback), bez obcinania boków (`side` usunięte, to dawało wcięcia). Sportowy: ramiączka racerback jako
  odległość od ścieżki po ciele, kompresja `bodyPatch(...,{hull:[y0,y1]})` (otoczka wypukła wierszy i kolumn pola wysokości,
  rozmyta, normalne ciała przechylone gradientem uniesienia: bez stożków przy szczycie biustu). Ramiączka zwykłych
  staników: `onBody()` + `bodyStrap` z rzutowaniem z powrotem nad skórę (nie zapadają się na barku).
- **Buty:** kopyto dopasowane do stopy (`makeLast`, `BC.footPts`), brak dziury przy pięcie (`gx` ograniczone kopytem).
- **Mięśnie:** `muscleRelief` (rowki anatomiczne) + delta `mx` w mhdata (maxmuscle), patrz `tools/mh/process.py`.
- **Szyja:** głowa ucięta na `headAttachTh`, loft Hermite'a `neckLoftPt` do pierścienia szyi z `neckFlare` (mh.js).
- QA tej rundy: specy w `/tmp/claude-0/r11` (nie w repo); render.js ma opcję `post(g)`.
- `tools/qa/ui.js` naprawiony (3 niestabilne/nieaktualne kroki, 2 z nich padały już po rundzie 10): klik w sekcje manekina
  przez `openAcc` (panel rysuje się od nowa po kliknięciu), wyszukiwarka czeka na wynik (miniatury blokują wątek), zakładka
  „Polubione” po tekście (Account rysuje zakładki bez `data-mine`), jawne `outer.close` w teście kodu. Błąd pokazuje linię testu.
- Sweep 1912/1912 bez uwag. Uwaga: w jednym długim przebiegu Chromium (SwiftShader) padł po ~1720 przypadkach; reszta
  przeszła osobnym przebiegiem z filtrem. Sterta przy budowie włosów stabilna (cache drapowania ma limit 12).
