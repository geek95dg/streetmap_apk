# Wdrożenie na nginx — krok po kroku

Jedna aplikacja, dwa moduły na **wspólnej bazie**:

| Adres | Moduł |
|---|---|
| `index.php` | generator kart terenu (druk S-12) |
| `przydzialy.php` | przydziały terenów — zestawienie S-13, raporty, lista NŻ, import, eksport Word/Excel/PDF |

**SQLite działa tak samo jak w generatorze kart** i jest ustawieniem domyślnym.
Oba moduły piszą do tego samego pliku `data/kartoteka.sqlite`: tabele
przydziałów (`assignment`, `nz_address`, `prior_completion`) zakładają się w nim same przy
pierwszym wejściu na `przydzialy.php`, a lista terenów jest wspólna — teren
dodany w module przydziałów od razu widać w generatorze kart i odwrotnie.
Niczego nie trzeba importować ani konfigurować. MySQL/MariaDB jest
opcjonalny (punkt 4b).

Poniżej przykład dla Debiana / Ubuntu z PHP 8.3. Przy innej wersji PHP zamień
`8.3` na swoją wszędzie, także w ścieżce gniazda PHP-FPM.

---

## 1. Pakiety

```bash
sudo apt update
sudo apt install nginx php8.3-fpm \
    php8.3-gd php8.3-curl php8.3-mbstring php8.3-xml php8.3-zip \
    php8.3-sqlite3          # baza SQLite (domyślna)
# sudo apt install php8.3-mysql   # tylko jeśli wybierzesz MySQL/MariaDB
```

| Rozszerzenie | Po co |
|---|---|
| `gd`, `curl` | mapki na kartach (kafle, geokoder) |
| `mbstring` | polskie znaki |
| `xml` | daje `simplexml` (import z Excela) i `dom` (eksport druku S-13 do Worda) |
| `zip` | opcjonalnie — przyspiesza zapis `.xlsx`/`.docx`; bez niego działa własny kod |
| `sqlite3` albo `mysql` | sterownik bazy (`pdo_sqlite` / `pdo_mysql`) |

## 2. Pliki aplikacji

```bash
sudo git clone https://github.com/geek95dg/streetmap.git /var/www/karty
cd /var/www/karty
# Dopóki moduł przydziałów nie jest w gałęzi main (PR #19):
sudo git checkout claude/jolly-dirac-q5lycv

# Katalog data/ (baza SQLite, kafle, mapki) musi być zapisywalny dla PHP-FPM.
sudo chown -R www-data:www-data data
sudo chmod 775 data
```

Bez gita: pobierz ZIP z GitHuba (*Code → Download ZIP*) i rozpakuj do
`/var/www/karty` — dalej tak samo.

## 3. Limity wgrywania w PHP

Import przyjmuje arkusz do 12 MB, a domyślne limity PHP są mniejsze:

```bash
printf 'upload_max_filesize = 16M\npost_max_size = 16M\n' | sudo tee /etc/php/8.3/fpm/conf.d/99-karty.ini
sudo systemctl restart php8.3-fpm
```

## 4. Baza danych

### 4a. SQLite — domyślnie, nic do zrobienia

W `config.php` zostaje `'db_driver' => 'sqlite'`. Plik
`data/kartoteka.sqlite` powstanie sam przy pierwszym wejściu na stronę.
Jedyny warunek: zapisywalny katalog `data/` (punkt 2).

### 4b. MySQL / MariaDB — opcjonalnie

```sql
CREATE DATABASE karty_terenu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'karty'@'localhost' IDENTIFIED BY 'mocne-haslo';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
    ON karty_terenu.* TO 'karty'@'localhost';
FLUSH PRIVILEGES;
```

W `config.php`: `'db_driver' => 'mysql'` i dane logowania w tablicy `'mysql'`.
Tabele powstaną same. Konto bez prawa `CREATE`: zaimportuj
`schema.mysql.sql` (zakłada tylko brakujące tabele) — szczegóły
w `INSTRUKCJA.md`, rozdział 4.

## 5. `config.php` — co ustawić

| Klucz | Co wpisać |
|---|---|
| `user_agent`, `contact_email` | swój adres e-mail — wymagają tego usługi map i geokodera (generator kart) |
| `tile_url` | adres serwera kafli z kluczem, np. Geoapify (generator kart, rozdział 10 instrukcji) |
| `default_city` | swoja miejscowość |
| `strefa_czasowa` | `Europe/Warsaw` (zostaw) |
| `przydzial_*`, `rok_sluzbowy_od`, `nz_odswiez_mies` | progi modułu przydziałów — wartości domyślne są rozsądne (`INSTRUKCJA.md`, 14.8) |

Sam moduł przydziałów nie potrzebuje żadnego klucza ani dostępu do internetu —
działa od razu po punkcie 4.

## 6. nginx

W repozytorium są gotowe konfiguracje:

| Plik | Kiedy |
|---|---|
| `nginx/karty.conf` | aplikacja pod własną domeną (`https://karty.example.org/`) |
| `nginx/karty-podkatalog.conf` | aplikacja w podkatalogu istniejącej strony (`https://example.org/karty/`) |

```bash
sudo cp /var/www/karty/nginx/karty.conf /etc/nginx/sites-available/karty.conf
sudo ln -s /etc/nginx/sites-available/karty.conf /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/karty.conf
```

Popraw w pliku trzy rzeczy:

1. `server_name` — swoja domena (w obu blokach `server`),
2. `root` — `/var/www/karty`,
3. `fastcgi_pass unix:/run/php/php8.3-fpm.sock;` — wersja zgodna z `ls /run/php/`.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Certyfikat (konfiguracja zakłada HTTPS):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d karty.example.org
```

**Nie usuwaj z konfiguracji bloków `return 404`.** Zamykają one przed siecią:
katalog `data/` (baza SQLite — cała kartoteka adresów i nazwiska głosicieli),
pliki dołączane (`config.php` z hasłami, `lib.php`, `przydzialy-lib.php` …),
katalog `szablony/` i ukryte pliki, w tym `.git/` — przy instalacji przez
`git clone` bez tej blokady dałoby się pobrać całą historię repozytorium.
nginx nie czyta `.htaccess`, więc te bloki są jedyną ochroną.

Wariant **podkatalog** wymaga, żeby katalog aplikacji leżał wprost pod rootem
serwera (`/var/www/example.org/karty`) — opis i pułapki w
`nginx/karty-podkatalog.conf` oraz `INSTRUKCJA.md`, rozdział 3.

## 7. Zamknij dostęp hasłem

Aplikacja nie ma własnego logowania, a moduł przydziałów przechowuje
nazwiska — to dane osobowe. Jeżeli serwer jest w internecie:

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-karty slugaterenu
```

W `/etc/nginx/sites-available/karty.conf`, wewnątrz bloku `server` z `listen 443`,
przed pierwszym `location`:

```nginx
auth_basic           "Tereny";
auth_basic_user_file /etc/nginx/.htpasswd-karty;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Sprawdzenie

1. Otwórz `https://karty.example.org/sprawdz.php` — lista „jest / brakuje”.
   Powinno być „jest” m.in. przy: PHP 8.1+, `gd`, `curl`, `mbstring`, sterowniku
   bazy, `simplexml`, `dom`, **tabelach `territory`, `entry`, `geo_cache`,
   `assignment`, `nz_address`, `prior_completion`**, **szablonie druku S-13**, limitach wgrywania
   oraz **„katalog data/ zasłonięty przed siecią” → „HTTP 404 — dobrze”**.

   „Brakuje” przy `contact_email`, `user_agent`, próbnym geokodowaniu
   i pobraniu kafla dotyczy tylko mapek generatora kart — znika po
   uzupełnieniu `config.php` (punkt 5). Modułowi przydziałów nie przeszkadza.

   Jeżeli przy `data/` stoi „serwer nie odpowiedział sam sobie”, serwer nie
   umie połączyć się z własną domeną (DNS, zapora, certyfikat jeszcze nie
   wystawiony) — wtedy rozstrzyga ręczne sprawdzenie z punktu 2.
2. Z innego komputera sprawdź, że chronione adresy zwracają 404:

   ```bash
   for u in data/kartoteka.sqlite config.php przydzialy-lib.php szablony/S-13_P.docx .git/config; do
       printf '%-26s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' "https://karty.example.org/$u"
   done
   ```

   (przy włączonym haśle dodaj `-u slugaterenu:haslo` — inaczej każdy adres da 401).
3. Po udanym sprawdzeniu usuń `sprawdz.php` (`sudo rm /var/www/karty/sprawdz.php`)
   albo zostaw go tylko za hasłem.

## 9. Pierwsze uruchomienie modułu przydziałów

1. `https://karty.example.org/przydzialy.php` → zakładka **Import**.
2. W panelu **3. Historia przydziałów** wgraj swój arkusz S-13 z Excela
   (urzędowy druk albo własne zestawienie; wszystkie zakładki, np. po jednej na
   rok służbowy, wchodzą naraz), zostaw zaznaczone „Dodaj brakujące tereny do
   zestawienia” → **Pokaż podgląd** — sprawdź w tabeli „Tak odczytano tereny”
   głosicieli i daty → **Zapisz**. Arkusz z nazwami terenów przenosi listę
   terenów i całą historię; urzędowy druk nazw nie ma — wtedy najpierw wgraj
   zestawienie terenów w panelu 1.
3. Panel **2. Lista NŻ** — wgraj arkusz `Nr terenu | Ulica | Adres | Data | Notatka`.
4. **Zestawienie** — przydziały i opracowania na co dzień; eksport druku S-13
   przyciskami **Word / Excel / PDF** (pole „Rok służbowy” obok).

Tereny dodane importem są od razu w generatorze kart (`index.php`) — tam
przygotowuje się dla nich mapki i drukuje karty.

## 10. Kopia zapasowa

SQLite — cała kartoteka to jeden plik. Codziennie o 3:15:

```bash
sudo apt install sqlite3
sudo mkdir -p /var/backups/karty
echo '15 3 * * * www-data sqlite3 /var/www/karty/data/kartoteka.sqlite ".backup /var/backups/karty/kartoteka-$(date +\%u).sqlite"' \
    | sudo tee /etc/cron.d/karty-kopia
sudo chown www-data:www-data /var/backups/karty
```

Siedem plików (jeden na dzień tygodnia), nadpisywanych po tygodniu.
`.backup` robi spójną kopię także w trakcie pracy aplikacji — zwykłe `cp`
na działającej bazie potrafi skopiować ją w pół zapisu.

MySQL: `mysqldump -u karty -p karty_terenu | gzip > karty-$(date +%F).sql.gz`.

## 11. Aktualizacja

```bash
cd /var/www/karty
sudo git pull --autostash     # odkłada Twoje zmiany w config.php, pobiera nową wersję i przywraca je
sudo chown -R www-data:www-data data
```

Jeżeli nowa wersja zmieniła te same wiersze `config.php`, które są zmienione u Ciebie,
git napisze *Applying autostash resulted in conflicts* i zostawi w pliku
znaczniki `<<<<<<<`, `=======`, `>>>>>>>`. **Do czasu ich usunięcia strona nie
działa.** Popraw plik (zostaw swoje wartości, usuń znaczniki), potem:

```bash
sudo git reset -q -- config.php    # zdejmuje oznaczenie konfliktu, plik zostaje w poprawionej postaci
sudo git stash drop                # kopia Twoich zmian nie jest już potrzebna
```

Gdy PR #19 zostanie scalony, przejdź raz na gałąź główną — dalej jak wyżej:

```bash
sudo git fetch && sudo git checkout main && sudo git pull --autostash
```

Nowe tabele i kolumny bazy dochodzą same przy pierwszym wejściu na stronę.
Po aktualizacji otwórz `sprawdz.php`: wiersz „komplet ustawień w config.php”
pokaże klucze, których brakuje w Twoim `config.php`, jeśli nowa wersja jakieś dodała.

## 12. Kiedy coś nie działa

| Objaw | Przyczyna i naprawa |
|---|---|
| `nginx -t`: `socket() [::]:80 failed (97: Address family not supported by protocol)` | serwer bez IPv6, a któraś strona ma `listen [::]:…` — zwykle domyślna: `sudo rm /etc/nginx/sites-enabled/default` (w `karty.conf` te wiersze są zakomentowane) |
| **502 Bad Gateway** | zła ścieżka gniazda w `fastcgi_pass` albo PHP-FPM nie działa: `ls /run/php/`, `systemctl status php8.3-fpm` |
| przeglądarka pobiera `.php` zamiast go wykonać | brak bloku `location ~ \.php$` — skopiuj go z `nginx/karty.conf` |
| „Nie mogę utworzyć katalogu …/data” | `data/` niezapisywalny: `sudo chown -R www-data:www-data /var/www/karty/data` |
| **413** przy imporcie | `client_max_body_size 16m;` w nginx i limity z punktu 3 |
| „Nieprawidłowy token formularza” | sesja wygasła — odśwież stronę; jeśli powtarza się zawsze, PHP nie może zapisać sesji (`/var/lib/php/sessions`) |
| „Brak tabeli assignment …” | MySQL bez prawa `CREATE` — zaimportuj `schema.mysql.sql` |
| eksport do Worda: „wymaga rozszerzenia dom” | `sudo apt install php8.3-xml && sudo systemctl restart php8.3-fpm` |
| `sprawdz.php`: data/ „do pobrania!” | brakuje bloku `location ~* ^/data(/|$) { return 404; }` — patrz punkt 6 |

Pełna dokumentacja: `INSTRUKCJA.md` (generator kart: rozdziały 1–13,
przydziały terenów: rozdział 14).
