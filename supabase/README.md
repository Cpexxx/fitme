# Fitme – włączenie kont i społeczności (Supabase)

Bez tej konfiguracji Fitme działa w trybie gościa. Ekran powitania pokazuje wtedy tylko „Przejdź do projektowania”,
a fity zapisują się na urządzeniu. Konta, profile, obserwowanie, komentarze i powiadomienia wymagają serwera.
Używamy Supabase: darmowy plan wystarcza na start. Konfiguracja zajmuje około 15 minut.

## 1. Projekt
1. Załóż konto na https://supabase.com i kliknij **New project**.
2. **Region: Central EU (Frankfurt)**. Dane użytkowników zostają wtedy w UE, tak jak opisuje polityka prywatności.
3. Zapisz hasło do bazy w bezpiecznym miejscu. Aplikacja go nie potrzebuje.

## 2. Baza danych
**SQL Editor → New query →** wklej całą zawartość `supabase/schema.sql` → **Run**. Wynik powinien brzmieć „Success. No rows returned”.
Skrypt możesz uruchamiać ponownie po aktualizacjach. Dane zostają, a funkcje i reguły dostępu się odświeżają.

## 3. Logowanie (Authentication)
- **Sign In / Providers → Email:** włączone. Zaznacz **Confirm email** i **Secure email change**, ustaw minimalną długość hasła na **8**.
- **URL Configuration:**
  - Site URL: `https://cpexxx.github.io/fitme/`
  - Redirect URLs: `https://cpexxx.github.io/fitme/**`
- **Emails → SMTP Settings: ważne.** Wbudowana poczta Supabase wysyła maile tylko do członków zespołu projektu i ma bardzo niski limit.
  Żeby inni mogli się rejestrować, podłącz własny serwer SMTP. Darmowe plany mają np. Resend, Brevo i Postmark.
  Nadawca: np. `Fitme <noreply@twojadomena.pl>`.
- **Emails → Templates:** przetłumacz maile, np.:
  - *Confirm signup*. Temat: `Potwierdź konto w Fitme`. Treść: `<h2>Witaj w Fitme!</h2><p>Kliknij, żeby potwierdzić adres e-mail:</p><p><a href="{{ .ConfirmationURL }}">Potwierdzam</a></p><p>Jeśli to nie Ty zakładałeś(-aś) konto, zignoruj tę wiadomość.</p>`
  - *Reset password*. Temat: `Nowe hasło do Fitme`. Treść: `<p>Kliknij, żeby ustawić nowe hasło:</p><p><a href="{{ .ConfirmationURL }}">Ustaw nowe hasło</a></p><p>Jeśli to nie Ty, zignoruj tę wiadomość. Hasło się nie zmieni.</p>`
  - *Change email address*. Temat: `Potwierdź nowy adres e-mail`. Treść: `<p>Kliknij, żeby potwierdzić zmianę adresu na {{ .NewEmail }}:</p><p><a href="{{ .ConfirmationURL }}">Potwierdzam</a></p>`
- Opcjonalnie: **Attack Protection → CAPTCHA** (hCaptcha lub Turnstile) przeciw botom. Wymaga też drobnej zmiany w kodzie.

## 4. Podłączenie aplikacji
1. **Project Settings → API**: skopiuj **Project URL** i klucz **anon public**.
2. Wpisz je w `js/config.js` → `cloud:{url:'https://xxxx.supabase.co',anonKey:'eyJ…'}`.
   Klucz *anon* jest publiczny z założenia. Dostępu pilnują reguły RLS w bazie. **Nigdy** nie wpisuj klucza *service_role*.
3. W `js/config.js` uzupełnij `operator`: imię i nazwisko lub firmę, adres i e-mail kontaktowy.
   Wymagają tego przepisy (UŚUDE art. 5, RODO art. 13, DSA art. 11–12). Do tego czasu dokumenty pokazują żółte pola „do uzupełnienia”.
4. Commit i push. CI zbuduje aplikację i stronę.

## 5. Obowiązki prawne operatora (krótko)
- **Umowa powierzenia (DPA) z Supabase:** Dashboard → Organization → Legal Documents → podpisz DPA.
- **Moderacja (DSA):** zgłoszenia trafiają do tabeli `reports` (Table Editor). Rozpatruj je bez zbędnej zwłoki. Usunięcie treści to usunięcie wiersza w `fits` albo `comments`.
  Zablokowanie konta: Authentication → Users → … → Ban user. Autorowi i zgłaszającemu wyślij e-mailem decyzję z uzasadnieniem. Odpowiedź do zgłaszającego wpisz w `resolution` i zmień `status`.
- **Retencja zgłoszeń:** raz w miesiącu (albo przez pg_cron) uruchom
  `delete from public.reports where status <> 'open' and resolved_at < now() - interval '12 months';`
- **Prośby o dane (RODO):** użytkownicy pobierają dane i usuwają konto sami w ustawieniach. Pozostałe sprawy załatwiasz przez e-mail kontaktowy.
- Dokumenty w `js/legal.js` to rzetelny szablon pod prawo PL i UE, ale **nie zastępują porady prawnika**.
  Zmiana `legalVersion` w `js/config.js` sprawi, że zalogowani użytkownicy zobaczą prośbę o akceptację nowej wersji.

## 6. Ograniczenia darmowego planu
- Projekt **usypia po 7 dniach bez ruchu**. Wybudzisz go w panelu. Plan Pro tego nie robi.
- Baza ma 500 MB. Miniatury fitów są w bazie (ok. 20–60 kB na fit), co daje kilka tysięcy fitów. Przy większej skali warto przenieść miniatury do Supabase Storage.

## Testy lokalne (bez Supabase)
`tools/cloud/stack.js` uruchamia ten sam zestaw co Supabase: Postgres 16, serwer logowania GoTrue, PostgREST i skrzynkę SMTP.
- `tools/cloud/test-db.js`: 115 testów reguł dostępu.
- `tools/cloud/e2e.js`: pełny scenariusz w przeglądarce.

Instrukcje uruchomienia są w nagłówkach plików.
