'use strict';
/* =============== Fitme: dokumenty prawne ===============
   Jedno źródło treści dla okna w aplikacji i dla strony legal.html (linki z maili i ze stopki).
   Dane usługodawcy pochodzą z FITME_CONFIG.operator (js/config.js). Puste pola są wyraźnie oznaczone jako do uzupełnienia.
   Uwaga dla właściciela serwisu: to rzetelny szablon pod prawo polskie i unijne (RODO, DSA, UŚUDE, Prawo komunikacji
   elektronicznej), ale nie zastępuje porady prawnika – przed startem dla szerokiej publiczności warto go skonsultować. */
const LEGAL_DOCS={terms:'Regulamin',privacy:'Polityka prywatności',cookies:'Cookies i pamięć urządzenia',community:'Zasady społeczności',contact:'Zgłoszenia i kontakt'};
function legalHTML(key){
  const C=FITME_CONFIG,O=C.operator||{},e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const op=(k,label)=>O[k]?e(O[k]):'<mark class="todo">[do uzupełnienia: '+label+']</mark>';
  const mail=O.email?'<a href="mailto:'+e(O.email)+'">'+e(O.email)+'</a>':op('email','adres e-mail');
  const who=op('name','imię i nazwisko lub nazwa firmy')+', '+op('address','adres')+(O.taxId?', NIP '+e(O.taxId):'');
  const ver='<p class="lver">Wersja z dnia '+e(C.legalVersion)+'.</p>';
  const D={
terms:`
<p class="lead">Ten regulamin opisuje, na jakich zasadach możesz korzystać z Fitme: kreatora outfitów 3D, kont użytkowników i społeczności.
Kreator działa bez konta. Konto jest bezpłatne i potrzebne tylko do publikowania fitów i funkcji społecznościowych.</p>
<h3>§ 1. Usługodawca</h3>
<p>Serwis Fitme (strona internetowa i aplikacja desktopowa) prowadzi ${who}. Kontakt: ${mail}.
Regulamin jest wydany na podstawie art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.</p>
<h3>§ 2. Pojęcia</h3>
<ul><li><b>Serwis</b> – Fitme w wersji przeglądarkowej i desktopowej.</li>
<li><b>Gość</b> – osoba korzystająca z Serwisu bez konta.</li>
<li><b>Użytkownik</b> – osoba, która założyła konto.</li>
<li><b>Fit</b> – zapisany zestaw ubrań, fryzury, akcesoriów i ustawień manekina, razem z nazwą, opisem i miniaturą.</li>
<li><b>Treści użytkownika</b> – fity, komentarze, zdjęcie profilowe, opis profilu i inne treści dodane przez Użytkownika.</li></ul>
<h3>§ 3. Co oferujemy</h3>
<ol><li>Bez konta: kreator outfitów na manekinie 3D, przeglądanie przykładowych i publicznych fitów, zapis fitów w pamięci Twojego urządzenia, kody do udostępniania.</li>
<li>Z kontem: profil (nazwa użytkownika, zdjęcie, opis), publikowanie fitów z wyborem widoczności (publiczny, dla obserwujących, tylko dla mnie),
obserwowanie innych osób, konto prywatne z akceptacją próśb o obserwowanie, polubienia, komentarze, powiadomienia, historia oglądania,
synchronizacja ustawień aplikacji między urządzeniami, blokowanie i zgłaszanie treści.</li>
<li>Wszystkie usługi są bezpłatne. Serwis nie wyświetla reklam.</li></ol>
<h3>§ 4. Wymagania techniczne</h3>
<p>Potrzebujesz aktualnej przeglądarki z obsługą JavaScript i WebGL albo aplikacji desktopowej dla systemu Windows lub Linux.
Funkcje konta wymagają połączenia z internetem. Do konta potrzebny jest działający adres e-mail.</p>
<h3>§ 5. Konto</h3>
<ol><li>Konto może założyć osoba, która ukończyła ${e(C.minAge)} lat.</li>
<li>Rejestracja wymaga podania adresu e-mail, hasła i nazwy użytkownika oraz akceptacji regulaminu. Umowa o prowadzenie konta zostaje zawarta
na czas nieoznaczony z chwilą potwierdzenia adresu e-mail.</li>
<li>Jedna osoba może mieć konto tylko dla siebie. Nie podszywaj się pod inne osoby ani marki i chroń swoje hasło.</li>
<li>Możesz usunąć konto w każdej chwili w ustawieniach konta („Twoje dane” → „Usuń konto”). Usunięcie oznacza rozwiązanie umowy ze skutkiem natychmiastowym.</li>
<li>Jako konsument możesz odstąpić od umowy w ciągu 14 dni od jej zawarcia bez podania przyczyny. Wystarczy usunąć konto albo napisać do nas.</li></ol>
<h3>§ 6. Twoje treści</h3>
<ol><li>Odpowiadasz za treści, które dodajesz. Prawa do nich zostają przy Tobie.</li>
<li>Publikując treść, udzielasz usługodawcy nieodpłatnej, niewyłącznej licencji na jej przechowywanie, wyświetlanie i udostępnianie w Serwisie,
w zakresie widoczności, którą wybierzesz. Licencja trwa, dopóki treść jest opublikowana.</li>
<li>Fit widoczny dla innych osób można otworzyć w kreatorze, wziąć z niego pojedyncze elementy i zapisać własną wersję. Publikując fit, zgadzasz się na to.
Jeśli tego nie chcesz, ustaw widoczność „tylko dla mnie”.</li>
<li>Po usunięciu treści lub konta dane znikają z Serwisu od razu. W kopiach zapasowych mogą pozostać jeszcze najwyżej 30 dni.</li></ol>
<h3>§ 7. Zasady i moderacja</h3>
<ol><li>Obowiązują <a href="#" data-legal="community">Zasady społeczności</a>. Zakazane jest publikowanie treści bezprawnych oraz treści naruszających te zasady.</li>
<li>Każdy, także bez konta, może zgłosić treść przyciskiem „Zgłoś” albo e-mailem (szczegóły: <a href="#" data-legal="contact">Zgłoszenia i kontakt</a>).
Zgłoszenia rozpatrujemy bez zbędnej zwłoki, starannie i obiektywnie. Decyzje podejmuje człowiek: nie stosujemy automatycznej moderacji treści.
Automatycznie działają tylko limity chroniące przed spamem (np. liczba komentarzy na godzinę).</li>
<li>Jeśli treść narusza prawo lub zasady, możemy ją usunąć albo ograniczyć jej widoczność, a przy poważnych lub powtarzających się naruszeniach
zawiesić lub usunąć konto. Osobę, której dotyczy decyzja, informujemy o niej i o jej powodach (art. 17 aktu o usługach cyfrowych, DSA).
Osobę zgłaszającą informujemy o sposobie rozpatrzenia zgłoszenia.</li>
<li>Od decyzji możesz się odwołać w ciągu 6 miesięcy, odpowiadając na wiadomość z decyzją albo pisząc na ${mail}. Odwołanie rozpatruje inna osoba niż ta,
która podjęła decyzję, jeśli to możliwe. Możesz też skorzystać z certyfikowanego pozasądowego organu rozstrzygania sporów (art. 21 DSA) albo z drogi sądowej.</li></ol>
<h3>§ 8. Odpowiedzialność</h3>
<p>Dokładamy starań, żeby Serwis działał bez przerw, ale mogą zdarzyć się przerwy techniczne. Nie odpowiadamy za treści użytkowników,
dopóki nie wiemy o ich bezprawnym charakterze. Po otrzymaniu wiarygodnego zgłoszenia niezwłocznie reagujemy. Postanowienia tego paragrafu nie ograniczają
praw konsumenta wynikających z bezwzględnie obowiązujących przepisów.</p>
<h3>§ 9. Reklamacje</h3>
<p>Reklamację dotyczącą działania Serwisu wyślij na ${mail}. Opisz problem i podaj adres do odpowiedzi. Odpowiemy w ciągu 14 dni.
Konsument może skorzystać z pozasądowych sposobów rozwiązywania sporów, np. z pomocy miejskiego lub powiatowego rzecznika konsumentów albo wojewódzkiego inspektoratu Inspekcji Handlowej.</p>
<h3>§ 10. Zmiany regulaminu</h3>
<p>Regulamin możemy zmienić z ważnych powodów, np. zmiany przepisów, funkcji Serwisu lub wymogów bezpieczeństwa. O zmianach informujemy w Serwisie
co najmniej 14 dni wcześniej, chyba że zmiana wynika wprost z przepisów albo dotyczy nowej, dobrowolnej funkcji. Przy pierwszym logowaniu po zmianie poprosimy o akceptację.
Jeśli się nie zgadzasz, możesz usunąć konto.</p>
<h3>§ 11. Postanowienia końcowe</h3>
<p>Do umowy stosuje się prawo polskie. Nie pozbawia to konsumenta ochrony, jaką dają mu bezwzględnie obowiązujące przepisy państwa jego zwykłego pobytu.
Spory rozstrzyga sąd właściwy według przepisów ogólnych.</p>${ver}`,

privacy:`
<p class="lead">W skrócie: w trybie gościa Twoje fity i ustawienia zostają na Twoim urządzeniu i nie trafiają do nas. Jeśli założysz konto, przechowujemy tylko to,
czego potrzebuje konto i społeczność. Nie sprzedajemy danych, nie wyświetlamy reklam, nie używamy narzędzi analitycznych ani śledzących.
Kopię danych pobierzesz, a konto usuniesz samodzielnie w ustawieniach.</p>
<h3>1. Administrator danych</h3>
<p>Administratorem Twoich danych osobowych jest ${who}. Kontakt we wszystkich sprawach dotyczących danych: ${mail}.
Nie wyznaczyliśmy inspektora ochrony danych, bo w naszym przypadku nie jest to wymagane.</p>
<h3>2. Jakie dane przetwarzamy</h3>
<ul><li><b>Bez konta:</b> nic nie zbieramy. Fity i preferencje zapisane w trybie gościa są tylko w pamięci Twojej przeglądarki lub aplikacji (patrz
<a href="#" data-legal="cookies">Cookies i pamięć urządzenia</a>). Wersję przeglądarkową udostępnia GitHub (GitHub Pages). Przy jej otwarciu przeglądarka łączy się
z serwerami GitHub, które zapisują adres IP i dane techniczne w celach bezpieczeństwa, na zasadach opisanych w polityce prywatności GitHub.</li>
<li><b>Konto:</b> adres e-mail, hasło (zapisujemy tylko jego bezpieczny skrót i nie znamy samego hasła), nazwa użytkownika, a jeśli je dodasz: nazwa wyświetlana,
zdjęcie profilowe, opis i link.</li>
<li><b>Aktywność w serwisie:</b> fity (ustawienia, miniatura, nazwa, opis, widoczność), polubienia, komentarze, obserwowania i prośby o obserwowanie, blokady,
zgłoszenia, powiadomienia, historia oglądania (jeśli jej nie wyłączysz), ustawienia prywatności i zsynchronizowane preferencje aplikacji.</li>
<li><b>Historia konta i zgody:</b> data założenia konta, daty logowań, zmiany e-maila, hasła, nazwy i prywatności, a także zaakceptowane wersje dokumentów i data akceptacji.</li>
<li><b>Dane techniczne:</b> serwer logowania i bazy zapisuje w dziennikach adres IP, czas i rodzaj zapytania. Dzienniki przechowujemy krótko (do 7 dni) w celach bezpieczeństwa.</li></ul>
<h3>3. Cele i podstawy prawne</h3>
<ul><li>Prowadzenie konta i świadczenie usług społecznościowych: art. 6 ust. 1 lit. b RODO (umowa).</li>
<li>Bezpieczeństwo, ochrona przed nadużyciami i spamem, dochodzenie i obrona roszczeń: art. 6 ust. 1 lit. f RODO (nasz prawnie uzasadniony interes).</li>
<li>Obsługa zgłoszeń treści i decyzji moderacyjnych oraz dokumentowanie zgód: art. 6 ust. 1 lit. c RODO (obowiązki z aktu o usługach cyfrowych i art. 7 ust. 1 RODO)
oraz art. 6 ust. 1 lit. f RODO.</li>
<li>Zapamiętywanie preferencji w Twoim urządzeniu: Twoja zgoda (art. 6 ust. 1 lit. a RODO i art. 399 ustawy – Prawo komunikacji elektronicznej).
Zgodę możesz w każdej chwili wycofać w menu („Prywatność i cookies”).</li>
<li>Odpowiedzi na wiadomości i reklamacje: art. 6 ust. 1 lit. b i f RODO.</li></ul>
<h3>4. Kto widzi Twoje dane</h3>
<ul><li><b>Inni użytkownicy i internauci</b> widzą to, co ustawisz jako widoczne. Nazwa użytkownika, nazwa wyświetlana, zdjęcie profilowe i opis są publiczne zawsze, także przy koncie prywatnym.
Fity publiczne konta publicznego może zobaczyć każdy, także bez konta. Adresu e-mail nie pokazujemy nikomu.</li>
<li><b>Dostawcy, którzy przetwarzają dane na nasze zlecenie:</b> Supabase Inc. (baza danych, logowanie i wysyłka wiadomości e-mail; dane przechowywane w regionie ${e(C.dataRegion)}),
na podstawie umowy powierzenia przetwarzania danych.</li>
<li><b>Organy publiczne</b>, gdy wymagają tego przepisy.</li></ul>
<h3>5. Przekazywanie danych poza Europejski Obszar Gospodarczy</h3>
<p>Dane konta przechowujemy w UE. Supabase Inc. i GitHub Inc. to firmy z USA, więc dostęp z USA (np. w ramach wsparcia technicznego) jest możliwy.
Odbywa się na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję Europejską (art. 46 ust. 2 lit. c RODO) albo, w przypadku podmiotów certyfikowanych,
decyzji Komisji o odpowiednim stopniu ochrony (EU-US Data Privacy Framework). Kopię zabezpieczeń możesz otrzymać na prośbę.</p>
<h3>6. Jak długo przechowujemy dane</h3>
<ul><li>Dane konta i treści: do usunięcia konta lub treści. Po usunięciu znikają z bazy od razu, a z kopii zapasowych najpóźniej po 30 dniach.</li>
<li>Historia oglądania: do jej wyczyszczenia, najwyżej 200 ostatnich pozycji. Historia konta: 200 ostatnich zdarzeń.</li>
<li>Zgłoszenia treści: przez czas potrzebny do ich rozpatrzenia i ewentualnego odwołania, nie dłużej niż 12 miesięcy od zamknięcia sprawy.</li>
<li>Dzienniki techniczne: do 7 dni.</li>
<li>Dane w pamięci Twojego urządzenia: dopóki ich nie usuniesz (w opcjach aplikacji albo w ustawieniach przeglądarki).</li></ul>
<h3>7. Twoje prawa</h3>
<p>Masz prawo do dostępu do danych (art. 15 RODO), ich sprostowania (art. 16), usunięcia (art. 17), ograniczenia przetwarzania (art. 18), przeniesienia (art. 20),
sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie (art. 21) oraz do cofnięcia zgody w każdej chwili, bez wpływu na wcześniejsze przetwarzanie.
Większość z nich wykonasz sam w ustawieniach konta: edycja profilu, „Pobierz moje dane” (plik JSON), „Usuń konto”. W pozostałych sprawach napisz na ${mail}. Odpowiemy w ciągu miesiąca.
Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).</p>
<h3>8. Czy musisz podać dane</h3>
<p>Podanie adresu e-mail, hasła i nazwy użytkownika jest warunkiem założenia konta. Pozostałe dane są dobrowolne. Bez konta możesz korzystać z kreatora bez podawania żadnych danych.</p>
<h3>9. Profilowanie i kolejność treści</h3>
<p>Nie podejmujemy wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu i nie profilujemy Cię w celach marketingowych.
Kolejność fitów: „Najnowsze” i „Obserwowani” są ułożone od najnowszych, „Popularne” według liczby polubień, a „Polecane” to stały zestaw przykładowych stylizacji.</p>
<h3>10. Dzieci</h3>
<p>Konto może założyć osoba, która ukończyła ${e(C.minAge)} lat. Jeśli wiesz, że konto założyła młodsza osoba, napisz do nas, a usuniemy je.</p>
<h3>11. Bezpieczeństwo</h3>
<p>Połączenia są szyfrowane (HTTPS/TLS), a hasła przechowywane jako skróty. Reguły dostępu w bazie danych sprawiają, że każda osoba może odczytać i zmienić tylko to, do czego ma prawo.</p>
<h3>12. Zmiany</h3>
<p>O istotnych zmianach tej polityki poinformujemy w Serwisie. Aktualna wersja jest zawsze dostępna w menu aplikacji i na stronie legal.html.</p>${ver}`,

cookies:`
<p class="lead">Fitme nie używa ciasteczek reklamowych ani analitycznych i nie śledzi Cię między stronami.
Zapisuje kilka informacji w pamięci przeglądarki (localStorage i sessionStorage). Część z nich jest niezbędna, a preferencje zapisujemy tylko za Twoją zgodą.</p>
<h3>Niezbędne (zawsze włączone)</h3>
<table class="ltab"><tr><th>Klucz</th><th>Po co</th><th>Jak długo</th></tr>
<tr><td>fitme.auth</td><td>sesja logowania, żeby nie trzeba było logować się przy każdym otwarciu</td><td>do wylogowania</td></tr>
<tr><td>fitme.consent</td><td>Twój wybór z tego banera</td><td>12 miesięcy, potem zapytamy ponownie</td></tr>
<tr><td>fitme.welcomed</td><td>informacja, że ekran powitania był już pokazany</td><td>do usunięcia danych przeglądarki</td></tr>
<tr><td>fitme.saved.v1, fitme.likes.v1</td><td>fity zapisane i polubione na tym urządzeniu (funkcja, o którą prosisz, klikając „Zapisz” lub serduszko)</td><td>dopóki ich nie usuniesz</td></tr></table>
<h3>Preferencje (za zgodą)</h3>
<table class="ltab"><tr><th>Klucz</th><th>Po co</th><th>Jak długo</th></tr>
<tr><td>fitme.theme, fitme.backdrop</td><td>motyw jasny lub ciemny, tło sceny</td><td>do wycofania zgody</td></tr>
<tr><td>fitme.quality, fitme.opts</td><td>jakość grafiki i opcje (cienie, światło, jednostki itd.)</td><td>do wycofania zgody</td></tr>
<tr><td>fitme.dept, fitme.history</td><td>ostatnio otwarty dział ubrań, historia oglądania w trybie gościa</td><td>do wycofania zgody</td></tr></table>
<p>Bez zgody preferencje działają do zamknięcia karty lub aplikacji (sessionStorage), a potem wracają do domyślnych.
Po zalogowaniu preferencje możesz też synchronizować z kontem. Wtedy przechowujemy je na serwerze w ramach usługi konta, a nie w pamięci urządzenia.</p>
<h3>Strony i usługi zewnętrzne</h3>
<p>Czcionki, biblioteki i grafika są ładowane z serwera Fitme, a nie z Google Fonts ani innych sieci CDN. Linki do sklepów otwierają się w zwykłej przeglądarce
i od tego momentu obowiązują zasady tych sklepów.</p>
<p>Zgodę zmienisz lub wycofasz w każdej chwili w menu → „Prywatność i cookies”. Podstawa prawna: art. 399 ustawy – Prawo komunikacji elektronicznej i art. 6 ust. 1 lit. a RODO.</p>${ver}`,

community:`
<p class="lead">Fitme jest od ubierania manekinów, inspiracji i życzliwej wymiany pomysłów. Żeby tak zostało:</p>
<ul><li><b>Szanuj innych.</b> Nie nękaj, nie obrażaj, nie groź, nie publikuj mowy nienawiści (m.in. ze względu na pochodzenie, religię, płeć, orientację, niepełnosprawność).</li>
<li><b>Bez treści bezprawnych.</b> Zakazane są m.in. treści naruszające prawo, nawołujące do przemocy, promujące terroryzm oraz wszelkie treści seksualizujące małoletnich.</li>
<li><b>Bez nagości i treści seksualnych</b> w zdjęciach profilowych, nazwach, opisach i komentarzach.</li>
<li><b>Bądź sobą.</b> Nie podszywaj się pod inne osoby, marki ani pod Fitme.</li>
<li><b>Bez spamu.</b> Żadnych masowych komentarzy, linków reklamowych, oszustw ani sztucznego nabijania polubień i obserwujących.</li>
<li><b>Szanuj prawa innych.</b> Nie publikuj cudzych zdjęć, logotypów ani utworów bez zgody. Nie ujawniaj cudzych danych osobowych.</li>
<li><b>Zgłaszaj zamiast eskalować.</b> Jeśli coś narusza te zasady, użyj „Zgłoś” albo zablokuj konto.</li></ul>
<p>Naruszenia mogą skończyć się usunięciem treści, ograniczeniem funkcji albo usunięciem konta (szczegóły w § 7 <a href="#" data-legal="terms">Regulaminu</a>).</p>${ver}`,

contact:`
<p class="lead">Tu znajdziesz dane usługodawcy, sposób zgłaszania nielegalnych lub niezgodnych z zasadami treści i punkty kontaktowe wymagane przez akt o usługach cyfrowych (DSA).</p>
<h3>Usługodawca</h3>
<p>${who}<br>E-mail: ${mail}</p>
<h3>Jak zgłosić treść</h3>
<ol><li>Przy fitach, komentarzach i profilach kliknij „Zgłoś”. Zgłoszenie możesz wysłać także bez konta, podając adres e-mail do odpowiedzi.</li>
<li>Albo napisz na ${mail}: podaj link lub dokładną lokalizację treści, wyjaśnij, dlaczego uważasz ją za bezprawną lub niezgodną z zasadami, podaj swoje imię i nazwisko
oraz e-mail (nie są wymagane przy zgłaszaniu treści przedstawiających seksualne wykorzystywanie dzieci) i oświadcz, że zgłoszenie składasz w dobrej wierze.</li>
<li>Potwierdzimy otrzymanie zgłoszenia, rozpatrzymy je bez zbędnej zwłoki i poinformujemy Cię o decyzji oraz możliwości odwołania.</li></ol>
<p>Jeśli treść stwarza bezpośrednie zagrożenie życia lub bezpieczeństwa, zawiadom też policję (112).</p>
<h3>Punkt kontaktowy (art. 11 i 12 DSA)</h3>
<p>Dla organów państw członkowskich, Komisji Europejskiej, Europejskiej Rady ds. Usług Cyfrowych i dla użytkowników: ${mail}. Komunikujemy się po polsku i po angielsku.</p>
<h3>Reklamacje i sprawy danych osobowych</h3>
<p>Na ten sam adres. Szczegóły: <a href="#" data-legal="terms">Regulamin</a> § 9 i <a href="#" data-legal="privacy">Polityka prywatności</a> pkt 7.</p>${ver}`
  };
  return D[key]||D.terms;
}
