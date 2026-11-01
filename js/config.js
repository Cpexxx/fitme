/* Fitme – konfiguracja serwisu.
   1) cloud: adres projektu Supabase i klucz "anon public" (Supabase -> Project Settings -> API). Klucz anon jest publiczny
      z założenia (bezpieczeństwo zapewniają reguły RLS z supabase/schema.sql), więc może być w repozytorium.
      Puste = aplikacja działa bez kont (tryb gościa, zapis tylko na urządzeniu).
   2) operator: dane usługodawcy i administratora danych do regulaminu i polityki prywatności (wymagane prawem:
      UŚUDE art. 5, RODO art. 13). Uzupełnij przed uruchomieniem kont dla innych osób.
   Instrukcja krok po kroku: supabase/README.md */
const FITME_CONFIG={
  cloud:{url:'',anonKey:''},
  /* adres wersji przeglądarkowej: linki w mailach (potwierdzenie konta, reset hasła) i linki do profili/fitów z aplikacji desktopowej */
  site:'https://cpexxx.github.io/fitme/',
  operator:{
    name:'',          /* imię i nazwisko albo nazwa firmy */
    address:'',       /* adres do doręczeń */
    email:'',         /* kontakt w sprawach serwisu, danych osobowych i zgłoszeń (DSA: punkt kontaktowy) */
    taxId:''          /* NIP, jeśli działalność gospodarcza (opcjonalnie) */
  },
  /* region serwera bazy (do polityki prywatności); przy zakładaniu projektu wybierz region w UE, np. Frankfurt */
  dataRegion:'UE (Frankfurt, eu-central-1)',
  /* wersja dokumentów: zmiana daty = użytkownicy z kontem zobaczą prośbę o akceptację nowej wersji */
  legalVersion:'2026-10-16',
  minAge:16
};
