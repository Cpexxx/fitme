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
- **Od rundy 13:** `tools/qa/clip.js` wykrywa automatycznie prześwity, przecięcia i załamania (opis w „Runda 13”). Uruchamiaj
  go na `bodies`, `acc` i `random:40` przed każdym pushem i porównuj z poprzednim commitem (worktree), żeby łapać regresje.

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
- **Ułożenie długich włosów (`S.hair.drape`, `HAIR_DRAPE`, `DRAPE_STYLES`):** auto (kosmyki z przodu), back, front,
  left/right (lewe/prawe ramię postaci = +x/−x, jak `handSide`). `drapeSide(ph,mode)` w hair.js daje stronę i `xt`
  każdego pasma; panele arkusza to ciągi pasm o tej samej stronie. Pchnięcie przód/tył działa tylko na pasma dotykające
  barku (`CT`), więc nic nie odstaje w powietrzu. Próba „wszystkie włosy przez jedno ramię” z kanałem przy szyi dawała
  zmięty kołnierz (arkusz nie umie się zebrać w pęk), dlatego left/right = ta strona głowy z przodu, reszta na plecach.

## Runda 12 (2026-10-21): bielizna na pełnych sylwetkach, nogi, włosy, glitche, jakość, nowe ubrania
- **Bielizna:** linia krocza z biodra (`hipL.y-0.075`), a nie z `shellBase().cy` (ta spadała przy dużych udach i majtki
  zsuwały się na uda). Pas wyżej, z tyłu +3 cm. Tył stanika wznosi się po kącie wokół tułowia, nie po |x|, bo na szerokich
  plecach robił się prostokąt. **Mężczyźni:** bez slipów, stare stany zamieniają się w bokserki.
- **Kozie nogi:** `poplitealFill` (mh.js, na gęstej siatce po `muscleRelief`) ściąga tylny obrys nogi od łydki do połowy
  uda w stronę jego wygładzonej wersji (σ≈7,5 cm, 90%, limit 1,8 cm).
- **Włosy:** panele zachodzą na siebie o 0,035 rad (wcześniej szpara od czubka głowy). Pod czapką arkusz zaczyna się pod linią
  czapki (`y0` po kącie). Pchnięcie przód/tył działa też nad barkami (pasma wcześniej lądowały na barku jak klapka), końce
  krótkich pasm przy barku zatrzymują się na nim (`CB`), krzywizna ograniczona (`rmin`).
- **Glitch ze zrzutu 4:** „pasek” to tył koszuli „wpuszczonej z przodu”, sterczący jak dzwon. Teraz to `mkMain` (fizyka
  tkaniny układa go na spodniach) z osobną lamówką.
- **Torba tote:** nowa: miękka bryła z dnem, podszewką i lamówką, sztywna (`ctx:'none'`), na tyle prawego biodra za ręką.
  Uchwyty w V przez szczyt barku (punkt wyszukany na ciele), wygładzone.
- **Jakość („Wysoka”, domyślna w aplikacji):** gdy widok stoi ≥350 ms, jedna klatka renderuje się w wyższej rozdzielczości
  (×1,6, do 3, limit ~16 Mpx). Każde pasmo włosów jest symulowane. Więcej iteracji tkaniny nic nie zmieniało (<0,35/255), cofnięte.
  QA: `QA_QUALITY=high` w render.js (bez tego SwiftShader renderuje 'perf').
- **Nowe ubrania:**
  - topy: guayabera (4 kieszenie, zakładki), koszula ze stójką, tangzhuang (żabki/pankou), kurta (`long`, stójka);
  - kurtki: kamizelka jeansowa, M-65, barn jacket (`collarCord`), kimono/haori (`open`, kołnierz `eri`, szerokie rękawy `wide`);
  - dół: kilt i salwar (`uni:1`, losowane też dla mężczyzn);
  - czapka: kufi (`tuck` krawędzi w `hatShell`).

## Runda 13 (2026-10-22): strongman, szalik, czapka z okularami, podbródek, sztruks, prześwity + automatyczny detektor
- **Automatyczny detektor usterek `tools/qa/clip.js`** (nowy; uruchamiać w każdej rundzie przed pushem):
  `node tools/qa/clip.js <out> [random:N[:seed]|bodies|acc|all|plik.js] [--png]`, kod wyjścia 1 = są usterki, `QA_DEBUG=1`
  wypisuje współrzędne krawędzi. Buduje postać jak aplikacja (`qaBuild`), renderuje bufor ID+głębokości z 8 stron i zgłasza:
  - **prześwit:** niższa warstwa (ciało < bielizna < spodnie < top < mid < outer, buty 2.2) widoczna wewnątrz obrysu wyższej,
    0,4 mm–4 cm przed nią, ≥ 6 px; części ramion (`:arm`) osobno (ręka przed bokiem koszuli to nie błąd);
  - **przecięcie:** sztywne pary (czapka, okulary, kolczyki, głowa, opaska) zmieniają kolejność przód/tył na sąsiednich
    pikselach przy odstępie < 5 mm;
  - **załamanie:** krawędź siatki ostrzejsza niż 60° na ciele/głowie (bez pachy, krocza, szczeliny pośladków, biegunów siatki)
    albo zawinięta (> 135°) na tkaninie. Na ciele pomijane są linia środka (rowek kręgosłupa, mostek) i palce stóp. Tkanina:
    tylko duże kawałki (≥ 1500 wierzchołków; kieszenie, szlufki i nity to małe bryły z celowymi krawędziami), tylko
    w obrębie jednego źródłowego kawałka (`userData.pieces`) i nie bliżej niż 2 pierścienie od wolnego brzegu (podwinięcia,
    kołnierze, klapy).
  - Zestawy: `random` (losowe stroje), `bodies` (8 sylwetek × 2 płcie × stroje), `acc` (czapki × okulary). Pełny `all` ~1,5 h.
    `QA_ONLY=<regexp>` sprawdza wybrane przypadki. `clip.json` zapisuje stan każdego przypadku z usterką (do odtworzenia).
  - Pomijane: wypustka pięty buta (`userData.tab`, noga przed nią to nie stopa przez but) i stopa w otwartych butach.
  - Test detektora: nowa wersja uruchomiona na kodzie sprzed rundy 13 wskazuje wszystkie zgłoszone usterki
    (kolano 354 px, szlufki, kolec na plecach, daszek × okulary), a na obecnym kodzie nic.
  - Nie ocenia estetyki (kształt, tekstura, proporcje). Obrazy przed/po nadal trzeba oglądać.
- **Prześwit za kolanem (zdj. 14):** `poplitealFill` działa też na bazie powłok (`shellBase`: P i Ps), a nie tylko na siatce renderu.
- **Strongman:** `limbFill` (mh.js) wypełnia kolano i przedramię zależnie od mięśni i tłuszczu.
- **Podbródek:** w `headPt` cofnięcie żuchwy wygasza się pod brodą (`chin`), bez haczykowatego rowka.
- **Czapka z daszkiem i okulary:** daszek podnosi się nad `glassesTopY()` (`hatLiftNy`, `BRIM_DROP`); cat-eye liczy szerszą
  oprawkę w rogach (×1,5). Okulary typu shield trzymają 5 mm od głowy.
- **Szalik:** przebudowany: 2 miękkie owinięcia + końce z symulacji `hairDrape` (`latK` stała szerokość, `pushZ`), frędzle;
  `shScarfOut` podnosi końce osobno od owinięcia.
- **Sztruks:** słabsze prążki (alfa 0,14, szerszy gradient, `BUMPY.cord=0.25`, `MATDEF.cord`): bez mory.
- **Tkanina na plecach / siedzeniu (wykryte detektorem):**
  - `shMidTrunk` (przed cięciem w `shEmit`, góry): tkanina nie przechodzi przez linię środka (normalne Ps w szczelinie
    wskazywały na drugą stronę i dawały kolec na plecach koszulki), punkty na środku nie odstają, a pionowe przesunięcie jest
    wyrównane w pasie 10 cm (paski się nie łamią);
  - `shMidline`: tkanina z tyłu nie wchodzi głębiej niż wypełnione Ps;
  - (próbowane i cofnięte: mostek siedzenia spodni w `shBodyClear` aż do prawdziwego krocza. Bez wygładzania ścianki
    szczeliny zgniatały się w kolce, a z wygładzaniem Laplace wciągał tkaninę pod krocze i przebijała skóra (kobieta, strongman).)
- **UV na granicy wykroju** (tułów/noga, tułów/rękaw): trójkąt mieszany dostaje współrzędne jednej części, więc w szwie nie ma
  zygzaka. Dół nogawki (`shUvKept`) ma UV jak powłoka, bez linii na łydce. `cy ≥ hipL−0,085` dla silnych sylwetek.
- **Szlufki boczne przez koszulkę:** `shHideCovered` sprawdza też kurtyny wyższych warstw.
- `shRelax`: górne 3 cm spodni są przypięte (`pin`). Pod brzuchem pas zjeżdżał o 1,5 cm z dala od paska i na plecach robiło się „V”.
  Wygładzanie panelu w `shBodyClear` nie rusza krawędzi.
- **Znane po rundzie 13 (zrobione w rundzie 14, zob. niżej):**
  - pełna sylwetka (heavy) + obcisłe spodnie: pod brzuchem, pod paskiem, wykrój zawija się w ząbki (było już wcześniej;
    powstaje przy pierwszym rozłożeniu wykroju, nie w drape);
  - losowe stroje: spódnica z wysokim stanem + top na wierzch + krótka kurtka – spódnica wychodzi bokami spod kurtki;
    tu i ówdzie koszula prześwituje przez sweter w talii (kolejność warstw);
  - przy niskich sneakersach krawędź uciętej nogi bywa 2–4 mm nad tylnym kołnierzem (widać tylko w zbliżeniu;
    niższe cięcie stóp, czyli próg `footw`, przebija boki buta).

## Runda 14 (2026-10-23): zaległości z rundy 13 + nowy silnik włosów (pasma)
- **Ząbki spodni pod brzuchem (heavy):** w `shBodyClear` przedni panel krocza nie działa powyżej fałdy pod brzuchem (`yCr`:
  najniższy punkt skóry skierowanej w górę nad kroczem, z pominięciem pępka). Spodnie pod zwisem brzucha zwisają z paska:
  na kolumnę 1 cm z przodu cofają się w dół najwyżej o 0,35 na jednostkę wysokości (`lift`, rozlany po sąsiadach, tylko
  rośnie). Wcześniej to „V” w fałdzie i zawinięte trójkąty.
- **Kolejność warstw:** spódnica (`skirtPiece`) leży pod najniższą warstwą, która ją przykrywa (top na wierzch, sweter,
  kurtka), a nie tylko pod kurtką. Do siatek korpusu wchodzą tylko trójkąty korpusu (`shTrunkTris`): w układzie korpusu
  rękaw zwisający przy boku udawał tkaninę tułowia i spódnica wychodziła z boku. Tak samo kurtyny i kaptury.
- **Szczelina nogi nad kołnierzem buta:** `buildInnerAnkle` (shoes.js) dodaje przy zamkniętych butach bez skarpet pas
  skóry w tylnej połowie kostki, schodzący 4,5 mm do środka nogi. Z przodu nie, bo przebijał język buta. Detektor zgłasza
  tam teraz „ciało przez buty” w otworze nad językiem; to widoczna kostka, czyli fałszywy alarm.
- **Nowy silnik włosów: pasma zamiast arkuszy i kart.**
  - `strandGeo` (hair.js): każde pasmo to łamana z dwoma wierzchołkami na punkt, oba na linii środka. `normal` = kierunek
    pasma, `uv.x` = ±połowa szerokości. `userData.strands`.
  - `strandMat` (core.js): w shaderze wierzchołków pasmo obraca się do kamery (do światła przy cieniu: `customDepthMaterial`)
    i ma co najmniej ~0,7 px szerokości. Cieniowanie jak cienki walec: normalna w płaszczyźnie widoku obrócona w poprzek
    pasma, rozproszone owinięte, dwa refleksy Kajiya-Kay (biały przesunięty ku końcom, kolorowy ku nasadzie).
    Odbicie otoczenia ×0,04, bo przy normalnej do kamery mapa otoczenia dawała szron.
  - **Długie włosy** (`sheetStrands`): symulowana powierzchnia (`hairDrape`) jest prowadnicą. Na kolumnę ~120 pasm
    (`STRAND_Q`: perf 0,38, std 0,62, high 0,85), rozłożonych w grubości arkusza (ciemniejsze w środku). Pasma zbierają
    się w kosmyki zwężające się ku końcom (`pull`), a kosmyk w przekroju jest okrągły (`bul`). Kołysanie na boki to gładkie
    pole w poprzek arkusza (`swayAt`, sąsiednie pasma razem), fale i loki z fazą wolno płynącą w poprzek (`wvPh`), puszenie,
    pojedyncze odstające włosy, rzednące brzegi (otwarte i rozchodzące się nad ramieniem). Końce w różnej długości, tępe
    w krótkich fryzurach.
  - Pasma długich fryzur (`crown`) zaczynają się między wirem na czubku a pierścieniem arkusza. Biegną po powłoce skalpu
    (`SHELL_HF`, 2–3 mm nad nią), ze skrętem wokół wiru, i płynnie wchodzą w arkusz. Złącze jest wygładzone, a punkty
    rozłożone równo co ~1 cm (6,5 mm przy falach). Wcześniej był ciemny szew wokół głowy.
  - Pod pasmami matowy, ciemniejszy rdzeń (`hairCoreMat`) głębiej niż najgłębsze pasmo, kończący się przed końcami i nie
    sięgający brzegów. Powłoka skalpu pod arkuszem schodzi do skóry (`under`) i jest gładka (bez szumu, który przebijał).
  - **Krótkie fryzury i grzywki** (`hairCards` przepisane): pasma po powierzchni powłoki zamiast kart z teksturą, część
    pod nią, część nad, loki jako spirala. `minNy` wygasza końce w paśmie 0,22 (bez linii). `front`: zaczesane z czoła na
    boki. Kucyk (`tailStrands`): pasma wypełniające przekrój ze skrętem.
  - Pozy: wagi liczone raz na parę wierzchołków pasma, `poseHandClear` próbkuje co 16. punkt. `warpGeo(..,tan)` rozciąga
    kierunek pasma inaczej niż normalną.
  - Koszt (perf / high, długie włosy): +0,85 s / +2 s budowy; ~0,66 / ~1,3 mln wierzchołków pasm.
- Detektor `clip.js` nie widzi pasm włosów jako powierzchni (bez rozszerzania w shaderze), więc obrazy włosów trzeba oglądać.

## Runda 15 (2026-10-24): włosy, które płyną (prowadnice symulowane jak osobne włosy)
Prośba: „cały czas te włosy stoją sztywno zamiast naturalnie płynąć. Popraw to raz a porządnie, nie przejmuj się na razie
czasem renderu". Długie fryzury (bob, lob, long, curtains, wolf) nie są już arkuszem (`hairDrape` → `sheetStrands`).
Stary arkusz został jako `sheetOld` (zapas, gdy pod czapką nie ma skóry na prowadnice).
- **`hairFlow`** (hair.js): ~420 prowadnic (rozkład Fibonacciego na skórze głowy, `flowRootOK`: linia włosów, czapka,
  pierścień). Każda biegnie po głowie wzdłuż linii czesania (`flowComb`: od przedziałka, w dół, z przodu na boki), 3,6 mm
  nad nią (`headTab`: promień głowy na kierunek), do pierścienia stylu (`o.y0`). Dalej jest wolna.
  - Dwa przebiegi: krótki (120 kroków) mówi, gdzie spoczywa koniec. Prowadnica jest wtedy przycinana lub wydłużana do linii
    stylu (`o.y1`). W fryzurach do ramion (`shCut`: średnia linia przy barkach) kosmyk oparty na barku jest cięty 2,5 cm za
    punktem oparcia: wydłużany, rozjeżdżał się po barku w kryzę. Po pełnym przebiegu końce poniżej linii są docinane.
  - Wynik w `FLOW_CACHE` (klucz: prowadnice, ciało i ubrania przez `field.sig`, czapka, opaska, ułożenie, szal, tekstura).
- **`flowSim`**: segmenty 15 mm, Verlet z dynamicznym follow-the-leader (nierozciągliwe, sztywniejsze 7 cm od skóry,
  zgięcie nie ciaśniej niż `rmin`), grawitacja. Kolizje: głowa (`headTab`), dolna głowa i szyja, ciało z ubraniami
  (`hairField`), ręce (kapsuły), szal (pierścień wokół szyi z `buildScarf`), twarz zostaje odsłonięta do linii włosów.
  Włos-włos: odpychanie na siatce haszowanej (każda para raz: własna komórka + 13 sąsiednich). Ułożenie na ramiona
  (`drapeSide`) wybierane w 70. kroku. Okluzja z gęstości na zewnątrz, wygładzona wzdłuż prowadnicy.
- **Fale i loki to kształt, nie siła.** Po symulacji prowadnica jest próbkowana gęściej (Catmull-Rom; 5 mm fale, 3 mm
  loki) i dostaje przesunięcie w swojej ramce (N od głowy lub ciała, B w poprzek powierzchni). Wcześniej rotacja dodawana
  w każdym kroku walczyła z grawitacją i rosła w sieć krzyżujących się kosmyków.
  - fale: płaski zygzak w płaszczyźnie odchylonej od powierzchni (`WPL`, światło łapie grzbiety). Faza idzie z wysokością
    (sąsiednie kosmyki falują razem) plus pole szumu po głowie (kilka cm dalej już nie, inaczej poziome pasy jak tara);
  - loki: spirala o nierównym skoku i promieniu, w obie strony (`HAND`), faza własna dla każdego kosmyka;
  - proste: wolne, łagodne S (żaden włos nie wisi jak pion).
- **`flowStrands`** (pasma): ~70 na prowadnicę przy std (`STRAND_Q`; loki ×0,4), punkty co 15 mm (proste), 7,5 mm (fale),
  4,8 mm (loki). Pasmo uśrednia 3 najbliższe prowadnice na całej
  długości, wyrównane do miejsca, gdzie włosy schodzą ze skóry (ten sam ułamek długości dawał różne wysokości i fale się
  znosiły). Sąsiad raz rozdzielony zostaje puszczony stopniowo (`WF`), bo inaczej fale przerzucały pasmo ukośnie między
  prowadnicami. Zbijanie w kosmyk tylko pod koniec (cały czas dawało „pióra”). Wynik w `STRAND_CACHE`, więc zmiana koloru
  albo ubrania, którego włosy nie dotykają, nie liczy pasm od nowa.
- `HAIR_LOD` (miniatury `renderState`: Społeczność, zapisane fity): 120 prowadnic, krótsze przebiegi, mniej pasm i punktów.
  Bez tego każda miniatura z długimi włosami liczyła się kilkadziesiąt sekund i zamrażała stronę (ui.js padał).
- QA: `window.__guidesOnly=1` rysuje same prowadnice, `window.__perGuide=N` ustala liczbę pasm na prowadnicę.
- Koszt (w kontenerze bez GPU): pierwsza budowa długich włosów +~8 s (sama symulacja ~7,5 s; było 17,7 s przed
  optymalizacją), przebudowa z cache +0,6 s. Wierzchołków pasm (perf / std / high): long 0,42 / 2,4 / 3,2 mln, loki
  0,5 / 2,9 / 3,9 mln, bob 0,13 / 0,71 / 0,98 mln (runda 14: long 0,66 mln perf, 1,3 mln high). Aplikacja desktopowa
  domyślnie działa w high.
- Tryb „perf” (słaby sprzęt i domyślnie bez GPU) ma własne, lżejsze ustawienia: 260 prowadnic, 0,6× pasm, punkty ×1,3
  rzadziej. Bez GPU każde pasmo rysuje się programowo i tysiące nakładających się pasm dawały kilkadziesiąt sekund na
  klatkę (ui.js: timeout zrzutu ekranu).
- Znane: końce lob/wolf opierające się na barkach są jaśniejsze (poziome pasma oświetlone z góry); przy „Na lewe ramię”
  włosy przechodzące przez bark są widoczne od tyłu jako poziomy pas (fizycznie poprawne).

## Runda 16 (2026-10-25): kosmyki zamiast pasm (styl „gra”), włosy przy ciele
Prośba (ze zrzutem: długie falowane włosy w polarze, z boku stoją w powietrzu): „zamiast renderować osobno każdy włos,
zrób taki »plastelinowy« render, że masz ileś włosów w jednym pasemku i ładnie się układają… styl nie fotorealistyczny,
jak niektóre gry (Wiedźmin 2), żeby nie było zbyt obciążające, ale wyglądało ok”.
- **Kosmyki (`flowLocks` + `lockGeo`, hair.js; `lockMat`, core.js):** każda prowadnica z rundy 15 to jeden zamknięty,
  spłaszczony kosmyk (przekrój: elipsa o 8 bokach, brzegi lekko podwinięte do głowy). Na skórze głowy szeroki (2,4 cm)
  i płaski, ułożony dachówkowo (każdy na swojej małej wysokości 0,5–1,8 mm); poza głową węższy i grubszy, zwęża się do
  czubka. Zaczyna się 1 cm przed korzeniem, zwężony i schowany pod sąsiadów (bez szczeliny na przedziałku).
  - Fale: kosmyk po prostu idzie za falującą prowadnicą. Loki: co druga prowadnica, gruby okrągły sznur (1,2 cm),
    rowki na powierzchni skręcone z lokiem (`uv.x` + kąt wokół osi zwoju). Cienkie rurki albo wstążki wzdłuż zwojów
    wyglądały jak makaron albo zmięty papier.
  - `lockMat`: kierunek kosmyka w atrybucie `hairT` (przenoszony przez `EXTRA`, `warpGeo` i `poseSkinGeo`), trzy miękkie
    rowki w poprzek kosmyka (normalna + lekkie przyciemnienie), rozproszone owinięte (glina), dwa refleksy Kajiya-Kay.
    Skalibrowane tak, by średni kolor na ekranie był bliski wybranemu.
  - Pod kosmykami powłoka prawie w kolorze włosów (`hairCoreMat(hex,-0.07)`), bo ciemniejsza prześwitywała jak klin.
  - Wierzchołki z postacią (perf / std / high): długie 0,23 / 0,31 / 0,46 mln (runda 15: same pasma 0,42 / 2,4 / 3,2 mln),
    budowa szybsza o kilka sekund. Stary renderer pasm został do QA: `window.__strandsQA=1`.
- **Włosy przy ciele zamiast w powietrzu:**
  - Siła rozkładająca włosy na ramiona (`drapeSide`) działała w całym pasie wysokości barków i do końca symulacji, więc
    trzymała włosy z dala od piersi i pleców. Teraz działa tylko na punkt leżący na prawie poziomej powierzchni (wierzch
    barku: flaga `TP`, kolizja z ciałem o nachyleniu `g<-1.2`). Niżej włosy wiszą pod własnym ciężarem.
  - Kolizja z ciałem: obwiednia (zaokrąglony prostokąt na wysokość) wystawała kilka cm przed górną częścią klatki.
    `hairField(…, G)` liczy teraz prawdziwą powierzchnię ciała i ubrań (`bodyRadii`: największy promień od osi na komórkę
    wysokość × kąt, z trójkątów skóry `userData.bodySkin` i siatek `ctx==='cloth'`). Używana tylko poniżej barków (płynnie
    od `shY-0.03` w dół) i nigdy większa niż obwiednia: nad barkami promień od osi nie opisuje „dachu”, a rękawy dawały
    kolce wyrzucające punkt na bok.
- Znane: krótkie fryzury, grzywki, kucyk i koki nadal są z pasm (`hairCards`, `tailStrands`); wyglądają inaczej niż
  kosmyki długich fryzur. Przy pozie „idzie” ręka w polarze oversized wysuwa się do przodu, a włosy na barku zostają.

## Runda 17 (2026-10-25): fizyka na prawdziwych ubraniach, styl malarski (matowy), kosmyki we wszystkich fryzurach
Prośby: 1) „nic się nie zmieniło, długie włosy stoją sztywno w powietrzu”; 2) bardziej matowe; 3) kucyk z pasemkami
z przodu; 4) curtains jak „słoma na chochole”; 5) wzorować się na dobrych fryzurach; 6) objętość i tekstura, nie
kanciaste i płaskie; 7) styl renderu jak w Arcane (LoL); 8) włosy mają opadać na ubrania.
- **Dlaczego wcześniej „nic się nie zmieniło”:** symulacja szła w `runBuilders`, PRZED `buildShells`. Ubrania miały wtedy
  luźny, pierwszy obrys (szerszy o kilka cm), a ostateczne, dopasowane ubrania powstawały dopiero potem. Włosy leżały na
  niewidocznym obrysie, w powietrzu.
  - Teraz `hairFlow` dodaje tylko zastępczą siatkę (`userData.flowLock`, ten sam materiał: zamiana kolorów działa).
    `hairFlowFinish(G)` (app.js, zaraz po `buildShells`) liczy symulację na gotowych siatkach i podmienia geometrię.
    `matSeq` nie porównuje rozmiaru tej siatki.
  - Kolizja z ciałem i ubraniami: **pole odległości** `bodySDF` (hair.js) z końcowych siatek (`sdfMeshes`: skóra
    `bodySkin`, szyja `bodyNeck`, warstwy ubrań, szal, kaptur). Trójkąty wstemplowane w siatkę 6 mm, domknięte dylatacją
    o 2,2 komórki, każdy poziomy przekrój zalany od brzegu (wnętrze tułowia i szczeliny między warstwami to bryła),
    potem dokładna transformata odległości (`edt3`, Felzenszwalb; sprawdzona testem z brute force). Punkt włosa jest
    wypychany wzdłuż gradientu na 4,5 mm. Koszt 0,3–0,7 s. Klucz cache: `sdfSig` siatek.
  - Siła rozkładania na ramiona działa tylko na wierzchu barku (gradient pola skierowany w górę) i tuż nad barkami, bez
    przyciągania w bok (z nim włosy z przodu były dwoma wąskimi sznurami). Fryzury do ramion (`shCut`) nie są
    przepychane wcale, bo ich końce sterczały za krawędzią barku.
  - Okulary: `hairOverTemples` zapamiętuje zauszniki i `hairFlowFinish` stosuje je do gotowych włosów.
- **Materiał `lockMat` (styl malarski):** matowy (bez odbić otoczenia, `radiance*=0`), miękki terminator, jeden szeroki
  refleks w kolorze włosów (bez białych błysków), malowane pasemka wzdłuż kosmyka (dwie warstwy linii, przerywane
  szumem wzdłuż `uv.y` w metrach), miękka jaśniejsza krawędź sylwetki (objętość). Ciemne kolory mają minimalny refleks,
  żeby nie były czarną plamą.
- **`lockArrays(locks)`:** wspólny budowniczy kosmyków (12 boków, przekrój elipsa podwinięta do głowy, opcjonalna
  normalna `O` na punkt, np. dla kucyka). `flowLocks`: długie włosy, kosmyki skupione w około 45 grup (przyciągnięte do
  lidera tylko gdy idzie w tę samą stronę), szersze fale (`WLg` 0,15 m).
- **Objętość:** `flowLift(ny)` (4,5–12 mm nad skórą, × `vol` tekstury) dla linii na głowie, prześwitu i powłoki pod
  spodem.
- **Kosmyki po skórze głowy (`scalpLocks`)** dla krótkich fryzur, grzywek i kucyka: korzenie Fibonacciego, kierunek z
  pola czesania (`COMB.part/back/crop/side`, `combTo`), cięcie na linii (`cutStop`, z szumem na kosmyk). Warstwy: kosmyk
  leży tym wyżej, im bliżej źródła (przedziałka) jest jego korzeń (`layer`, ślad wstecz po polu), więc nasady chowają się
  pod sąsiadami. Twarz zostaje odsłonięta (`faceAf`).
  - curtains (`hairCurtains`, według przewodników: przód do kości policzkowych, boki do płatków uszu): przedziałek na
    środku, przód najpierw do przodu, potem łukiem na boki.
  - quiff (boki jak fade, góra zaczesana do tyłu, uniesiona z przodu), slick, sidepart, pixie, grzywki (`fringeLocks`),
    koki (`pulledLocks` + `hairBunLocks`: kosmyki nawinięte spiralą na kulę).
  - Kucyk (`hairPonytail`): skóra zaczesana do gumki, ogon z 15 skręconych kosmyków wokół linii, po dwa pasemka z każdej
    strony twarzy (od skroni przed uchem, falujące, do linii żuchwy).
- Bez zmian (krótkie i teksturowane): buzz, crew, fade, curlytop, afro, twists, cornrows, dreads, braids, mullet (góra).
- Stare `hairSheet`/`hairFringe`/`hairTail` zostały w kodzie jako zapas (pod czapką, gdy brak korzeni).

## Runda 18 (2026-10-25): szyja, koszule, torba, szalik, spodnie, oversize, kołysanie włosów, crop
Prośby (zrzuty: szerokie sztruksy z „obręczami” na kolanach, krzywa szyja z tyłu, koszula z ciemnym paskiem z guzikami):
przerobić fryzury i dodać grawitację, żeby kucyk i długie włosy falowały przy ruchu kamery; odbiorcy poniżej 28 lat
(sugerować się Instagramem, TikTokiem, Pinterestem); torebka przenika bluzę; szalik stoi w powietrzu; spodnie źle leżą;
skolioza szyi; oversize zbyt kanciaste; dziwny pasek z guzikami w koszulach.
- **Szyja:** pas szyi (`neckLoftPt`) wychodzi z pierścienia w stronę głowy (75% kierunku do głowy zamiast osi szyi), a
  `BC.headC` jest o 1,2 cm bliżej podstawy szyi. Głowa wysunięta 4 cm przed podstawą dawała zgiętą szyję w kształcie S.
- **Koszule:** listwa z guzikami to już nie osobna łata (cieniowała się ciemniej), tylko przeszycia i guziki na tkaninie.
  Kieszenie: `tube` dla fragmentów (nie pełny obwód) ma prawdziwą skalę tekstury, a nie jeden kafel rozciągnięty na
  kieszeń (ciemniejsza płytka). `shPocketOnFabric` kładzie kieszeń na dopasowaną tkaninę. Szwy z boków i na dole kieszeni.
- **Torba:** listonoszka na przodzie biodra (kąt 0,8 zamiast 0,35; wcześniej ręka i rękaw przechodziły przez torbę).
  `shBagsOut` sprawdza każdy wierzchołek. W pozie cała torba (korpus, klapa, zamek) ma jedną transformację, bo wcześniej
  rozpadała się na kawałki. Nowe zestawy w `clip.js`: `bags` i `hair` (część `all`). `qaBuild` woła `scarfFinish` i
  `hairFlowFinish`.
- **Szalik:** końce symulowane po dopasowaniu ubrań (`scarfFinish` w app.js przed `hairFlowFinish`). `hairDrapeSim` /
  `hairKeepOff` z opcją `sdf` (pole odległości postaci, razem z owinięciem szalika).
- **Spodnie (`shFolds`, nogi):** bez poziomych pierścieni wokół kolan i nad dołem (wyglądały jak obręcze lub harmonijka).
  Długie pionowe fałdy (głębsze przy luźnym kroju), delikatne skośne zmarszczki pod kolanem tylko przy dopasowanych,
  załamanie tylko z przodu nad butem.
- **Oversize:** luz 3,6 cm (było 4,8), kurtki ×1,28 (było ×1,5). Obniżone ramię łagodniejsze (`topCap`: mniej na zewnątrz,
  bardziej zaokrąglone). Szerokie, miękkie pionowe fałdy tułowia i rękawów przy dużym luzie.
- **Kołysanie włosów:** `lockMat` ma uniform `HAIR_SWAY` (core.js) i atrybut `hairW` na wierzchołek (0 przy skórze, 1 na
  końcach wolnych włosów; kucyk od gumki, pasemka przy twarzy ×0,6). Sprężyna w pętli renderowania (app.js, `HS`):
  prędkość obrotu widoku wokół postaci, tłumione wahnięcie, fala w dół włosów. Póki trwa ruch, scena się renderuje.
  Cienie nie kołyszą się (materiał głębokości jest bez tego).
- **Fryzury (trendy):** crew, fade i góra mulleta to textured crop (French crop, `cropLocks`): kosmyki od wiru (z
  zawirowaniem wokół niego, `COMB.crop`) do przodu, postrzępiona krótka grzywka, boki krótkie lub fade.
  Gęsto: 360 kosmyków (crew 500), szerokie końce (`tipW 0.24`, `tap0 0.55`), warstwy od odległości do wiru (`o.upFrom`).
- **Korzenie kosmyków (`scalpLocks`, wszystkie fryzury):** spirala złotego kąta generowana od razu w gęstości dającej
  ~N korzeni w regionie. Wcześniej brano co k-ty punkt gęstej spirali i przy k bliskim liczbie Fibonacciego korzenie
  układały się w ramiona spirali: kosmyki w „płatkach” z łysą skórą między nimi (najgorzej w crew).
- **Uwaga do pracy w kopiach roboczych:** nie łączyć `cd` z `&&` po poleceniu, które może zawieść (np. brak `rsync`):
  dalsze polecenia wykonają się w głównym repo. Zawsze ścieżki bezwzględne.

## Runda 19 (2026-10-25): głowa, wiatrówka, spodnie przy kostkach, kieszenie, przód spodni, buty, czapki
Prośba: głowa „wyciągnięta do przodu”, spodnie mocno poszerzają się przy kostkach, lekko wygładzić wszystkie pogniecenia
(szczególnie spodnie), subtelniejsze kieszenie spodni, naprawić zdjęcie (czerwona wiatrówka z granatowym pasem
z poszarpaną krawędzią), lepsze czapki i czapki z daszkiem.
- **Głowa (`headPt`, body.js):** dolna połowa „jajka” była ścinana do przodu o 0,3·zf (broda ~3 cm przed czołem, długa
  oś głowy pochylona: głowa wysunięta na szyi). Teraz 0,14. Żuchwa czytelna, broda nad szyją.
- **Bloki koloru (wiatrówka, `colorblock`):** jedna rura korpusu z `geometry.userData.matBands=[{y0,y1,mat}]`. Powłoka
  (`buildShells` → `L.bands`, `shEmit`) tnie trójkąty dokładnie po wysokościach pasa (nowe wierzchołki na krawędziach,
  wspólne dla obu stron) i nie zawija tam brzegu (`shTurnEdge` z `skip`). Wcześniej trzy rury i materiał trójkąta z siatki
  pomocniczej: schodkowa krawędź.
- **Dół nogawek:** `legWrinkles` (fala nad dołem 0,35→0,1, szum, kolano, krok mniej), `shKeptOverShoes` rozchodzi się w górę
  z zanikiem 0,82 (było 0,93: dzwon wokół kostki). Wszystkie fałdy `shFolds` ×0,8, nogawki płycej.
- **Spodnie na butach z cholewką:** `PANTS.hem` zapamiętany; sznurówki, haczyki, zamek, przeszycia, uchwyty i krążek
  cholewki zasłonięte nogawką nie są budowane (shoes.js, `shown(y)`). `shObstacles` bierze przeszkodę z okna ±8 mm
  w pionie (kołnierz cholewki przecinał trójkąt nad nią) i jest wołany drugi raz po fałdach (drape/hull/fałdy znają tylko
  ciało). Zachowany dół: `shKeptOverShoes`, a przy cholewce sięgającej powyżej cięcia (`OB.top>legCut`) jeszcze `shBlendKept` →
  `shKeptOverShoes(…,false)` (przy niskich butach drugie wypchnięcie robiło ostre garby).
- **Przód spodni (krocze):** na końcu `shBodyClear` reguła zwisania z rozporka, tylko u mężczyzn (u kobiet robiła próg),
  kolumny |x|<7 cm, cofanie ≤0,45 na jednostkę wysokości: tkanina nie podwija się pod wybrzuszenie (z przodu spodnie wyglądały jak pośladki). „Wąsy” przy
  kroczu ukośne i płytsze. (Próbowana wypukła otoczka przodu w przekrojach dawała ostre załamania w clip: usunięta.)
- **Fałdy ×0,75 w zagłębieniach, ×0,9 na wypukłościach** (równe ×0,8 zbliżało tkaninę do skóry: prześwit na biodrach
  przy sylwetce heavy). `tools/qa/clip.js`: `QA_FLAGS=a,b` ustawia `window.a=window.b=1` (porównania z wyłączonym krokiem).
- **Kieszenie:** przeszycia tonalne poza denimem (−0,14 zamiast −0,28), kieszenie wpuszczane z tyłu jako dwie wypustki
  z cienką szczeliną (było: ciemny blok jak dziura), kieszeń cargo płaska (4 mm) w kolorze spodni.
- **Czapki (acc.js):** `crownPt` / `crownShell`: główka jako superelipsoida od linii czapki do własnego wierzchu (nigdy
  w głowie). Baseball/trucker: okrągła główka z podniesionym przodem, szwy, wywietrzniki, guzik, pasek z tyłu, daszek
  dłuższy, wygięty, z przeszyciami (opadanie skaluje się z wysięgiem: końce nie wchodzą w skronie). Beanie/fisherman:
  zaokrąglona, gruby zamknięty mankiet, metka. Bucket: niska główka z płaskim wierzchem, miękkie opadające rondo.
  `hatLineNy` uśredniona w oknie ±0,3 rad (bez „V” z tyłu). Kaszkiet, beret, fedora, kufi bez zmian.
- **Znane, nie ruszane:** zarost (`beard`) to płaskie ciemne płaty; dłoń opierająca się o biodro może przeciąć detal
  spodni (nit/szlufka).

## Runda 20 (2026-10-30): zarost, polowanie na usterki
Prośba: poprawić zarost i wszystkie usterki (przenikania, glitche, artefakty).
- **Zarost (hair.js, `buildBeard`):** stary zarost to płaty `beardPatch` (stubble przezroczysty z `FrontSide` - jego trójkąty
  patrzą w głowę, więc był w całości odrzucany i nigdy się nie wyświetlał). Teraz: warstwa podkładu `beardGroundMat`
  (nakrapiana alfa, poszarpane brzegi zanikające w skórę, `DoubleSide`) + krótkie kosmyki `beardLocks` (`scalpLocks`
  z podanymi korzeniami, czesane w dół, na policzkach na zewnątrz; gęstość maleje ku krawędziom: `eTop`, `eSide`).
  stubble = sam podkład, short/full/goatee/mustache = podkład + kosmyki. `stubbleMat` usunięty z core.js.
- **Powłoka ubrań na ciele z rzeźbą (`shellBase`):** `muscleRelief` jak w renderowanym ciele (mhGeo). Bez tego ubrania
  dopasowywano do gładszego ciała, a wypukłości (góra pośladków przy pełnej sylwetce) przebijały obcisłe spodnie.
- **`shBodyClear`:** odsunięcie od najbliższego punktu ciała wszędzie (wcześniej tylko krocze i pachy).
- **`shSkirtClear`:** elementy nie dopasowane jako powłoka (spódnice, curtain długich topów, doły koszul, zachowane doły
  nogawek) ≥3 mm od ciała wzdłuż normalnej najbliższego punktu. Także gdy nie ma żadnej powłoki. Przesunięcie jest
  rozlewane na sąsiadów (10 przejść, ×0.88, nigdy mniej niż własne) – samo przesunięcie pojedynczych wierzchołków robiło
  uskoki w plisach i kiltach (clip „ostra krawędź na bottom”). Clip i tak liczy tam więcej ostrych krawędzi niż w r19
  (fałdy plis/stacked, renderami sprawdzone, że to nie usterki), za to prześwit skóry przez dół 1822 → ~180 px.
- **Top wpuszczony w spódnicę** zostaje pod spódnicą (spódnica to nie powłoka, `shOrder` jej nie widział).
- **Curtain** (dół długiego płaszcza/kimona) układa się także na curtainach niższych warstw.
- **Kołnierz pod golfem:** `underTurtle` w `buildTop` – koszula/polo/kaptur/golf dolnej warstwy pod golfem (mid) nie ma
  kołnierza. Golf: promień nie mniejszy niż tułów+7 mm (kapturowy mięsień przebijał przy karku).
- **Bandana na golfie** (`turtleWorn`, `neckRing`).
- Fałszywe alarmy clip zostawione: kołnierz w otwartym przodzie kurtki („top przez outer”), goła pięta w klapkach.
