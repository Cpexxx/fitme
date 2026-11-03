# Fitme: droga do produktu gotowego dla ludzi

Plan z 2026-11-03 (prośba użytkownika: produkt gotowy do użytku, wszystkie funkcje, kompatybilność, bezpieczeństwo,
konta, przejrzyste UI z zakładkami, optymalizacja, jakość funkcji). Czytaj przed pracą nad nowymi funkcjami. Odhaczaj
punkty (`[x]`) i dopisuj datę/rundę, gdy coś zrobisz. Kolejność etapów ma znaczenie: każdy kolejny zakłada poprzedni.

## Stan wyjściowy (2026-11-03)
- Jest: kreator 3D (silnik ubrań `shell.js`, ~20 typów góry/dołu, buty, akcesoria, fryzury, pozy), zapis/udostępnianie
  kodem `FIT3.…`, zakładki Kreator / Społeczność / Zachowane, ekran powitania, warstwa kont i społeczności (Supabase:
  RLS na każdej tabeli, 115 testów RLS, e2e w przeglądarce), dokumenty prawne, baner zgód, Electron (contextIsolation,
  sandbox, bez nodeIntegration, blokada nawigacji), wersja web na GitHub Pages, QA renderów (clip/sweep/render/ui).
- Brakuje: podłączonego serwera (`config.js` → `cloud.url` puste, dane operatora puste), CSP, testów w CI, wersjonowania
  i podpisywania wydań, Windows/macOS w wydaniach, mobile, dostępności, wydajności (przebudowa 1,7–3,5 s na wątku UI).

## Kryteria „gotowe do wydania 1.0” (Definition of Done)
1. Zero znanych błędów krytycznych/wysokich (bezpieczeństwo, utrata danych, crash, brak WebGL bez komunikatu).
2. Testy w CI zielone przy każdym PR: jednostkowe, RLS, e2e kont, QA renderów z progami regresji, audyt zależności.
3. Start < 3 s, przebudowa stroju < 1 s (średni laptop), 60 fps przy obracaniu, < 400 MB RAM.
4. Działa: Chrome/Edge/Firefox/Safari (ostatnie 2 wersje), Android Chrome, iOS Safari, Windows 10+, macOS 13+, Ubuntu 22.04+.
5. WCAG 2.2 AA w interfejsie (poza samym widokiem 3D), PL + EN.
6. Dokumenty prawne kompletne (operator, RODO, DSA), procedura zgłoszeń i usuwania konta działa.
7. Monitoring błędów, kopie zapasowe bazy, środowisko testowe (staging), procedura wydania i wycofania.

---

## Etap 0. Decyzje użytkownika (zanim ruszy etap 2)
- [ ] Hosting backendu: Supabase Cloud w regionie UE (zalecane) czy własny serwer.
- [ ] Domena (np. fitme.pl), skrzynka kontaktowa, dane operatora do regulaminu (firma/osoba, adres, e-mail, NIP).
- [ ] Platformy na start: web + Linux + Windows; macOS i mobile (PWA czy aplikacje sklepowe) później?
- [ ] Logowanie: e-mail + hasło; dodatkowo Google/Apple? 2FA od początku?
- [ ] Model: darmowy / freemium / reklamy (wpływa na prawo, płatności, analitykę). Domyślnie: darmowy bez reklam.
- [ ] Języki: PL + EN na start.

## Etap 1. Fundament inżynierski (bez tego reszta się sypie)
- [ ] Wersjonowanie semver (`0.x` do wydania 1.0), CHANGELOG.md, tag na wydanie, kanały `stable` i `beta`.
- [ ] CI na PR (GitHub Actions): lint (eslint), testy jednostkowe (core/fit/shell: funkcje czyste), test-db (RLS),
      e2e kont, `clip.js random:80` + `sweep` z progami (regresja = czerwony PR), `npm audit`/Dependabot.
- [ ] Bundler (esbuild): moduły zamiast globalnego zakresu stopniowo, minifikacja, source maps (prywatne), hash w nazwach
      plików zamiast ręcznego `?v=`.
- [ ] Testy jednostkowe dla kodu `FIT3.…` (parsowanie, wersje, limity), `sanitize()` stanu, migracji stanu `v`.
- [ ] Środowiska: dev (lokalny stos `tools/cloud/stack.js`), staging (osobny projekt Supabase), produkcja.
- [ ] Obsługa błędów globalnie: `window.onerror`/`unhandledrejection` → przyjazny komunikat + raport (za zgodą).
- [ ] Brak WebGL / crash GPU: czytelny ekran z instrukcją (już częściowo w Electron: relaunch z SwiftShader).

## Etap 2. Konta i backend (włączenie tego, co już jest, i domknięcie)
- [ ] Projekt Supabase w UE, `schema.sql` wdrożony migracjami (supabase CLI), `config.js` uzupełniony.
- [ ] Rejestracja: e-mail + hasło (min. 10 znaków, sprawdzenie w bazie wycieków HIBP k-anonymity), potwierdzenie
      e-mailem, CAPTCHA (Cloudflare Turnstile/hCaptcha) na rejestracji i resecie hasła, weryfikacja wieku (16+).
- [ ] Logowanie: e-mail/hasło, opcjonalnie OAuth Google/Apple (PKCE), „zapamiętaj mnie”, wylogowanie ze wszystkich urządzeń.
- [ ] 2FA (TOTP, Supabase MFA) + kody zapasowe; wymagane dla kont moderatorów.
- [ ] Reset hasła, zmiana e-maila (potwierdzenie na oba adresy), zmiana hasła (wymaga obecnego).
- [ ] RODO: eksport danych (JSON), usunięcie konta (z okresem 14 dni na cofnięcie), historia zgód.
- [ ] Synchronizacja szafy/zapisanych fitów między urządzeniami; konflikt = nowsza wersja + kopia starszej.
- [ ] Awatary w Storage: tylko obrazy, limit 2 MB, przeskalowanie po stronie serwera, usunięcie EXIF.
- [ ] Moderacja: zgłoszenia treści i kont, panel moderatora (rola w bazie, nie w kliencie), blokady, limity nadużyć
      (już są triggery: przejrzeć progi), procedura DSA (uzasadnienie decyzji, odwołanie).
- [ ] Kopie zapasowe (PITR w Supabase), test odtworzenia raz na kwartał.

## Etap 3. Bezpieczeństwo (ochrona przed atakami)
Cel: OWASP ASVS poziom 2 dla części webowej, Electron Security Checklist w całości.
- [ ] **CSP** bez `unsafe-inline`/`unsafe-eval`: przenieść inline `<script>`/style do plików, `script-src 'self'`,
      `connect-src` tylko Supabase, `frame-ancestors 'none'`. GitHub Pages nie ustawia nagłówków → hosting z nagłówkami
      (Cloudflare Pages/Netlify) albo meta CSP + reszta w Electron przez `session.webRequest`.
- [ ] Nagłówki: HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin`, `Permissions-Policy` (kamera/mikrofon off).
- [ ] XSS: każda treść od użytkowników (nazwy fitów, bio, komentarze, nazwy profili) tylko przez `textContent`/escape;
      audyt wszystkich `innerHTML` w `account.js`/`app.js`; testy z ładunkami XSS w e2e.
- [ ] Kod `FIT3.…` i dane z sieci jako niezaufane: limit długości, walidacja schematu (typy, zakresy, znane klucze),
      brak `eval`/`Function` na danych, fuzzing parsera.
- [ ] RLS: przegląd każdej polityki pod kątem IDOR, testy negatywne (cudzy profil/fit/powiadomienie), funkcje
      `security definer` z `search_path` ustawionym, brak kluczy `service_role` w kliencie (skaner w CI).
- [ ] Limity: rate limiting na logowaniu/rejestracji/komentarzach (Supabase + Edge Function), blokada po N próbach.
- [ ] Electron: `contextIsolation`+`sandbox` (jest), brak `remote`, IPC tylko z białej listy, `setWindowOpenHandler`
      i `will-navigate` (jest), `disable-gpu-sandbox` tylko gdy potrzebne (wykrycie, a nie zawsze), Electron aktualny,
      fuses (`RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, ASAR integrity).
- [ ] Wydania podpisane: Windows (Authenticode), macOS (notaryzacja), Linux (podpis GPG + sumy SHA256), auto-update
      tylko z podpisanych paczek (electron-updater, HTTPS, weryfikacja podpisu).
- [ ] Łańcuch dostaw: vendor/ z sumami SRI, Dependabot, `npm ci` z lockfile, ochrona gałęzi `main` (PR + review + CI),
      skanowanie sekretów (GitHub secret scanning), 2FA na koncie GitHub i Supabase.
- [ ] Prywatność: zero śledzenia bez zgody, logi bez danych osobowych, krótka retencja.
- [ ] Przed 1.0: zewnętrzny przegląd/pentest (choćby podstawowy) + `security.txt` i kanał zgłaszania podatności.

## Etap 4. Interfejs: przejrzysty, z zakładkami
- [ ] Architektura informacji (górny pasek / dolny na telefonie):
  1. **Kreator**: podzakładki Sylwetka · Góra · Warstwa środkowa · Okrycie · Dół · Buty · Akcesoria · Fryzura · Poza.
  2. **Szafa**: zapisane fity i ubrania, foldery/kolekcje, wyszukiwarka, sortowanie, duplikowanie.
  3. **Odkrywaj** (Społeczność): Polecane · Obserwowane · Trendy · Wyszukaj (styl, tag, kolor, użytkownik).
  4. **Profil**: moje fity, obserwujący, polubione, edycja profilu.
  5. **Ustawienia**: konto i bezpieczeństwo, prywatność i zgody, jakość grafiki, język, motyw, dostępność, o aplikacji.
- [ ] Panel ubrania: karta z miniaturami, kolor/wzór/materiał/krój/rozmiar w jednym miejscu, „losuj”, „resetuj”.
- [ ] Cofnij/ponów (Ctrl+Z/Y), historia zmian stroju, porównanie dwóch stylizacji obok siebie.
- [ ] Onboarding: 3 kroki przy pierwszym uruchomieniu (wybierz sylwetkę → załóż coś → zapisz/udostępnij), podpowiedzi.
- [ ] Wyszukiwarka i filtry w katalogu (styl, okazja, pora roku, kolor), ulubione elementy.
- [ ] Stany: ładowanie (szkielety, pasek budowy), puste, błąd z akcją, offline; toasty zamiast `alert`.
- [ ] Udostępnianie: link do fita z podglądem (obraz Open Graph), eksport PNG (tło, rozdzielczość), kod `FIT3`.
- [ ] Responsywność: telefon (dolne zakładki, arkusz od dołu z opcjami), tablet, desktop; dotyk (pinch zoom, obrót).
- [ ] Dostępność WCAG 2.2 AA: kontrast, pełna obsługa klawiaturą, focus, ARIA dla zakładek/list, opisy alternatywne
      dla podglądów, `prefers-reduced-motion`, skalowanie tekstu do 200%.
- [ ] i18n: wszystkie teksty do plików językowych (PL, EN), formaty dat/liczb, rozmiary EU/US/UK.
- [ ] Motyw jasny/ciemny + spójny system projektowy (tokeny kolorów, typografia Archivo, odstępy, ikony).
- [ ] Testy użyteczności: 5 osób z grupy docelowej (<28 lat) przed betą, poprawki, drugi raz przed 1.0.

## Etap 5. Optymalizacja
- [ ] Budżety mierzone w CI (Lighthouse + własny pomiar budowy): start, przebudowa, fps, pamięć, rozmiar paczki.
- [ ] `buildShells` i cięższe kroki (drape, folds, włosy) w Web Workerze (transfer typed arrays), UI nie zamarza.
- [ ] Przebudowa przyrostowa: zmiana koloru = tylko materiały (jest), zmiana jednej warstwy = tylko ta warstwa i wyższe.
- [ ] Cache wyników po kluczu stanu (IndexedDB), podgląd niskiej jakości od razu, pełna jakość w tle.
- [ ] Tekstury: generowane raz i cache'owane, KTX2/Basis dla stałych, mniejsze rozdzielczości na słabym sprzęcie.
- [ ] Automatyczny profil jakości (wykrycie GPU/SwiftShader → niska/średnia/wysoka), przełącznik w Ustawieniach.
- [ ] Dispose geometrii/materiałów przy przebudowie (bez wycieków), test długiej sesji (100 zmian) w CI.
- [ ] Ładowanie leniwe modułów (społeczność, konta, dokumenty) i three.js z vendor z kompresją (brotli na hostingu).
- [ ] Miniatury w Społeczności renderowane po stronie serwera albo zapisywane przy publikacji (nie w przeglądarce widza).

## Etap 6. Kompatybilność
- [ ] Macierz testów Playwright: Chromium, Firefox, WebKit; mobile emulacja + prawdziwe urządzenia przed wydaniem.
- [ ] WebGL2 z awaryjnym WebGL1; komunikat, gdy brak WebGL; tryb programowy (SwiftShader) jako „niska jakość”.
- [ ] Desktop: Windows (instalator NSIS + zip), macOS (dmg, universal, notaryzacja), Linux (AppImage + deb, opcjonalnie
      Flatpak), auto-update. Wydania ze wszystkich trzech w CI.
- [ ] GPU: znane problemy (AMD na Linuksie: crash przy X11) z obejściami wykrywanymi automatycznie, nie flagami.
- [ ] PWA: manifest, service worker (offline dla kreatora i szafy), instalacja na telefonie.
- [ ] Format `FIT3` wersjonowany i wstecznie zgodny (stare kody zawsze się otwierają, test w CI na zbiorze kodów).

## Etap 7. Jakość funkcji (silnik i treść)
- [ ] Znane usterki silnika (HANDOFF, rundy 20–22): ciemny „dołek” pod paskiem u kobiet (przebudowa przodu spodni:
      panel rozporka wyrównany do nogawek), schodek krawędzi rozpiętych długich płaszczy na `lowerCut`, linia na goleni,
      palce w szerokich koszulach (brak odtworzenia), poszarpane brzegi nogawek nad botkami.
- [ ] Detektor clip jako bramka jakości: progi na każdą kategorię prześwitów, raport w PR z obrazami przed/po.
- [ ] Katalog: więcej ubrań i marek-stylów (bez znaków towarowych), sezonowe dodatki, materiały (skóra, dżins, dzianina)
      z realistycznym połyskiem, wzory użytkownika (wgranie własnej grafiki z moderacją).
- [ ] Sylwetka: więcej proporcji i typów ciała, wzrost/waga → rozmiar, tabela rozmiarów, dobór rozmiaru per marka (później).
- [ ] Ruch: pozy + płynne przejścia, krótka animacja chodu (podgląd jak leży ubranie w ruchu).
- [ ] Fotografia: tło/oświetlenie studyjne, eksport wysokiej jakości, kadry (cała postać, portret, detale).
- [ ] Szafa „z prawdziwego zdarzenia”: własne ubrania (nazwa, kolor, kategoria), planer stylizacji na tydzień (później).

## Etap 8. Społeczność
- [ ] Profile, obserwowanie, polubienia, komentarze (moderacja, filtr wulgaryzmów, zgłaszanie), kolekcje, remix fita
      (otwórz cudzy fit w kreatorze z przypisaniem autora).
- [ ] Feed: Polecane (proste sygnały: świeżość + polubienia), Obserwowane, Trendy tygodnia; paginacja kursorem.
- [ ] Powiadomienia w aplikacji (są w bazie) + e-mail (opcjonalnie, z wypisaniem).
- [ ] Prywatność: konto prywatne (jest), blokowanie (jest), ukrywanie z wyszukiwania, kontrola komentarzy.

## Etap 9. Prawo i zaufanie
- [ ] Dane operatora i kontakt w `config.js`, regulamin, polityka prywatności, cookies (są szkice w `legal.js`):
      przegląd prawny przed startem, wersjonowanie zgód (jest `legalVersion`).
- [ ] DSA: punkt kontaktowy, zgłaszanie nielegalnych treści, uzasadnienia decyzji, raport przejrzystości (jeśli wymagany).
- [ ] Wiek: 16+ (jest `minAge`), zgoda rodzica poniżej progu = brak konta.
- [ ] Licencje: MakeHuman CC0, Archivo OFL, three.js MIT, supabase-js MIT: strona „Licencje” w aplikacji.

## Etap 10. Operacje i wydanie
- [ ] Monitoring błędów (Sentry lub własny endpoint) tylko za zgodą, bez danych osobowych; alerty.
- [ ] Analityka bez cookies (np. Plausible) za zgodą: aktywacja, zapisane fity, retencja.
- [ ] Strona produktu (landing), FAQ, pomoc, formularz opinii w aplikacji, status usług.
- [ ] Procedura wydania: beta zamknięta (20–50 osób) → beta otwarta → 1.0; checklista wydania i wycofania.
- [ ] Wsparcie: skrzynka, szablony odpowiedzi, czas reakcji na zgłoszenia bezpieczeństwa i DSA.

## Kamienie milowe
| M | Zakres | Wynik |
|---|---|---|
| M1 | Etap 0 + 1 | decyzje, CI z testami i progami, wersjonowanie, bundler |
| M2 | Etap 2 + 3 (rdzeń) | konta działają na produkcji, CSP, audyt XSS/RLS, podpisane wydania |
| M3 | Etap 4 | nowy interfejs z zakładkami, mobile, dostępność, PL/EN |
| M4 | Etap 5 + 6 | Worker, budżety wydajności, Windows/macOS/Linux/PWA, macierz przeglądarek |
| M5 | Etap 7 + 8 | jakość silnika i katalogu, pełna społeczność z moderacją |
| M6 | Etap 9 + 10 | prawo, monitoring, beta zamknięta → otwarta → **1.0** |

Zasada na każdy etap: zmiany małymi krokami, każda z testem lub renderem przed/po, regresja (clip/sweep/ui/e2e) przed
pushem na `main`, wpis w HANDOFF.md i odhaczenie punktu tutaj.
