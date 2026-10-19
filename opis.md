# Karty terenu — opis zadania

Aplikacja PHP/SQLite do generowania kart terenu według druku **S-12-P 6/72**:
z dwóch list tekstowych powstaje arkusz A4 poziomo z czterema kartami,
zadrukowany dwustronnie. Awers ma mapkę z zaznaczonym adresem, rewers —
tabelę adresów z datami.

Środowisko docelowe: LAMP (PHP 8.1+, rozszerzenia `pdo_sqlite`, `gd`, `curl`),
katalog na zwykłym hostingu. Bez composera, bez node'a, bez CDN-ów.

---

## 1. Stan obecny

Gotowe i przetestowane składniowo:

| Plik | Zawartość |
|---|---|
| `config.php` | Wszystkie ustawienia: geokoder, serwer kafli, geometria mapki, User-Agent |
| `lib.php` | Baza SQLite, parsowanie list, geokodery GUGiK/Nominatim, cache kafli, składanie mapki w GD |
| `api.php` | Endpointy POST: `geocode_next`, `map_next`, `set_territory`, `reset_territory` |
| `map.php` | Wydaje gotową mapkę jako JPEG (nie pobiera kafli na żądanie) |
| `index.php` | Ekran roboczy: import list, lista terenów, uruchomienie pętli |
| `app.js` | Pętle krokowe z paskiem postępu, ręczne korekty terenu |
| `print.php` | Widok wydruku — arkusze awers/rewers plus arkusz kontrolny dupleksu |

**Brakuje `styl.css`** — bez niego nic nie wygląda ani nie drukuje się poprawnie.
To zadanie numer jeden.

---

## 2. Geometria (nie zmieniać, wyliczona z oryginalnego PDF-a)

Strona: **297 × 210 mm**, A4 poziomo.
Znaczniki cięcia: X = 2,53 / 148,53 / 294,53 mm, Y = 10,53 / 104,97 / 199,40 mm.
Stąd karta po przycięciu: **146,00 × 94,44 mm**, cztery na arkusz w układzie 2 × 2.

Pozycje gniazd (lewy górny róg karty): `(2.53, 10.53)`, `(148.53, 10.53)`,
`(2.53, 104.97)`, `(148.53, 104.97)`.

Elementy wewnątrz karty, liczone od jej lewego górnego rogu:

| Element | Pozycja | Krój |
|---|---|---|
| „Karta terenu" | góra 6,9 mm, wyśrodkowany | szeryfowy 12 pt bold |
| „Miejscowość:" / „Teren nr:" | góra 15,8 mm, lewa 9,98 mm | szeryfowy 10 pt bold |
| pole mapki | lewa 9,98 · góra 21 · 126 × 50 mm | — |
| tekst „Prosimy przechowywać…" | góra 76 mm | szeryfowy 9 pt bold, interlinia 1,22 |
| „S-12-P 6/72" | góra 85,5 mm, lewa 9,98 mm | szeryfowy 6 pt |

Prawy margines karty: 10,04 mm (szerokość treści 125,98 mm).

---

## 3. Do zrobienia

### 3.1 `styl.css` — priorytet

Jeden plik, dwie części.

**Interfejs** (`index.php`). Klasy używane w kodzie:
`.app`, `header.top`, `.spec`, `.grid` (dwie kolumny, ~430 px + reszta,
łamane poniżej 1080 px), `.panel`, `.panel > h2 .n`, `label`, `.hint`,
`.check`, `.actions`, `button`, `button.ghost`, `button.small`, `a.btn`
(ma wyglądać identycznie jak `button`), `.note.ok`, `.note.err`,
`.progress`, `.bar`, `.bar span`, `.terr`, `.terr-head`, `.nr`, `.name`,
`.badge` z wariantami `.ok/.warn/.err`, `.terr-body` (siatka 320 px + reszta),
`.thumb`, `.tools`, `.entries`.

Paleta narzędziowa, nie marketingowa: chłodne szarości, jeden akcent
(niebieski), czerwień zarezerwowana dla błędów i znacznika na mapie.
Widoczny `:focus-visible`. Respektowanie `prefers-reduced-motion`.

**Wydruk** (`print.php`). Klasy generowane przez PHP:
`.sheet-wrap`, `.sheet`, `.card`, `.tick.v`, `.tick.h`, `.testcard`,
awers: `.c-title`, `.c-field`, `.c-field b`, `.c-field .val`,
`.c-field .val.nr`, `.c-field .gap`, `.c-map`, `.c-map img`, `.c-map .cap`,
`.c-legal`, `.c-code`;
rewers: `.b-head`, `.b-id`, `.b-tables`, `.b-tables table`, `.b-tables th`,
`.b-tables td`, `.b-tables td.d`, `.b-tables col.date` (26 mm),
`.b-tables .empty`, `.b-code`.

Wymagania:
- wszystkie wymiary kart w `mm`, rozmiary pisma w `pt` — żadnych `px`;
- `@page { size: A4 landscape; margin: 0 }`;
- `.sheet-wrap` łamie stronę po sobie (`break-after: page`), ostatni nie;
- na ekranie arkusze skalowane `transform: scale(var(--ps))` na
  `.sheet` przy `.sheet-wrap` o wymiarach przemnożonych przez `--ps`
  (domyślnie 0,38); w druku `--ps` nie działa — `transform: none`;
- `.toolbar` i `.note` znikają w `@media print`;
- `.sheet-wrap::after` pokazuje `data-label` tylko na ekranie;
- `.c-field .val` to kropkowana linijka (`border-bottom: .25mm dotted`),
  `.val.nr` wąska (26 mm), wyśrodkowana, pogrubiona;
- `.c-map` z cienką ramką, obraz `object-fit: cover`;
- `.c-map .cap` — biała półprzezroczysta plakietka w lewym górnym rogu;
- `.tick` — kreski 0,2 × 4 mm, czarne;
- `.testcard` — wielka cyfra (~46 pt) i podpis, wyśrodkowane w karcie.

Kryterium odbioru: `print.php?test=1` wydrukowany na papierze ma dawać
znaczniki cięcia oddalone dokładnie o 146,00 mm w poziomie i 94,44 mm
w pionie (sprawdzić linijką).

### 3.2 `INSTRUKCJA.md`

Instalacja (rozpakować, `chmod` na `data/`, wypełnić `user_agent`
i `contact_email` w `config.php`), wymagania PHP, opis przepływu pracy,
format obu list, sekcja o politykach OSM z linkiem do
<https://operations.osmfoundation.org/policies/nominatim/>
i <https://operations.osmfoundation.org/policies/tiles/>.

### 3.3 `.gitignore`

Wykluczyć `data/` w całości (baza, kafle, mapy). Dodać `data/.gitkeep`.

### 3.4 Instalator / kontrola środowiska

Krótki `sprawdz.php`: obecność `pdo_sqlite`, `gd`, `curl`, prawo zapisu
do `data/`, próbne zapytanie do geokodera i po jeden kafel. Wypisuje
listę „jest / brakuje" i nic więcej.

### 3.5 Ochrona katalogu

`data/.htaccess` powstaje automatycznie, ale to działa tylko na Apache
z `AllowOverride`. Dodać do INSTRUKCJA.md wariant dla nginx i zalecenie
przeniesienia `data/` poza `DocumentRoot` (`config.php` już to umożliwia
— wystarczy zmienić ścieżki).

### 3.6 Rzeczy odłożone, do rozważenia później

- Eksport do PDF po stronie serwera (FPDF/TCPDF) zamiast druku z przeglądarki.
  Dziś działa druk systemowy i daje tekst wektorowy — wystarcza.
- Przesuwanie środka mapki kliknięciem w podgląd (było w wersji jednoplikowej,
  wypadło przy przenoszeniu na serwer).
- Ręczny wybór spośród kilku wyników geokodera; teraz brany jest pierwszy.
- Podłożenie oryginalnego PDF-a jako tła awersu zamiast odtwarzania
  szablonu w CSS.

---

## 4. Baza danych

Tworzy się sama przy pierwszym uruchomieniu (`lib.php`, funkcja `db()`).

- `territory` — `id, nr, address, city, lat, lon, zoom, display, geo_src, pos`,
  unikat na `(address, city)`
- `entry` — `id, territory_id, full_address, unit, entry_date, pos`,
  kaskadowe usuwanie
- `geo_cache` — `query, lat, lon, display, source, created`

Powtórny import zachowuje współrzędne terenów, które już były w bazie.
Tereny usunięte z listy 1 znikają razem z wykazami.

---

## 5. Konwencje kodu

- Każde zapytanie przez PDO z parametrami wiązanymi. Zero sklejania SQL.
- Adresy usług zewnętrznych wyłącznie z `config.php` — żaden parametr
  żądania nie może wpłynąć na to, dokąd serwer wysyła zapytanie.
- Wyjście do HTML przez `h()` (`htmlspecialchars` z `ENT_QUOTES`).
- Operacje zmieniające stan idą POST-em i sprawdzają token CSRF.
- Komentarze po polsku, tłumaczą powód decyzji, nie powtarzają kodu.

## 6. Polityki usług — nie do obejścia

Publiczne kafle `tile.openstreetmap.org` **nie nadają się** do tego
zastosowania: pobieranie kafli z wyprzedzeniem, nie do bieżącego
oglądania, jest zabronione, a przy 300 kartach mówimy o kilku tysiącach
kafli z zoomu 17. Domyślna wartość `tile_url` w `config.php` jest
wyłącznie do testu na kilku adresach. Produkcyjnie: własny serwer kafli
albo dostawca z kluczem.

Geokodowanie: domyślnie GUGiK (dane PRG, cała Polska, bez klucza).
Nominatim tylko jako rezerwa, z wypełnionym `contact_email`, sekwencyjnie,
z cache'em — tak jak wymaga tego jego polityka użycia.

## 7. Testy przed wdrożeniem

1. Import 2 terenów i 4 adresów — sprawdzić przypisanie i sortowanie lokali.
2. Adres z ukośnikiem w nazwie (np. `Jana Pawła II 5/7`) — nie może
   rozjechać dopasowania listy 2.
3. Wiersz listy 2 bez pasującego terenu — musi trafić do „nieprzypisanych".
4. Geokodowanie z wyłączoną siecią — komunikat, nie biała strona.
5. Arkusz kontrolny dupleksu dla wszystkich czterech wartości `flip`.
6. Teren bez lokalizacji — karta ma się wydrukować z pustym polem mapki,
   a nie wywalić układu.
7. Wykaz z 30 pozycjami — sprawdzić podział na dwie kolumny i zmniejszenie
   pisma.
