# Karty terenu — generator kart według druku S-12-P 6/72

Aplikacja PHP do wydruku kart terenu: z dwóch list tekstowych powstaje
arkusz A4 poziomo z czterema kartami 146 × 94,44 mm, zadrukowany
dwustronnie. Awers ma mapkę z **zaznaczonym obszarem adresu**, rewers —
tabelę adresów z datami.

Bez composera, bez node'a, bez CDN-ów. Wgrywa się przez FTP na zwykły
hosting i działa.

> **Instalacja na własnym serwerze z nginx-em — krok po kroku:**
> [WDROZENIE.md](WDROZENIE.md). Obejmuje oba moduły (generator kart
> i przydziały terenów), SQLite albo MySQL, hasło, kopię zapasową
> i aktualizację.

---

## Spis treści

1. [Wymagania](#1-wymagania)
2. [Instalacja na LAMP (Apache)](#2-instalacja-na-lamp-apache)
2b. [Wersja na Windows, bez serwera](#2b-wersja-na-windows-bez-serwera)
3. [Instalacja na nginx](#3-instalacja-na-nginx)
4. [Baza danych na MySQL / MariaDB](#4-baza-danych-na-mysql--mariadb)
5. [Konfiguracja](#5-konfiguracja)
6. [Przepływ pracy](#6-przepływ-pracy)
7. [Format obu list](#7-format-obu-list)
7b. [Eksport i import przez Excela](#7b-eksport-i-import-przez-excela)
8. [Zaznaczanie obszaru i edytor mapek](#8-zaznaczanie-obszaru-i-edytor-mapek)
8b. [Kolor tylko wokół adresu](#8b-kolor-tylko-wokół-adresu)
9. [Wydruk](#9-wydruk)
10. [Skąd brać kafle i polityki usług](#10-skąd-brać-kafle-i-polityki-usług)
11. [Bezpieczeństwo](#11-bezpieczeństwo)
12. [Kiedy coś nie działa](#12-kiedy-coś-nie-działa)
13. [Pliki](#13-pliki)
14. [Przydziały terenów — zestawienie S-13](#14-przydziały-terenów--zestawienie-s-13)

---

## 1. Wymagania

| Składnik | Wersja | Po co |
|---|---|---|
| PHP | 8.1 lub nowszy | `match`, `str_starts_with`, typy w sygnaturach |
| `gd` | — | składanie mapki z kafli i rysowanie zaznaczenia |
| `curl` | — | geokoder, kafle, Overpass |
| `mbstring` | — | polskie znaki w adresach |
| `json` | — | kształty zaznaczeń, odpowiedzi usług |
| `pdo_sqlite` **albo** `pdo_mysql` | — | baza (do wyboru, patrz punkt 4) |

Serwer WWW: Apache albo nginx z PHP-FPM. Wyjście na świat po HTTPS
(geokoder i serwer kafli). Miejsce na dysku: kafle zajmują ok. 15–25 kB
na sztukę, jedna karta to kilkanaście kafli.

Środowisko sprawdza za Ciebie **`sprawdz.php`** — wypisuje listę
„jest / brakuje” i nic poza tym.

---

**Rozszerzenia PHP.** Poza standardowymi (`gd`, `curl`, `mbstring`,
`pdo_sqlite` lub `pdo_mysql`) import z `.xlsx` wymaga **`simplexml`** — na
Debianie i Ubuntu daje je pakiet `phpX.Y-xml`, z numerem tej wersji, na
której chodzi **PHP-FPM**, a nie tej z wiersza poleceń. Przy dwóch
zainstalowanych wersjach łatwo doinstalować pakiet nie do tej, której używa
serwer; `sprawdz.php` otwarty w przeglądarce pokazuje w wierszu „PHP 8.1 lub
nowszy” wersję, która obsłużyła żądanie, a przy braku `simplexml` podaje
nazwę pakietu już z właściwym numerem. Na Windowsie `simplexml` jest
wkompilowany na stałe i nie trzeba niczego doinstalowywać — patrz rozdział 2b.

Rozszerzenie `zip` jest opcjonalne: bez niego eksport nadal działa, bo
archiwum składa własny kod. Uwaga: wersja PHP dla wiersza poleceń miewa inny
zestaw rozszerzeń niż ta dla PHP-FPM, więc sprawdzaj przez `sprawdz.php`
w przeglądarce, a nie przez `php -m` w konsoli.

**Limity wgrywania w `php.ini`.** Importer przyjmuje arkusz do 12 MB, a domyślne
ustawienia PHP to `upload_max_filesize = 2M` i `post_max_size = 8M` — mniej,
niż potrzeba. Przy przekroczeniu `post_max_size` PHP wyrzuca całe ciało żądania
po cichu: `$_POST` i `$_FILES` są puste, więc bez rozpoznania tego przypadku
objawem byłby komunikat o nieprawidłowym tokenie formularza. Aplikacja to
rozpoznaje i mówi wprost, co ustawić, ale najprościej zrobić to od razu:

```ini
; /etc/php/8.3/fpm/conf.d/99-karty.ini
upload_max_filesize = 16M
post_max_size = 16M
```

potem `systemctl reload php8.3-fpm`. `sprawdz.php` pokazuje oba limity obok
dopuszczalnego rozmiaru pliku.

## 2. Instalacja na LAMP (Apache)

```bash
# 1. Wgraj pliki (FTP, scp, git — wszystko jedno) do katalogu serwera
cd /var/www
unzip karty-terenu.zip -d karty
cd karty

# 2. Katalog na bazę, kafle i mapki musi być zapisywalny dla PHP
mkdir -p data
chown -R www-data:www-data data      # użytkownik Apache/PHP-FPM
chmod 775 data

# 3. Uzupełnij config.php — patrz punkt 5
nano config.php

# 4. Otwórz w przeglądarce i przeczytaj listę „jest / brakuje”
#    http://twoj-serwer/karty/sprawdz.php
```

Na hostingu współdzielonym kroki 1–3 wykonuje się przez panel: rozpakuj
archiwum w katalogu domeny, nadaj katalogowi `data/` prawa **755** (albo
**775**, jeśli PHP działa jako inny użytkownik niż właściciel plików)
i edytuj `config.php` wbudowanym edytorem.

Aplikacja zakłada bazę i wszystkie tabele sama przy pierwszym wejściu na
`index.php`. Nic nie trzeba importować, dopóki zostajesz przy SQLite.

### Osobny host w Apache (opcjonalnie)

```apache
<VirtualHost *:443>
    ServerName karty.example.org
    DocumentRoot /var/www/karty

    <Directory /var/www/karty>
        AllowOverride All            # bez tego data/.htaccess nic nie blokuje
        Require all granted
    </Directory>

    # Dane nigdy nie powinny wyjść przez WWW.
    <Directory /var/www/karty/data>
        Require all denied
    </Directory>

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/karty.example.org/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/karty.example.org/privkey.pem

    ErrorLog  ${APACHE_LOG_DIR}/karty-error.log
    CustomLog ${APACHE_LOG_DIR}/karty-access.log combined
</VirtualHost>
```

Aplikacja sama zakłada `data/.htaccess` z regułą `Require all denied`,
ale działa to **tylko** przy `AllowOverride All` (albo `AllowOverride
Limit`). Jeśli nie masz wpływu na konfigurację Apache, przenieś katalog
`data/` poza `DocumentRoot` — patrz punkt 11.

Warto jeszcze włączyć moduły i podnieść limit czasu, jeśli geokodujesz
setki adresów:

```bash
a2enmod rewrite headers ssl
systemctl reload apache2
```

---

## 2b. Wersja na Windows, bez serwera

Dla kogoś, kto ma wydrukować karty na własnym komputerze i nie chce
stawiać serwera, jest gotowa paczka — **jeden plik, w którym jest wszystko**:

> **[`windows/karty-terenu-windows.zip`](windows/karty-terenu-windows.zip)**

To ten plik wysyła się osobie, która ma drukować karty. Rozpakowuje się go
w dowolnym miejscu i klika `Start.bat`; nic więcej nie trzeba instalować.

Obok, w `windows/zrodla/`, leżą pliki, z których paczka jest składana — i to
jest jedyna rzecz w tym katalogu, której **nie da się uruchomić samodzielnie**
(aplikacja siedzi w katalogu głównym repozytorium, a `Start.bat` szuka jej
obok siebie, w `app\`). Stąd `windows/zrodla/UWAGA.txt`, żeby nikt nie
próbował wypakować samych `zrodla` i się nie zdziwił.

| Plik w `windows/zrodla/` | Do czego |
|---|---|
| `Start.bat` | uruchomienie programu — to jedyne, co klika użytkownik |
| `karty.ps1` | cała logika: pobranie PHP i listy certyfikatów, wybór wolnego portu, start, otwarcie przeglądarki |
| `router.php` | blokada `data/` dla wbudowanego serwera — patrz niżej |
| `Uruchom bez okna.vbs` | to samo, ale bez okna konsoli |
| `Zatrzymaj.bat` | awaryjne zatrzymanie, gdyby PHP został w pamięci |
| `CZYTAJ-TO.txt` | instrukcja dla osoby nietechnicznej, prostym językiem |

Po zmianach w aplikacji paczkę składa się na nowo jednym poleceniem:

```bash
./narzedzia/zbuduj-paczke.sh            # windows/karty-terenu-windows.zip
./narzedzia/zbuduj-paczke.sh serwer     # paczki/karty-terenu.zip, układ pod LAMP
```

Że paczka w repozytorium odpowiada kodowi, pilnuje osobny skrypt — składa
wzorzec z bieżącego drzewa i porównuje zawartość plik po pliku (bajtów
samego archiwum nie da się porównywać, bo czasy modyfikacji zmieniają się
przy każdym złożeniu):

```bash
./narzedzia/sprawdz-paczke.sh           # 0 = aktualna, 1 = trzeba złożyć od nowa
```

Wersji serwerowej nie trzymamy w repozytorium (`paczki/` jest w `.gitignore`)
— tam wystarczy „Download ZIP” z GitHuba albo `git clone`.

Rozpakowana paczka windowsowa ma układ:

```
Karty terenu\
  Start.bat, karty.ps1, router.php, Zatrzymaj.bat, CZYTAJ-TO.txt
  app\          ← pliki aplikacji razem z data\
  php\          ← powstaje sam przy pierwszym uruchomieniu
                  (razem z php-karty.ini i cacert.pem)
```

Przy pierwszym starcie skrypt pobiera z windows.php.net budowę **NTS x64**
(zwykły ZIP, nic się nie instaluje), zapisuje obok `php-karty.ini`
z rozszerzeniami `gd`, `curl`, `mbstring`, `openssl`, `pdo_sqlite`,
`sqlite3`, `fileinfo` i `zip`, po czym uruchamia `php -S 127.0.0.1:8080`.
Zajęty port jest wykrywany i podmieniany na kolejny wolny.

`simplexml` — potrzebny do wczytywania `.xlsx` — na Windowsie jest
wkompilowany w `php.exe` na stałe, więc wpisu w `php-karty.ini` nie wymaga
(kanoniczny `php.ini-production` wymienia wśród ładowanych rozszerzeń `zip`
i `xsl`, ale nie `simplexml`, `dom` ani `xml`). Wpisanie go dałoby przy
starcie błąd o braku `php_simplexml.dll`.

Ten sam plik ustawia `upload_max_filesize` i `post_max_size` na 16M —
domyślne 2M i 8M są mniejsze niż arkusz, który przyjmuje importer.

### Lista zaufanych urzędów certyfikacji — bez niej nic się nie pobierze

Budowa PHP z windows.php.net to zwykły ZIP i **nie ma w nim listy zaufanych
urzędów certyfikacji**, a OpenSSL szuka jej w ścieżkach uniksowych, których
na Windowsie nie ma. Skutek jest mylący: aplikacja wstaje, strona się
otwiera, import list działa, baza się zakłada — ale **każde** żądanie HTTPS
kończy się błędem 60 „unable to get local issuer certificate”. Na ekranie
widać wtedy „nie znaleziono” przy każdym terenie i brak mapek, czyli objaw
wskazujący na zupełnie inną przyczynę.

Zabezpieczenie jest dwustronne:

* `karty.ps1` przy pierwszym uruchomieniu pobiera `cacert.pem` (tę samą
  listę, której używa `curl`) obok `php.exe` i wskazuje ją w `php-karty.ini`
  wpisami `curl.cainfo` i `openssl.cafile`. Po pół roku pobiera ją na nowo,
  bo urzędy się zmieniają;
* aplikacja niezależnie od tego ustawia `CURLSSLOPT_NATIVE_CA`, czyli każe
  bibliotece `curl` sięgnąć do magazynu certyfikatów Windows — do tej samej
  listy, z której korzysta przeglądarka. Działa od PHP 8.2 i nie wymaga
  żadnego pliku.

Gdy mimo to coś nie działa, **`sprawdz.php` powie dokładnie co**: pokazuje
wersję `curl`, używaną bibliotekę TLS, skąd bierze się lista certyfikatów,
a przy nieudanym geokodowaniu i pobraniu kafla — dosłowną treść błędu wraz
z jego numerem, zamiast ogólnikowego „brak odpowiedzi”.

### Podmiana paczki na nowszą

Rozpakuj nową paczkę **do nowego katalogu**, a ze starej przenieś do niej
tylko `app\data\` — tam siedzi baza, kafle i gotowe mapki.

Ustawień **nie przenoś przez skopiowanie starego `config.php`**: kolejne
wersje dokładają w nim klucze, a `cfg()` oddaje dla brakującego klucza po
prostu `null`, więc część rzeczy działałaby jak wyzerowana, bez żadnego
komunikatu. Odwrotnie: weź `config.php` z nowej paczki i wpisz w nim swoje
cztery ustawienia (`user_agent`, `contact_email`, `tile_url` z kluczem,
`default_city`). Gdyby jednak stary plik gdzieś się prześlizgnął,
`sprawdz.php` ma na to wiersz „komplet ustawień w config.php” i wypisuje,
których kluczy brakuje.

### Dlaczego w paczce jest `router.php`

Wbudowany serwer PHP nie czyta `.htaccess` i nie zna reguł nginx-a: wydaje
przeglądarce **każdy** plik z katalogu podanego w `-t`. Bez routera spod
adresu `/data/kartoteka.sqlite` dawało się pobrać całą bazę adresów
(sprawdzone: 200 i 28 kB pliku SQLite), a spod `/data/php-errors.log` — log
błędów. `karty.ps1` podaje więc serwerowi `router.php`, który odrzuca
`data/` i pliki dołączane, a resztę oddaje serwerowi bez zmian. W układzie
paczki router leży **obok** `app\`, czyli poza katalogiem wydawanym na
zewnątrz.

Czego wymaga taka wersja:

* **Visual C++ Redistributable 2015–2022 x64** — tego wymagają binaria PHP
  dla Windowsa. Zwykle jest już w systemie; gdy go brakuje, skrypt wypisuje
  komunikat z adresem do pobrania zamiast milczeć,
* internetu przy geokodowaniu i pierwszym pobraniu mapek (potem karty
  drukują się offline),
* klucza Geoapify wklejonego w `app\config.php` — instrukcja krok po kroku
  jest w `CZYTAJ-TO.txt`.

Baza to SQLite w `app\data`, więc kopia zapasowa to skopiowanie folderu.
Wbudowany serwer PHP obsługuje jedno żądanie naraz — przy podglądzie
wydruku setek kart mapki doczytują się po kolei, co bywa odczuwalne, ale
niczego nie psuje.

## 3. Instalacja na nginx

Pełna procedura od pustego serwera (pakiety, uprawnienia, certyfikat,
hasło, kontrola po wdrożeniu, kopia, aktualizacja) jest w
[WDROZENIE.md](WDROZENIE.md). Tu — skrót i uzasadnienie konfiguracji.

Gotowe pliki leżą w katalogu `nginx/`:

| Plik | Kiedy |
|---|---|
| `nginx/karty.conf` | aplikacja pod własną domeną (`https://karty.example.org/`) |
| `nginx/karty-podkatalog.conf` | aplikacja w podkatalogu istniejącej strony (`https://example.org/karty/`) |

```bash
# 1. Pliki aplikacji
mkdir -p /var/www/karty && unzip karty-terenu.zip -d /var/www/karty
chown -R www-data:www-data /var/www/karty/data
chmod 775 /var/www/karty/data

# 2. Konfiguracja serwera
cp nginx/karty.conf /etc/nginx/sites-available/karty.conf
ln -s /etc/nginx/sites-available/karty.conf /etc/nginx/sites-enabled/

# 3. Trzy rzeczy do poprawienia w pliku: server_name, root
#    i wersja gniazda PHP-FPM — sprawdź, którą masz:
ls /run/php/            # np. php8.3-fpm.sock

# 4. Test składni i przeładowanie
nginx -t && systemctl reload nginx
```

### Blokada katalogu `data/` — to nie jest opcja

nginx **nie czyta plików `.htaccess`**. Aplikacja zakłada `data/.htaccess`
przy pierwszym uruchomieniu, ale dla nginx-a to martwy plik. Bez wpisu
w konfiguracji serwera baza SQLite, kafle i gotowe mapki są do pobrania
z internetu:

```nginx
location ~* ^/data(/|$) {
    return 404;
}
```

Wyrażenie, a nie prefiks `^~ /data/`: prefiks nie obejmuje ani zapisu bez
końcowego ukośnika, ani innej wielkości liter. Blok musi stać w pliku
**przed** `location ~ \.php$` i `~* \.(css|js)$`, bo wśród wyrażeń
regularnych wygrywa pierwsze pasujące.

Pozostałe blokady w `nginx/karty.conf` — też ich nie usuwaj:

| Blok | Co zamyka |
|---|---|
| `^/(config\|lib\|xlsx\|karta-terenu\|przydzialy-lib\|przydzialy-widok)\.php$` | pliki dołączane; w `config.php` są dane dostępu do bazy |
| `\.(sql\|sqlite\|md\|log\|bak)$` | schemat, kopie bazy, dokumentacja, logi |
| `^/szablony(/\|$)` | szablon druku S-13 — czyta go tylko eksport po stronie serwera |
| `/\.` | pliki ukryte, w tym `.git/` — przy instalacji przez `git clone` bez tej blokady da się pobrać całe repozytorium razem z historią |

Sprawdzenie po wdrożeniu — otwórz `sprawdz.php`. Wiersz **„katalog data/
zasłonięty przed siecią”** wykłada to wprost: skrypt zapisuje w `data/`
plik z losowym znacznikiem, próbuje pobrać go po HTTP tak jak zrobiłby to
obcy, i kasuje. „HTTP 404 — dobrze” znaczy, że blokada działa.

### Na co uważać

* **HTTP/2 zapisuje się różnie w różnych wersjach.** nginx 1.25 i nowszy:
  osobny wiersz `http2 on;`. Starsze (m.in. Ubuntu 24.04 z nginx 1.24):
  `listen 443 ssl http2;`. Wpisanie `http2 on;` na 1.24 wywala serwer
  komunikatem `unknown directive "http2"`. W dostarczonym pliku HTTP/2
  jest wyłączone — włącz je zapisem właściwym dla swojej wersji
  (`nginx -v`).
* **IPv6.** Wiersze `listen [::]:…` są zakomentowane, bo na maszynie bez
  IPv6 nginx odmawia startu (`Address family not supported by protocol`).
  Odkomentuj, jeśli serwer ma IPv6.
* **Wersja gniazda PHP-FPM.** `fastcgi_pass unix:/run/php/php8.3-fpm.sock;`
  trzeba dopasować do zainstalowanej wersji PHP, inaczej dostaniesz 502.
* **`try_files $uri =404;` w bloku PHP.** Bez tego adres w rodzaju
  `/brak.php/x.jpg` potrafi podstawić FPM-owi do wykonania inny plik.
* **Podkatalog: bez `alias`.** Wariant z `alias` ma znane pułapki przy
  `try_files` i `SCRIPT_FILENAME`. Dlatego `karty-podkatalog.conf` zakłada,
  że katalog aplikacji leży wprost pod rootem serwera:

  ```
  /var/www/example.org/          ← root
  /var/www/example.org/karty/    ← aplikacja
  ```

### Certyfikat

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d karty.example.org
```

Blok na porcie 80 w `karty.conf` zostawia otwartą ścieżkę
`/.well-known/acme-challenge/`, więc odnowienia przechodzą bez zatrzymywania
serwera.

### Ograniczenie dostępu

Aplikacja nie ma logowania. Jeśli stoi w otwartym internecie:

```bash
apt install apache2-utils
htpasswd -c /etc/nginx/.htpasswd brygadzista
```

```nginx
# wewnątrz bloku server, przed pozostałymi location
auth_basic           "Karty terenu";
auth_basic_user_file /etc/nginx/.htpasswd;
```

#### Własna kontrola dostępu przez `auth_request` — czytaj, zanim wdrożysz

Jeśli zamiast `auth_basic` używasz `auth_request` ze swoim skryptem PHP,
**musisz** wyłączyć przekazywanie ciała żądania do podzapytania:

```nginx
location = /auth/check.php {
    internal;
    include /etc/nginx/fastcgi_params;
    fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root/auth/check.php;

    # BEZ TYCH DWÓCH LINII każdy POST z plikiem wisi do fastcgi_read_timeout:
    # nginx nie wysyła ciała do podzapytania, ale PHP-FPM widzi CONTENT_LENGTH
    # i czeka na nie w nieskończoność.
    fastcgi_pass_request_body off;
    fastcgi_param CONTENT_LENGTH "";
}
```

Bez tego objaw wygląda tak — i myli, bo wskazuje na aplikację, która
nawet się nie uruchomiła:

```
upstream timed out (110: Connection timed out) while reading response header
  from upstream, request: "POST /karty/dane.php", subrequest: "/auth/check.php"
auth request unexpected status: 504 while sending to client
```

Odtworzone i zmierzone: POST z plikiem przez `auth_request` bez tych linii —
**60 s i 504**; z nimi — **1,6 ms i 200**. Restart nginxa nic nie daje, bo
blokuje się proces PHP-FPM, nie nginx. Dotyczy każdego POST-a z ciałem:
importu z arkusza i wczytywania list na ekranie roboczym.

Druga pułapka w tym samym miejscu: **limit rozmiaru ciała nginx sprawdza
osobno dla podzapytania**, według bloku `location = /auth/check.php`, a nie
tego, w którym stoi właściwy adres. `client_max_body_size 16m` postawione
przy aplikacji nie ma tu nic do rzeczy — podzapytanie zostaje przy domyślnym
1 MB i przy większym pliku kończy się kodem 413. `auth_request` nie wie, co
z takim kodem zrobić, więc przeglądarka dostaje **500**:

```
client intended to send too large body: 1049025 bytes,
  request: "POST /karty/dane.php", subrequest: "/auth/check.php"
auth request unexpected status: 413
```

Ciała i tak do podzapytania nie przekazujemy (patrz wyżej), więc sprawdzanie
jego rozmiaru można tam po prostu wyłączyć — prawdziwego limitu pilnuje blok
docelowy:

```nginx
location = /auth/check.php {
    # …
    client_max_body_size 0;
}
```

Zmierzone na tej samej konfiguracji: plik 1 MB bez tej linii — **500**;
z nią — **200**. Plik 20 MB nadal dostaje 413, ale z bloku aplikacji, czyli
tam, gdzie limit faktycznie ustawiono.

Trzecia rzecz przy `auth_request`: skrypt kontroli dostępu, który woła
`session_start()`, staje w kolejce po blokadę pliku sesji za każdym długim
żądaniem tego samego użytkownika. Aplikacja oddaje tę blokadę od razu po
sprawdzeniu tokenu, więc ze swojej strony nie blokuje niczego — ale jeśli
dopisujesz własne długo działające skrypty, rób w nich to samo
(`session_write_close()` zaraz po odczytaniu z sesji tego, co potrzebne).

Utwardzenie samego katalogu z danymi. Prefiks `^~ /karty/data/` nie obejmuje
zapisu bez końcowego ukośnika ani innej wielkości liter — sprawdzone: `/karty/data`,
`/Karty/data/…` i `/karty/DATA/…` przechodzą przez ten blok bokiem. Wyrażenie
łapie wszystkie warianty:

```nginx
location ~* ^/karty/data(/|$) { return 404; }
```

Druga warstwa dotyczy plików, które aplikacja tylko dołącza i których nigdy nie
wywołuje się wprost — `config.php` (z danymi dostępu do bazy), `lib.php`,
`xlsx.php`, `karta-terenu.php`, `przydzialy-lib.php` i `przydzialy-widok.php`. Same odmawiają uruchomienia jako strona, ale
warto zamknąć je również na serwerze, na wypadek gdyby obsługa PHP przestała
działać i poszły do przeglądarki jako zwykły tekst:

```nginx
location ~* ^/karty/(config|lib|xlsx|karta-terenu|przydzialy-lib|przydzialy-widok)\.php$ { return 404; }
```

**Gdzie te blokady postawić — to nie jest obojętne.** Jeżeli aplikacja siedzi
w bloku prefiksowym `location /karty/ { … }`, który ma w środku własne
`location ~ \.php$`, to nginx po dopasowaniu prefiksu przeszukuje **wyłącznie
bloki zagnieżdżone** i wyrażeń z poziomu serwera w ogóle nie sprawdza.
Powyższe dwie reguły są wtedy martwe: `/karty/config.php` trafia prosto do
PHP-FPM. Sprawdzone dziennikiem debugowania nginxa — po dopasowaniu prefiksu
`/karty/` testowany jest już tylko wewnętrzny wzorzec `\.php$`. Mylące jest
to, że `/karty/CONFIG.PHP` blokadę dostaje: wewnętrzne `~ \.php$` rozróżnia
wielkość liter, więc nie pasuje i wyszukiwanie wraca na poziom serwera.

W takim układzie te same dwie reguły trzeba **powtórzyć wewnątrz** bloku
`location /karty/`, przed `location ~ \.php$` (wśród wyrażeń wygrywa pierwsze
pasujące) — kopia wewnętrzna łapie zwykłe adresy, zewnętrzna warianty spoza
prefiksu w rodzaju `/Karty/data/baza.sqlite`.

Warto też wypuścić spod `auth_request` pliki statyczne i `map.php`:
przy 300 kartach strona pobiera 300 miniatur, a każda z nich uruchamiałaby
osobne podzapytanie PHP. **Uwaga:** `map.php` wydaje mapki z lokalizacjami,
więc jego spod ochrony wypuszczać nie wolno — tylko `styl.css` i `app.js`.

## 4. Baza danych na MySQL / MariaDB

SQLite wystarcza w zupełności (jeden operator, kilkaset kart, zero
administracji). MySQL ma sens wtedy, gdy hosting nie daje zapisu do
katalogu albo dane mają iść na wspólny serwer bazodanowy.

### 4.1. Założenie bazy i użytkownika

Z konsoli, na koncie z prawem `GRANT`:

```sql
-- Kodowanie utf8mb4: polskie znaki i wszystko, co wpiszesz w adres.
CREATE DATABASE karty_terenu
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Osobne konto tylko do tej bazy. Hasło zmień na własne.
CREATE USER 'karty'@'localhost' IDENTIFIED BY 'tu-wpisz-mocne-haslo';

-- Wariant A: konto zakłada tabele samo przy pierwszym wejściu.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
    ON karty_terenu.* TO 'karty'@'localhost';

FLUSH PRIVILEGES;
```

```bash
mysql -u root -p < /dev/stdin   # albo wklej powyższe do phpMyAdmin → SQL
```

**Wariant B — konto bez prawa `CREATE`** (typowe na hostingach
współdzielonych): zaimportuj schemat ręcznie i nadaj tylko prawa do
danych.

```bash
mysql -u karty -p karty_terenu < schema.mysql.sql
```

W phpMyAdmin: wybierz bazę → zakładka **Import** → plik
`schema.mysql.sql` → **Wykonaj**. Nadaj wtedy uprawnienia:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON karty_terenu.* TO 'karty'@'localhost';
```

### 4.2. Przełączenie aplikacji na MySQL

W `config.php`:

```php
'db_driver' => 'mysql',

'mysql' => [
    'host'    => 'localhost',
    'port'    => 3306,
    'name'    => 'karty_terenu',
    'user'    => 'karty',
    'pass'    => 'tu-wpisz-mocne-haslo',
    'charset' => 'utf8mb4',
    // Część hostingów wymaga gniazda zamiast TCP:
    // 'socket' => '/var/run/mysqld/mysqld.sock',
],
```

Potem otwórz `sprawdz.php` — powinno pokazać „jest” przy `pdo_mysql`,
połączeniu z bazą i przy każdej z pięciu tabel (trzy generatora kart i dwie
modułu przydziałów, rozdział 14).

Przy aktualizacji ze starszej wersji na koncie bez prawa `CREATE` zaimportuj
`schema.mysql.sql` jeszcze raz: wszystkie polecenia mają `IF NOT EXISTS`,
więc powstaną tylko brakujące tabele, a dane zostaną nietknięte.

### 4.3. Co trafia do bazy, a co na dysk

Do bazy idą wyłącznie dane tekstowe: tereny, wykazy adresów, cache
geokodera, kształty zaznaczeń (JSON) oraz historia przydziałów i lista NŻ. **Kafle i gotowe mapki zostają
w `data/` na dysku** także przy MySQL-u — katalog musi być zapisywalny
przy obu sterownikach.

### 4.4. Kopia zapasowa

```bash
# MySQL
mysqldump -u karty -p karty_terenu | gzip > karty-$(date +%F).sql.gz

# SQLite — wystarczy skopiować plik (najlepiej przy nieużywanej aplikacji)
sqlite3 data/kartoteka.sqlite ".backup 'karty-$(date +%F).sqlite'"
```

---

## 5. Konfiguracja

Cała konfiguracja mieści się w `config.php`. Przed pierwszym
uruchomieniem uzupełnij co najmniej:

| Ustawienie | Co wpisać |
|---|---|
| `user_agent` | nazwa aplikacji i Twój adres e-mail — po nim usługi rozpoznają, kto pyta |
| `contact_email` | Twój adres e-mail; wymaga go polityka Nominatima |
| `map_source` | `xyz` (domyślnie, kafle `{z}/{x}/{y}`) albo `wms` dla usług typu Geoportal |
| `tile_url` | adres serwera kafli — domyślnie Geoapify `osm-carto`, **wpisz swój klucz** |
| `tile_size` | 256 albo 512 (kafle `@2x` — dwa razy większe podpisy) |
| `default_zoom` | zoom nowych terenów; 17 przy kaflach 512, 18 przy 256 |
| `flip`, `back_rotate180` | układ rewersu przy druku dwustronnym (rozdz. 9) |
| `wms.url`, `wms.layers` | przy `map_source = 'wms'`: usługa i warstwa — sprawdzisz je w `wms.php` |
| `wms_overlays` | warstwy dorysowywane na podkładzie, np. adresy na ortofotomapie |
| `default_city` | miejscowość podstawiana, gdy w liście 1 nie ma trzeciego pola |
| `db_driver` | `sqlite` albo `mysql` |

Reszta ma sensowne wartości domyślne:

* `geocoder` / `geocoder_fallback` — `gugik` (dane PRG, cała Polska,
  bez klucza) z Nominatimem jako rezerwą,
* `map_box`, `px_per_mm` — geometria mapki na karcie; **nie zmieniaj**,
  bo wyliczono ją z oryginalnego druku,
* `shape_*` — kolor, grubość kreski i domyślny kształt zaznaczenia
  (punkt 8),
* `map_color*` — kolor tylko wokół adresu, reszta mapki w szarości
  (punkt 8b),
* `flip` — układ rewersu zależny od tego, jak drukarka odwraca kartkę
  (punkt 9).

---

## 6. Przepływ pracy

Ekran roboczy jest dwuczęściowy: **lewa kolumna to rail** — przykleja się
pod nagłówkiem i przewija własną zawartość, więc przyciski i pasek postępu
zostają na oczach niezależnie od tego, jak daleko zjechała lista terenów
po prawej. Na wąskim ekranie, w niskim oknie i przy druku wraca do zwykłego
układu jedna kolumna pod drugą.

**Nic nie wymaga odświeżania strony.** Po każdym kroku serwer odsyła gotowy
kafelek terenu, a przeglądarka podmienia tylko ten jeden węzeł — miniatura,
plakietki i liczniki aktualizują się same. Kafelek składa PHP (`karta-terenu.php`),
ten sam, którym budowana jest lista przy wejściu, więc ucieczka znaków
istnieje w jednym egzemplarzu i nie da się jej zapomnieć po stronie
JavaScriptu.

1. **Wczytaj listy** — dwa pola tekstowe na `index.php`, format w punkcie 7.
   Masowo wygodniej arkuszem — punkt 7b.
   Powtórny import zachowuje współrzędne terenów, które już były w bazie;
   tereny usunięte z listy 1 znikają razem z wykazami.
2. **Przygotuj tereny** — jeden przycisk robi po kolei geokodowanie
   i składanie mapek; pasek postępu ma dwa segmenty, po jednym na etap,
   i przycisk „Przerwij”. Osobne „Tylko geokoduj” i „Tylko mapki” zostają
   na wypadek, gdy trzeba powtórzyć jeden etap (np. po zmianie podkładu
   w `config.php`) bez ruszania drugiego.

   Adres, którego geokoder nie znalazł, **nie wraca sam do kolejki** —
   inaczej pętla brałaby wciąż ten sam i nie miała jak się skończyć.
   Wraca przez „Szukaj ponownie” na kafelku albo przez skasowanie
   współrzędnych i zapisanie.

2b. **Geokodowanie osobno** — pętla po jednym adresie na żądanie, z odstępami
   wymuszonymi po stronie serwera. Wyniki lądują w cache'u, więc drugie
   uruchomienie nic już nie pyta.
3. **Pobierz mapki** — to samo dla kafli. Każdy teren dostaje gotowy JPEG
   w `data/maps`.
4. **Obrysuj ulice** (opcjonalnie) — zamienia domyślne prostokąty na
   przebieg ulicy z Overpassa.
5. **Popraw ręcznie** — przycisk „Zaznaczenie…” przy terenie otwiera edytor
   (punkt 8). Tu też wpisuje się współrzędne z palca, gdy geokoder trafił
   w zły punkt.
6. **Podgląd wydruku** → `print.php`, drukowanie dwustronne.

---

## 7. Format obu list

**Lista 1 — tereny.** Jeden teren w wierszu:

```
Cicha 1; 12
Koszalińska 92; 13; Koszalin
12 | Cicha 1
12. Cicha 1
```

Teren obejmujący **dwa budynki z różnych ulic** zapisuje się przez plus:

```
Ujejskiego 1 + Kossaka 12; 12
```

Wtedy geokodowane są oba adresy, mapka centruje się między nimi, zoom
dobiera się sam tak, żeby zmieściły się oba wraz z ramką, a przy każdym
budynku staje osobna pinezka. Na awersie widnieją oba adresy, a wiersz
listy 2 może zaczynać się od któregokolwiek z nich — na rewersie zostaje
przy swoim. Adresów może być więcej niż dwa; plus jest jedynym
separatorem, bo ukośnik i przecinek występują w samych adresach.

Wartości, które mają **trafić na kartę, ale nie są częścią adresu** —
liczba mieszkań, oznaczenie klatki, cokolwiek — zapisuje się w nawiasach
albo w apostrofach:

```
Ujejskiego 1 (12) + Kossaka 12 (7); 12
Cicha 1 '30 lokali'; 13
```

Do geokodera idzie sam adres (`Ujejskiego 1`), a na awersie staje pełny
zapis z dopiskiem. Rozpoznawane są nawiasy okrągłe, apostrofy, cudzysłowy
proste i polskie „…”. Dopiski działają też w liście 2 — tam są tylko
usuwane, żeby nie psuły dopasowania do terenu.

Dopisek jest przechowywany osobno od adresu, więc jego poprawienie
i powtórny import **nie zakłada terenu od nowa** i nie kasuje ręcznie
poprawionego zaznaczenia.

**Jeden budynek na kilka terenów.** Teren to adres razem z dopiskiem, więc
ten sam budynek z różnymi zakresami lokali w nawiasie to osobne tereny:

```
Kisielewskiego 1 (1-40); 169
Kisielewskiego 1 (41-80); 170
Kisielewskiego 1 (81-120); 171
```

Każdy dostaje własną kartę (z tą samą mapką). Wiersz listy 2
`Kisielewskiego 1/52` trafia na kartę, której zakres w dopisku obejmuje
lokal 52 — tu na teren 170; lokal spoza wszystkich zakresów idzie na
pierwszy z nich. Ten sam adres z **tym samym** dopiskiem dwa razy to nadal
pomyłka, którą import zgłasza. Poprawka samego dopisku („(81-120)” →
„(81-121)”) zostaje poprawką tego terenu, o ile lista nie zawiera już
terenu ze starym dopiskiem.

Rozdzielasz średnikiem, kreską pionową albo tabulatorem. Pola:
`adres ; numer terenu ; miejscowość`. Numer i miejscowość można pominąć —
miejscowość wtedy bierze się z pola „Miejscowość” nad przyciskiem
(domyślnie `default_city`). Kolejność `numer ; adres` też jest
rozpoznawana, o ile pierwszy człon wygląda jak numer.

**Lista 2 — adresy na rewers.** Jeden adres w wierszu:

```
Cicha 1/1  12.12.2022
Cicha 1/10  01.02.2023
Jana Pawła II 5/7/23  08.08.2008
```

Wiersz trafia na tę kartę, której adres główny stanowi jego początek.
Dopasowanie idzie od najdłuższego adresu, więc ukośnik w nazwie
(`Jana Pawła II 5/7`) nie psuje podziału — reszta po ostatnim ukośniku
to numer lokalu, a za nim data. Wiersze bez pasującego terenu trafiają na
listę „nieprzypisanych” nad formularzem — nic nie ginie po cichu.

Lokale sortują się naturalnie (2 < 10, 3a < 3b < 4), o ile zaznaczysz
„Sortuj wykaz po numerze lokalu”.

---

## 7b. Eksport i import przez Excela

Poza dwoma polami tekstowymi na ekranie roboczym dane da się wprowadzać
masowo arkuszem. Otwiera to **`dane.php`** (odnośnik jest pod formularzem
importu): pobierasz szablon albo bieżące dane, poprawiasz w Excelu
i wgrywasz z powrotem.

### Co jest w pliku

Skoroszyt ma dwie zakładki, odpowiadające dwóm listom z punktu 7:

**Tereny** — lista 1:

| ID (nie zmieniaj) | Numer terenu | Adresy terenu | Miejscowość | Szerokość | Długość | Zoom | Obrys granicy koloru | Zaznaczenie | Źródło geokodowania |
|---|---|---|---|---|---|---|---|---|---|

**Adresy** — lista 2:

| ID terenu | Numer terenu | Adres budynku | Lokal | Data |
|---|---|---|---|---|

Wymagane są tylko **Adresy terenu** (w zakładce Tereny) oraz **Adres budynku**
i **Lokal** (w zakładce Adresy). Kolumny *Zaznaczenie* i *Źródło geokodowania*
są wyłącznie do wglądu — import ich nie czyta, bo kształt to setki punktów,
których nie da się sensownie poprawiać w komórce.

Kolumna **Obrys granicy koloru** przyjmuje `Tak` albo `Nie` i włącza dla
terenu przerywane kółko z punktu 8b. **Pusta komórka nic nie zmienia** —
można ją wypełnić tylko w tych wierszach, w których coś przestawiasz.
Czytane są też skróty (`Obrys`, `Obrys koloru`) oraz `T`/`N`, `1`/`0`,
bo nagłówek bywa przepisywany ręcznie; zapisywany jest zawsze pełny.

Kolumna **Adresy terenu** przyjmuje tę samą składnię co lista 1: dwa budynki
przez plus (`Ujejskiego 1 + Kossaka 12`), a dopiski w nawiasie
(`Cicha 1 (12)`). Import rozbiera ją tym samym kodem co pola tekstowe, więc
nie ma drugiego parsera, który mógłby się rozjechać z pierwszym.

### Kolumna ID — po co jest

**Zostaw ją w spokoju.** To ona decyduje o tożsamości terenu.

Bez identyfikatora teren rozpoznaje się po adresie — a wtedy poprawienie
literówki wygląda jak teren nieznany: powstaje nowy, a stary znika razem
z mapką, ręcznym zaznaczeniem i całym wykazem. Z identyfikatorem ta sama
poprawka jest poprawką: zmienia się adres, reszta zostaje na miejscu.

| Sytuacja | Co się dzieje |
|---|---|
| ID wypełnione | teren o tym numerze zostaje **poprawiony** |
| ID puste | powstaje **nowy** teren |
| ID, którego nie ma w bazie | wiersz **pominięty**, z komunikatem |
| ID powtórzone w dwóch wierszach | drugi wiersz **pominięty** |

### Import nic nie kasuje, dopóki mu nie każesz

Po wgraniu pliku dostajesz **podgląd**: ile terenów przybędzie, ile zostanie
poprawionych, ile wierszy wykazu wejdzie i które wiersze są błędne razem
z powodem. Do bazy nic jeszcze nie idzie — dopiero przycisk *Zapisz do
kartoteki*.

Pole **„Usuń tereny, których nie ma w pliku”** jest domyślnie **wyłączone**,
inaczej niż przy imporcie z pól tekstowych. Niepełny plik wgrany przez
pomyłkę kosztowałby mapki i ręczne zaznaczenia terenów, których akurat
w nim nie było.

### Formaty

Głównym formatem jest **`.xlsx`**, składany bez żadnych bibliotek —
to ZIP z kilkoma plikami XML. Gdy rozszerzenie `zip` jest niedostępne
(bywa wyłączone na hostingu współdzielonym), archiwum składa własny kod
oparty na `pack()` i zlib, które w PHP są zawsze. **Eksport działa więc
wszędzie**, a `sprawdz.php` pokazuje tylko informacyjnie, którą drogą idzie.

**CSV** jest do wyboru obok, po jednym pliku na zakładkę — przydaje się,
gdy dane trzeba wkleić z innego systemu albo poprawić w Notatniku. Plik ma
BOM UTF-8 i średniki, więc polski Excel otwiera go bez pytania o kodowanie.

Import przyjmuje oba formaty i rozpoznaje je **po zawartości, nie po
rozszerzeniu**. CSV wykrywa też separator (średnik albo przecinek)
i kodowanie (UTF-8 albo Windows-1250, które Excel potrafi zapisać).

### Dlaczego .xlsx, a nie sam CSV

Komórka zaczynająca się od `=`, `+`, `-` albo `@` jest w Excelu wykonywana
jako formuła. W CSV trzeba ją kaleczyć wiodącym apostrofem — działa, ale
apostrof zostaje w danych i wyjeżdża do innych systemów. W `.xlsx` formuła
to osobny element XML `<f>`, którego nasz zapis w ogóle nie tworzy, więc
`=HYPERLINK(...)` w adresie jest po prostu tekstem. To odporność
strukturalna, nie sztuczka.

Drugi powód: kolumny z numerem terenu i lokalem dostają **format tekstowy**,
więc Excel nie zamienia `5/7` na 5 lipca ani `007` na siódemkę. Przy
wklejaniu z innego arkusza wybierz „Wklej tylko wartości” — format
przychodzi razem z danymi i potrafi to zepsuć.

> **Uwaga.** Pliki sprawdzono strukturalnie (rozpakowanie, walidacja XML,
> odczyt dwoma niezależnymi czytnikami idącymi łańcuchem relacji tak jak
> Excel), ale **nie otwarto ich w prawdziwym Excelu ani LibreOffice** —
> w środowisku, w którym powstawały, nie było żadnego z nich. Przed
> pierwszym masowym importem otwórz pobrany szablon u siebie.

### Bezpieczeństwo wgrywanego pliku

Plik przychodzi od użytkownika, więc odczyt ma twarde ograniczenia:
maksymalnie 12 MB archiwum, 64 części, 96 MB po rozpakowaniu (próg na
bombę zip), 20 000 wierszy na arkusz i 4000 znaków na komórkę. Rozmiar
po rozpakowaniu sprawdzany jest **przed** rozpakowaniem, a każda część ma
kontrolowaną sumę CRC.

XML parsujemy **bez flagi `LIBXML_NOENT`** i z `LIBXML_NONET`, a deklarację
`DOCTYPE` odrzucamy wprost. To nie jest ostrożność na wyrost: sprawdzone na
PHP 8.4 z libxml 2.9.14 — bez `NOENT` zewnętrzna encja nie jest rozwijana,
ale **z nią parser posłusznie wczytuje wskazany plik z dysku serwera**.

Eksport nie ma osobnej kontroli dostępu, bo cała aplikacja jej nie ma —
`index.php` pokazuje to samo. Jeśli instalacja stoi w internecie, zamknij
ją na poziomie serwera (punkt 3, „Ograniczenie dostępu”).

---

## 8. Zaznaczanie obszaru i edytor mapek

Każda karta pokazuje na mapce **zaznaczony obszar adresu**. Kolor,
grubość kreski i krycie wypełnienia są jednym ustawieniem w `config.php`,
więc wszystkie mapki wyglądają tak samo:

```php
'shape_color'    => '#c0392b',   // ten sam kolor na każdej karcie
'shape_width_mm' => 1.2,         // grubość kreski na papierze
'shape_fill_pct' => 18,          // krycie wypełnienia obszaru w %
'shape_default'  => 'none',      // none | rect | street
'shape_rect_m'   => ['w' => 120, 'h' => 80],   // domyślny prostokąt w metrach
```

**Domyślnie nic nie powstaje samo** (`shape_default => 'none'`): na mapce
zostaje sama pinezka, a zaznaczenie rysuje się ręcznie w edytorze — dla
tych terenów, gdzie faktycznie coś wnosi. Ustawienie `'rect'` przywraca
prostokąt zakładany automatycznie po geokodowaniu, `'street'` — obrys ulicy.

Trzy rodzaje zaznaczenia:

* **prostokąt** — ramka wokół punktu adresu,
* **ulica** — kreska wzdłuż ciągu ulicy, pobrana z Overpassa,
* **obszar** — dowolny wielokąt rysowany ręcznie.

Przy terenie z dwoma adresami domyślny prostokąt obejmuje oba budynki
z tym samym marginesem, a zoom jest dobierany tak, żeby ramka zmieściła
się w kadrze.

Kształt jest zapisany przy terenie we współrzędnych geograficznych, więc
przeżywa zmianę zoomu i przesunięcie środka mapki. Rysuje go GD na
warstwie w podwójnej skali, zmniejszanej dopiero przy zapisie — dzięki
temu krawędzie są gładkie mimo że GD sam ich nie wygładza.

### Edytor

Przycisk **„Zaznaczenie…”** przy terenie otwiera okno z mapką
w powiększeniu i warstwą do rysowania:

| Element | Działanie |
|---|---|
| Prostokąt / Ulica / Obszar / Brak | rodzaj zaznaczenia |
| przeciągnięcie rogu | zmiana rozmiaru prostokąta |
| przeciągnięcie wnętrza | przesunięcie prostokąta |
| przeciągnięcie po pustym miejscu | narysowanie nowego prostokąta |
| klik po pustym miejscu (ulica, obszar) | dołożenie punktu na końcu odcinka |
| przeciągnięcie uchwytu | przesunięcie punktu |
| prawy przycisk (albo Alt + klik) na uchwycie | usunięcie punktu |
| Nowy odcinek | rozpoczęcie kolejnej łamanej (ulica z przerwami) |
| Cofnij / Wyczyść | krok wstecz / kasowanie zaznaczenia |
| Obrysuj ulicę | pobranie przebiegu ulicy z Overpassa |
| Przesuwaj mapkę | przeciąganie zmienia środek mapki |
| − / + | zmiana zoomu (10–19) |

### Przesuwanie całego obrysu

Obrys ulicy z Overpassa leży dokładnie na ulicy — i przez to **zakrywa jej
podpis** na mapce. Cały kształt da się odsunąć bez ruszania pojedynczych
wierzchołków:

| Sposób | Co robi |
|---|---|
| Strzałki ↑ ↓ ← → w pasku | jedno naciśnięcie = 1,5 mm papieru |
| Te same strzałki z Shiftem | krok cztery razy większy |
| Klawisze strzałek | to samo; przytrzymanie dosuwa płynnie |
| Shift + przeciągnięcie po mapce | ruch ciągły |

Krok jest w **milimetrach papieru**, nie w metrach terenu, bo problem jest
wizualny: podpis i kreska mają stałą wielkość na wydruku niezależnie od
zoomu. Kreska zaznaczenia z białą obwódką ma ok. 2,3 mm, więc dwa naciśnięcia
wyprowadzają obrys znad podpisu. Wielkość kroku ustawia `shape_nudge_mm`.

Cała seria naciśnięć to **jeden wpis** w historii — jedno „Cofnij” wraca do
stanu sprzed dosuwania, a nie cofa je po jednym.

Dwie rzeczy warto wiedzieć. Dosunięcie obrysu przesuwa też **kolorowy
korytarz** (punkt 8b), bo ten idzie za kształtem — pinezka zostaje w kolorze
zawsze, ale przy dużym dosunięciu kolor przestaje leżeć symetrycznie na
ulicy. I ponowne kliknięcie **„Obrysuj ulicę”** pobiera świeży przebieg,
czyli kasuje dosunięcie; zbiorcze „Obrysuj ulice” już go nie ruszy, bo
zapisany ręcznie obrys ma `shape_src = 'manual'`.

Zmiana środka i zoomu zapisuje się od razu (mapka musi się złożyć na
nowo), samo zaznaczenie — dopiero przyciskiem **Zapisz zaznaczenie**.
Poprawione ręcznie zaznaczenie jest oznaczane jako `manual` i żadna
operacja zbiorcza go nie nadpisze.

---

## 8b. Kolor tylko wokół adresu

Na karcie liczy się jedno miejsce — budynek. Kolorowa mapka ciągnie wzrok
wszędzie po równo, więc podkład można **odbarwić poza okolicą adresu**:
kolor zostaje w kole wokół każdej pinezki, reszta idzie w czerń i biel.
Zaznaczenie obszaru i pinezki rysowane są na wierzchu, więc **zawsze
zostają kolorowe**, niezależnie od trybu.

```php
'map_color'          => 'spot',   // full | spot | gray
'map_color_r_m'      => 45,       // promień pełnego koloru w metrach
'map_color_fade_m'   => 25,       // szerokość łagodnego przejścia
'map_color_gray_pct' => 100,      // 100 = pełna czerń i biel
```

| `map_color` | co daje |
|---|---|
| `full` | cała mapka kolorowa — tak działały wcześniejsze wersje |
| `spot` | kolor w promieniu wokół adresów, reszta szara *(domyślne)* |
| `gray` | cała mapka w skali szarości — oszczędza toner kolorowy |

Promień podaje się **w metrach w terenie**, nie w pikselach, więc zmiana
zoomu nie zmienia wielkości kolorowej plamy. Przejście na brzegu koła
jest łagodne: ostra krawędź czytałaby się jak druga ramka i myliła
z zaznaczeniem obszaru.

Przy terenie z dwoma adresami każdy dostaje własne koło, a tam gdzie się
stykają — zlewają się w jedną plamę.

### Kolor idzie za ulicą, gdy adres jej nie precyzuje

Gdy adres terenu to **sama nazwa ulicy**, bez numeru budynku, koło wokół
punktu wskazywałoby przypadkowe miejsce w jej środku. Wtedy kolor obejmuje
**cały przebieg ulicy** — korytarz wzdłuż obrysu pobranego z Overpassa:

```php
'map_color_line_r_m'    => 22,      // połowa szerokości korytarza
'map_color_line_fade_m' => 18,      // łagodne przejście za korytarzem
'map_color_shape'       => 'line',  // line | line+area | none
```

Korytarz ma **własny, węższy promień** niż koło i to nie jest przeoczenie:
kadr mapki obejmuje ok. 350 × 140 m, więc korytarz o promieniu 45 m zalałby
kolorem prawie całą kartę i tryb `spot` przestałby cokolwiek wskazywać.

Warunki są dwa i muszą zajść oba: żaden adres terenu nie ma numeru budynku
**oraz** teren ma zaznaczenie typu „ulica”. Sam adres bez obrysu wraca do
koła — składanie mapki nie pyta Overpassa, bo przy nakładzie kart jedno
zapytanie z własnym odstępem potrafiłoby zostawić kartę bez mapki.
**Obrys trzeba więc najpierw zrobić**: przyciskiem „Obrysuj ulice”, w edytorze
albo ustawieniem `shape_default = 'street'`. Przy `shape_default = 'none'`
(domyślne) łatwo uznać, że funkcja nie działa — a po prostu nie ma czego śledzić.

Rozpoznanie „ulica czy konkretny budynek” nie idzie przez `street_name()`,
bo ta funkcja obcina także przedrostek i `ul. Cicha` uchodziłaby za adres
z numerem. Osobny predykat pyta wprost o sufiks numeru; sprawdzony na
29 zapisach, w tym `1 Maja`, `Aleja 3 Maja`, `Jana Pawła II`,
`Zwycięstwa 168-170` i `Cicha 1, Koszalin`.

Prostokąt nie przełącza koloru w korytarz **nigdy**: ma prawie ten sam
rozmiar co domyślne koło, więc krawędź plamy zlałaby się z ramką zaznaczenia
w podwójną obwódkę. Obszar rysowany ręcznie — tylko po jawnym ustawieniu
`map_color_shape = 'line+area'`, bo zwykle obejmuje niemal cały kadr.

### Przerywane kółko na granicy koloru

Sam gradient jest łagodny i na złożonej mapce nie widać, dokąd właściwie
sięga kolor. Granicę pokazuje wprost **cienka przerywana linia bez
wypełnienia** — kółko przy adresie z numerem, obrys korytarza przy ulicy:

```php
'map_color_edge'          => true,
'map_color_edge_width_mm' => 0.35,      // grubość kreski
'map_color_edge_dash_mm'  => 1.6,       // długość kreski
'map_color_edge_gap_mm'   => 1.2,       // długość przerwy
'map_color_edge_color'    => '#5a6b76',
```

Kółko i obrys korytarza rysuje **ten sam kod** — liczy je z geometrii
kolorowej plamy, nie z jej rodzaju, więc przy dwóch adresach wychodzą dwa
kółka, a tam gdzie plamy się stykają, obrys biegnie po ich wspólnej granicy.
Kreski odmierzane są wzdłuż łuku całej linii, nie osobno na każdym odcinku,
więc na zakręcie mają tę samą długość co na prostej.

Linia siedzi na **promieniu zewnętrznym** — tam, gdzie odbarwienie osiąga
pełną szarość. Bliżej przecinałaby jeszcze kolorową plamę i wyglądała na
źle trafioną.

Kolor jest osobny od `shape_color` celowo: gruba kreska zaznaczenia
i pinezki są czerwone, a cienki przerywany obrys w tym samym kolorze
czytałby się jak drugie, niedokończone zaznaczenie. Obrys idzie **pod**
zaznaczeniem, więc gdy oba wypadną w tym samym miejscu, na wierzchu zostaje
zaznaczenie. Pojawia się też na podkładzie pod edytor, żeby podgląd zgadzał
się z wydrukiem.

Kosztuje ok. 60 ms na kartę przy korytarzu i ok. 25 ms przy kółku.

**Da się go wyłączyć osobno dla każdego terenu** — pole wyboru *Przerywany
obrys* w pasku edytora zaznaczeń, albo kolumna *Obrys granicy koloru*
w arkuszu (punkt 7b), z wartościami `Tak` / `Nie`. Ustawienie trzyma się
terenu, a `map_color_edge` w `config.php` decyduje tylko o tych, przy
których nikt osobno nie zdecydował — więc zmiana globalna nadal działa
na resztę kartoteki i nie kasuje pojedynczych decyzji. W trybach `full` i `gray`
nie powstaje w ogóle — nie ma wtedy granicy, którą miałby pokazywać.

Przy domyślnych 45 + 25 m kółko ma promień ok. 190 px, a mapka 200 px
w połowie wysokości — mieści się, ale ledwie. `sprawdz.php` liczy to za
Ciebie i ostrzega osobno dla kółka i osobno dla korytarza.

> **Po tej zmianie wszystkie mapki policzą się raz od nowa.** Do klucza
> pliku doszły obrys i adresy terenu, więc lista pokaże przy każdym terenie
> „bez mapki”, dopóki nie przejedziesz raz „Przygotuj tereny”. Kafle siedzą
> w `data/tiles`, więc to ok. 80 ms na kartę, nie sekunda.

**Ile dać na promień.** Pole mapki (126 × 50 mm) obejmuje przy domyślnym
zoomie mniej więcej **350 × 140 m terenu**. Suma `map_color_r_m` +
`map_color_fade_m` powyżej ok. 70 m przestaje więc być kołem — kolor
rozlewa się na pas przez całą szerokość karty. `sprawdz.php` liczy to za
Ciebie i ostrzega, gdy promień nie mieści się w wysokości mapki.

`map_color_gray_pct` mniejsze niż 100 zostawia poza kołem **przygaszony
kolor** zamiast pełnej szarości — np. `70` daje mapę spokojną, ale wciąż
czytelną kolorystycznie. `0` wyłącza odbarwianie tak samo jak `'full'`.

Zmiana któregokolwiek z tych ustawień unieważnia gotowe mapki — przy
następnym „Pobierz mapki” złożą się na nowo, bez ponownego ściągania
kafli (te siedzą we własnym cache'u).

---

## 9. Wydruk

`print.php` układa karty po cztery na arkuszu A4 poziomo, w miejscach
wyznaczonych przez znaczniki cięcia oryginalnego druku. Awers i rewers
idą po sobie.

W oknie drukowania ustaw: **orientacja pozioma, marginesy zerowe,
skala 100 %, druk dwustronny**. „Zapisz jako PDF” daje tekst wektorowy.

Co jest na karcie:

* **awers** — w polu „Miejscowość:” stoi pełny adres terenu (ulica z numerem,
  bez miasta), obok numer terenu, niżej mapka z zaznaczonym obszarem.
  Adres zostaje w jednym wierszu — przy dłuższym zapisie (dwa budynki
  z dopiskami) pismo schodzi stopniami z 10 do 7 pt, zamiast łamać wiersz
  i wchodzić na mapkę. Mapka kończy się dokładnie tam, gdzie zaczyna się
  wytłuszczony tekst szablonu, a numer druku i data siedzą tuż pod nim.
  W prawym dolnym rogu, naprzeciwko numeru druku, jest **data wydruku** —
  po niej odróżnisz nakład od nakładu. Format ustawia `card_date_format`
  w `config.php` (np. `'d.m.Y H:i'` dla daty z godziną, pusty napis chowa datę).
* **rewers** — u góry sam numer terenu, niżej wykaz adresów w pełni
  wyrysowanej kratce: obwódka, linie między wierszami i pionowe oddzielenie
  kolumny daty. Siatka rysuje się cała także wtedy, gdy wykaz jest pusty —
  karta wychodzi z drukarki jako formularz do wypełnienia.

  Liczbę wierszy w kolumnie ustawia `back_rows`. Tabela zawsze wypełnia
  66 mm pola, więc ta liczba decyduje o wysokości wiersza:

  | `back_rows` | wysokość wiersza | pojemność karty | do czego |
  |---|---|---|---|
  | 14 (domyślnie) | ok. 4,4 mm | 28 adresów | maksimum pozycji, odręcznie wąsko |
  | 11 | ok. 5,6 mm | 22 adresy | kompromis |
  | 8 | ok. 7,7 mm | 16 adresów | wygodny wpis długopisem |

  Powyżej `back_rows` pozycji wykaz dzieli się na dwie kolumny — wiersze
  zostają tej samej wysokości, karta mieści dwa razy tyle adresów.

### Dupleks: dwa ustawienia, nie jedno

Żeby rewers trafił na swoją kartę **i czytał się właściwą stroną**, trzeba
rozstrzygnąć dwie niezależne rzeczy:

* **`flip`** — w które gniazdo arkusza trafia rewers. Zależy wyłącznie od
  tego, jak **drukarka** odwraca kartkę.
* **`back_rotate180`** — czy treść rewersu ma być obrócona o 180°. Zależy
  od tego, jak **Ty** obracasz wyciętą kartę, żeby przeczytać drugą stronę.

Gdy osie się nie zgadzają, rewers trafia we właściwe miejsce, ale stoi do
góry nogami — i żadna wartość samego `flip` tego nie naprawi:

| Drukarka odwraca kartkę wzdłuż | Kartę obracasz wzdłuż | `flip` | `back_rotate180` |
|---|---|---|---|
| dłuższej krawędzi (najczęstsze) | dłuższej | `rows` | `false` |
| dłuższej krawędzi | **krótszej** | `rows` | **`true`** |
| krótszej krawędzi | krótszej | `cols` | `false` |
| krótszej krawędzi | dłuższej | `cols` | **`true`** |

Ustawienie domyślne to `rows` + `back_rotate180 = true`, czyli typowa
drukarka i karta obracana wzdłuż krótszej krawędzi.

`both` (obrót kartki o 180°) i `none` (ręczne podawanie) zostają dla
nietypowych drukarek.

**Zanim puścisz nakład**, wydrukuj `print.php?test=1` — jedną kartkę
dwustronnie. Każda karta ma na obu stronach cyfrę i strzałkę, a pod
arkuszem wypisane są ustawienia, z którymi powstał. Wytnij karty i obróć
je tak, jak zamierzasz obracać gotowe:

* **cyfra się zgadza, strzałka w górę** — ustawienia dobre,
* **cyfra się zgadza, strzałka w dół** — przestaw `back_rotate180`,
* **cyfra się nie zgadza** — zmień `flip` (`rows` ↔ `cols`).

Kontrola linijką: znaczniki cięcia mają być oddalone dokładnie
o **146,00 mm** w poziomie i **94,44 mm** w pionie.

---

## 10. Skąd brać kafle i polityki usług

### Ile kafli potrzeba naprawdę

Mapka ma 126 × 50 mm przy 8 px/mm, czyli 1008 × 400 px. Kafel to 256 px,
więc jedna karta to **8–15 kafli** z zoomu 17 (zależnie od tego, jak
wypadnie siatka). Przy 300 kartach wychodzi **2,5–4,5 tysiąca kafli**,
raz — potem wszystko siedzi w `data/tiles` i kolejne wydruki nie pobierają
już niczego. Sąsiednie tereny w tym samym mieście często dzielą kafle,
więc w praktyce bywa mniej.

To ważne przy wyborze dostawcy: **prawie każdy darmowy plan jest na to
20–50 razy za duży.** Nie musisz szukać usługi „bez limitu”, wystarczy
taka, której miesięczny limit przekracza kilka tysięcy.

### Podpisy za małe na wydruku

Kafle rysują nazwy ulic i numery domów w stałym rozmiarze pikselowym, więc
na karcie obejmującej kilkaset metrów wychodzą drobne. Lekarstwem nie jest
większy zoom (bo karta obejmie mniej terenu), tylko **kafle w podwójnej
rozdzielczości**:

```php
'tile_url'     => 'https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}@2x.png?apiKey=…',
'tile_size'    => 512,
'default_zoom' => 17,
```

Kafel `@2x` obejmuje ten sam wycinek świata, ale ma 512 px zamiast 256 —
napisy zajmują w nim dwa razy więcej pikseli. Zejście o jeden poziom zoomu
przywraca ten sam obszar co wcześniej, więc karta pokazuje tyle samo terenu,
a podpisy są **dwa razy większe i nadal ostre** (inaczej niż przy zwykłym
powiększaniu obrazu). Zmierzone: 1008 × 400 px przy kaflu 512 i zoomie 17
obejmuje 352 × 140 m — tyle samo co kafel 256 przy zoomie 18.

Tak jest ustawione po instalacji. Wracając na kafle 256, pamiętaj o zmianie
obu wartości naraz: `tile_size` na 256 i `default_zoom` na 18.

Terenom wczytanym wcześniej zapisany jest ich własny zoom — po zmianie
rozmiaru kafla trzeba go poprawić, na przykład tak:

```sql
UPDATE territory SET zoom = 17;
```

a potem skasować `data/maps` i puścić „Pobierz mapki” jeszcze raz.

### Gdzie to wziąć za darmo

| Usługa | Co daje za darmo | Klucz | Uwagi |
|---|---|---|---|
| **GUGiK / Geoportal** | usługi państwowego zasobu, bez limitu na użytkownika | nie | mapa topograficzna i ortofotomapa całej Polski, ten sam zasób co geokoder; podpina się przez WMS — patrz niżej |
| **Thunderforest** | plan *Hobby*: 150 000 kafli/mies. | tak | dla projektów niekomercyjnych; style Atlas, Outdoors, Transport |
| **MapTiler Cloud** | 100 000 żądań/mies. (i 5 000 sesji) | tak | po przekroczeniu mapy są wstrzymywane do końca miesiąca; wymaga logotypu MapTiler |
| **Stadia Maps** | 200 000 kredytów/mies. | tak | użytek niekomercyjny, badawczy i deweloperski; rastry we wszystkich stylach poza satelitą |
| **własny serwer** | wszystko, bez limitów | — | wyciąg Polski z Geofabrika + `openstreetmap-tile-server`; sensowne, jeśli kart będą tysiące |

Po instalacji ustawiony jest **Geoapify w stylu `osm-carto`** — czyli
dokładnie ten obraz, który widać na openstreetmap.org: obrysy budynków
z numerami i nazwy ulic pisane wzdłuż osi. Trzeba tylko wkleić własny
klucz w `tile_url`. Plan darmowy to 3000 kredytów na dobę, a kafel
kosztuje ćwierć kredyta — czyli **ok. 12 tys. kafli dziennie** przy
zapotrzebowaniu 3–4,5 tys. jednorazowo.

Adresy pozostałych dostawców czekają w komentarzu przy `tile_url`.
Usługi typu Geoportal GUGiK podpina się przez `map_source = 'wms'` —
patrz niżej.

Publiczne kafle `tile.openstreetmap.org` **odpadają** — ich polityka wprost
zabrania pobierania z wyprzedzeniem, a o to tu chodzi.

### Geoportal GUGiK — przez WMS, nie przez kafle

Kafle Geoportalu są publikowane
w zbiorach EPSG:2180 i EPSG:4326, a nie w Web Mercatorze, więc nie da się
ich podstawić pod adres `{z}/{x}/{y}` — numeracja kafli jest inna. Zamiast
tego aplikacja pobiera podkład **jednym żądaniem GetMap na kartę**:

```php
'map_source' => 'wms',

'wms' => [
    'url'     => 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',
    'layers'  => 'Raster',           // ortofotomapa
    'styles'  => '',
    'version' => '1.3.0',
    'crs'     => 'EPSG:3857',        // albo EPSG:4326
    'format'  => 'image/jpeg',
    'extra'   => [],
],
```

Mapa topograficzna zamiast zdjęcia lotniczego to
`https://mapy.geoportal.gov.pl/wss/service/img/guest/TOPO/MapServer/WMSServer`
z warstwą w rodzaju `Raster_10_1992` — obie usługi są na liście w `wms.php`.

### Ortofotomapa z podpisami adresów

Zdjęcie lotnicze jest najczytelniejsze, ale samo z siebie nie ma nazw ulic
ani numerów domów — te leżą w **osobnej usłudze** (PRG, adresy i ulice).
Jednym żądaniem GetMap nie da się ich dobrać: parametr `extra` dokłada tylko
parametry do tego samego zapytania, do tej samej usługi. Dlatego podpisy
rysuje się **drugim żądaniem, nałożonym na podkład**:

```php
'wms' => [                       // podkład
    'url'     => 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',
    'layers'  => 'Raster',
    'format'  => 'image/jpeg',
    'crs'     => 'EPSG:3857',
    'version' => '1.3.0',
],

'wms_overlays' => [              // co dorysować na wierzchu
    [
        'url'     => 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/PRG/WMS/Addresses',
        'layers'  => 'ULICE,PUNKTY_ADRESOWE',   // nazwy z wms.php, po przecinku
        'format'  => 'image/png',               // musi mieć kanał przezroczystości
        'crs'     => 'EPSG:3857',
        'version' => '1.3.0',
        'scale'   => 2.5,                       // powiększenie podpisów
    ],
],
```

### Kilka warstw naraz

W jednym żądaniu można poprosić o kilka warstw tej samej usługi — nazwy
rozdziela się przecinkami, a rysują się w podanej kolejności (pierwsza na
spodzie). Nazwy ulic i numery domów siedzą zwykle w osobnych warstwach,
więc typowy wpis wygląda tak:

```php
'layers' => 'ulice,punkty_adresowe',
```

Parametru `STYLES` nie musisz uzupełniać — protokół wymaga, żeby miał tyle
samo pozycji co `LAYERS`, i aplikacja dopisuje puste style sama. Warstwy
z **różnych** usług dodaje się jako kolejne pozycje `wms_overlays`.

### Podpisy są za małe

Usługa rysuje napisy w stałym rozmiarze pikselowym — kilkanaście pikseli,
niezależnie od tego, jak duży obszar obejmuje żądany kadr. Na karcie
obejmującej 700 m numery domów wychodzą wtedy ledwie widoczne, a robią się
czytelne dopiero przy zoomie 19, gdzie z kolei nie widać całego terenu.

Dlatego nakładka ma własny mnożnik:

```php
'scale' => 2.5,        // podpisy dwa i pół raza większe
```

Działa to tak, że o ten sam wycinek prosimy w mniejszym obrazie
(1008 × 400 px staje się 403 × 160 px) i rozciągamy go do rozmiaru mapki.
Napisy rosną w tej samej proporcji, a położenie zostaje bez zmian, bo BBOX
jest ten sam. Ceną jest miękkość liter — sensowny zakres to **2–3**.

Alternatywa bez utraty ostrości, jeśli usługa ją rozumie (ArcGIS zwykle tak):

```php
'extra' => ['DPI' => 192],     // zamiast 'scale'
```

Efekt obejrzysz w `wms.php` — jest tam wybór „Powiększenie podpisów”,
a podgląd pokazuje kadr w tej samej proporcji co gotowa karta, więc
wielkość liter na ekranie odpowiada tej z wydruku.

### Zasady nakładek

* `TRANSPARENT=TRUE` dokładany jest sam — nakładka bez przezroczystości
  zasłoniłaby zdjęcie,
* `format` nakładki musi być `image/png`; JPEG nie ma kanału alfa,
* **pusta nazwa warstwy wyłącza nakładkę** i nie generuje żadnego żądania,
* nieudana nakładka nie psuje karty: mapka powstaje bez podpisów, a powód
  ląduje w komunikacie pętli „Pobierz mapki”,
* nakładek może być więcej niż jedna, rysowane są po kolei,
* każda to jedno żądanie więcej na kartę (podkład + podpisy = 2 na kartę,
  czyli ok. 600 przy 300 kartach).

Nazwę warstwy adresowej znajdziesz w `wms.php` — usługa PRG jest już na
liście `wms_presets`, więc wystarczy wybrać ją z rozwijanego menu.

### Gdy mapki wychodzą puste: `wms.php`

GUGiK przenosi i przemianowuje usługi, więc adres albo nazwa warstwy
powyżej mogą się zdezaktualizować. Zamiast zgadywać, otwórz **`wms.php`**
(albo przycisk „Usługa WMS…” na ekranie roboczym). Strona:

* odpytuje GetCapabilities wybranej usługi — do wyboru te z `wms_presets`
  w `config.php` oraz ta ustawiona w `wms`,
* wypisuje wszystkie warstwy z nazwą, tytułem i listą układów,
* pokazuje **podgląd każdej warstwy** złożony dokładnie tym zapytaniem,
  którym potem złoży się karta; gdy usługa odmówi, w miejscu podglądu
  wypisuje jej komunikat, a nie ikonę zepsutego obrazka,
* przy każdej warstwie podaje gotowe linijki do wklejenia w `config.php`.

Adres usługi nigdy nie pochodzi z żądania — przeglądarka może wskazać
tylko pozycję z listy w konfiguracji, więc aplikacji nie da się użyć do
odpytywania cudzych serwerów.

Wersja dla konsoli, gdyby ktoś wolał:

```bash
curl -s 'ADRES_USŁUGI?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0' > caps.xml
grep -o '<Name>[^<]*</Name>' caps.xml | sort -u | head        # nazwy warstw
grep -o '<CRS>[^<]*</CRS>' caps.xml | sort -u | head           # układy
```

Który układ wybrać:

| CRS | Działa | Dlaczego |
|---|---|---|
| `EPSG:3857` | tak, najlepiej | to samo odwzorowanie, w którym składana jest mapka |
| `EPSG:4326` | tak | przy wielkości karty (700 × 280 m) różnica względem Merkatora to **0,003 piksela** — zmierzone, nie oszacowane |
| `EPSG:2180` | nie | ma własną zbieżność południków: obraz byłby obrócony o ponad 2° względem siatki, czyli o kilkadziesiąt pikseli w rogach karty |

Kolejnością osi nie musisz się przejmować — WMS 1.3.0 z EPSG:4326 chce
w BBOX-ie szerokość przed długością, 1.1.1 odwrotnie, i aplikacja
przestawia to sama zależnie od wpisanej wersji.

Co jeszcze daje ta droga:

* **jedno żądanie na kartę zamiast 8–15 kafli** — przy 300 kartach to ok.
  300 zapytań, a nie kilka tysięcy,
* podkład jest cache'owany tak samo jak kafle, więc powtórny wydruk nie
  odpytuje usługi,
* gdy usługa odeśle XML zamiast obrazu (najczęściej zła nazwa warstwy albo
  nieobsługiwany układ), jej komunikat trafia wprost na pasek postępu —
  zamiast szarej mapki bez wyjaśnienia,
* `sprawdz.php` w trybie WMS robi próbne GetMap i pokazuje wynik.

Jeżeli natomiast trafisz na usługę WMTS ze zbiorem kafli **w EPSG:3857**,
zostaje przy `map_source = 'xyz'` — podstawienie `{z}`, `{x}` i `{y}` działa
w dowolnym miejscu adresu, więc wariant KVP wchodzi bez zmian w kodzie:

```
...?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=...&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}
```

### Czego wymagają regulaminy

**Oznaczenie źródła.** Napis z `attribution` w `config.php` jest wypalany
w rogu każdej mapki. Po zmianie dostawcy **dopasuj go** — OSM wymaga
„© OpenStreetMap contributors”, MapTiler dodatkowo swojego logotypu,
GUGiK oznaczenia „Główny Urząd Geodezji i Kartografii”.

**Geokodowanie.** Domyślnie GUGiK (Uniwersalna Usługa Geokodowania, dane PRG,
cała Polska, bez klucza). Nominatim wchodzi tylko jako rezerwa —
sekwencyjnie, z wypełnionym `contact_email` i z cache'em, tak jak wymaga
tego jego polityka użycia:
<https://operations.osmfoundation.org/policies/nominatim/>

**Kafle OSM.** <https://operations.osmfoundation.org/policies/tiles/>

**Overpass.** Używany tylko na wyraźne żądanie (przycisk „Obrysuj ulicę”
albo `shape_default = 'street'`), z odstępem `overpass_delay_ms` między
zapytaniami. Publiczny serwer ma politykę uczciwego użycia — przy setkach
kart podstaw własną instancję albo zostaw prostokąty. Wpisanie `null`
w `overpass_url` wyłącza tę funkcję całkowicie.

Aplikacja nigdy nie pobiera dwa razy tego samego: adresy siedzą
w `geo_cache`, kafle w `data/tiles` (ważne `tile_ttl_days` dni), gotowe
mapki w `data/maps`.

## 11. Bezpieczeństwo

* Katalog `data/` (baza, kafle, mapki) **nie może być dostępny z sieci**.
  Apache: `data/.htaccess` powstaje sam, ale wymaga `AllowOverride`.
  nginx: `location ^~ /data/ { return 404; }` — gotowe w `nginx/karty.conf`.
  Po wdrożeniu potwierdź to wierszem „katalog data/ zasłonięty przed siecią”
  w `sprawdz.php`.
* Najpewniejszy wariant — przenieś dane poza `DocumentRoot`:

  ```php
  'db'        => '/var/lib/karty/kartoteka.sqlite',
  'tiles_dir' => '/var/lib/karty/tiles',
  'maps_dir'  => '/var/lib/karty/maps',
  ```

  ```bash
  mkdir -p /var/lib/karty && chown www-data:www-data /var/lib/karty
  ```

* Po udanej instalacji skasuj `sprawdz.php` — do niczego więcej nie służy.
* Aplikacja nie ma logowania. Jeśli stoi w internecie, przykryj ją
  `.htpasswd` (Apache) albo `auth_basic` (nginx).
* Każde zapytanie do bazy idzie przez PDO z parametrami wiązanymi,
  operacje zmieniające stan wymagają POST-a i tokenu CSRF, a adresy usług
  zewnętrznych pochodzą wyłącznie z `config.php` — żaden parametr żądania
  nie wpływa na to, dokąd serwer wysyła zapytanie.
* Kształty zaznaczeń przychodzą z przeglądarki i są przepisywane na
  postać zaufaną (`shape_clean()`): tylko znane rodzaje, zakresy
  współrzędnych i limity liczby punktów.

---

## 12. Kiedy coś nie działa

| Objaw | Przyczyna i naprawa |
|---|---|
| **nginx: 502 Bad Gateway** | zła ścieżka gniazda w `fastcgi_pass` albo nieuruchomiony PHP-FPM: `ls /run/php/` i `systemctl status php8.3-fpm` |
| **nginx: przeglądarka pobiera plik .php zamiast go wykonać** | brak bloku `location ~ \.php$` — skopiuj go z `nginx/karty.conf` |
| **nginx: „File not found” z FPM-a** | `root` w konfiguracji nie wskazuje katalogu z aplikacją albo brakuje `fastcgi_param SCRIPT_FILENAME` |
| **nginx: `unknown directive "http2"`** | nginx starszy niż 1.25 — zamiast `http2 on;` napisz `listen 443 ssl http2;` |
| **nginx: `[::]:80 failed (97: Address family not supported)`** | maszyna bez IPv6 — zakomentuj wiersze `listen [::]:…` |
| **Baza do pobrania spod `/data/…`** | brak `location ^~ /data/ { return 404; }`; sprawdź wierszem „katalog data/ zasłonięty przed siecią” w `sprawdz.php` |
| Biała strona zaraz po wejściu | brak `gd`, `curl` albo `pdo_*` — otwórz `sprawdz.php`, dalej zajrzyj do logu błędów PHP |
| „Nie mogę utworzyć katalogu: …/data” | `data/` nie jest zapisywalny przez użytkownika PHP-FPM: `chown www-data:www-data data && chmod 775 data` (użytkownika sprawdzisz w `/etc/php/*/fpm/pool.d/www.conf`) |
| „Brak tabel i brak prawa do ich utworzenia” | konto MySQL bez `CREATE` — zaimportuj `schema.mysql.sql` (punkt 4.1, wariant B) |
| **Windows: wszystko wstaje, ale nic się nie pobiera** | najczęściej brak listy zaufanych urzędów certyfikacji — PHP dla Windowsa przychodzi bez niej i **każde** żądanie HTTPS pada z błędem 60. Objaw myli, bo wygląda jak „geokoder nie zna adresu”. Otwórz `sprawdz.php`: wiersze „lista zaufanych urzędów certyfikacji” i „próbne geokodowanie” podają dosłowną treść błędu. Naprawa: skasuj folder `php` i uruchom program ponownie — pobierze `cacert.pem` sam (rozdz. 2b) |
| Geokodowanie kończy się „nie znaleziono” przy każdym adresie | jeżeli `sprawdz.php` pokazuje treść błędu sieci — to nie kwestia zapisu adresu, tylko wyjścia na świat albo blokady portu 443. Jeżeli usługa odpowiada, a mimo to nie zna adresów — sprawdź `geocoder` i miejscowość w `config.php` |
| Mapki są szare, bez treści | serwer kafli nie odpowiada albo `tile_url` ma zły adres/klucz; wiersz „próbne pobranie kafla” w `sprawdz.php` podaje powód wraz z użytym adresem |
| Tereny raz oznaczone jako „nie znaleziono” już nie wracają do kolejki | tak ma być: pętla ich nie tyka, żeby się nie zapętliła. Po usunięciu przyczyny kliknij „Szukaj ponownie” na kafelku. Awaria łącza **nie** oznacza już terenu w ten sposób — pętla zatrzymuje się i pisze, co się stało |
| **WMS: „Warstwa … nie istnieje”** | zła nazwa w `wms.layers` — wyciągnij ją z GetCapabilities (rozdz. 10) |
| **WMS: mapka z zupełnie innego miejsca** | usługa nie obsługuje wpisanego `crs` albo wersja protokołu nie zgadza się z rzeczywistą; sprawdź `<CRS>` w GetCapabilities |
| Zaznaczenie nie wchodzi na mapkę | mapka jest z cache'u — po zapisie zaznaczenia składa się od nowa sama; jeśli nie, skasuj `data/maps/*` i puść „Pobierz mapki” |
| Rewers trafia na złą kartę | zły `flip` — wydrukuj `print.php?test=1` i porównaj cyfry pod światło |
| Karty wychodzą za małe lub za duże | w oknie drukowania włączone „dopasuj do strony”; ustaw skalę 100 % i marginesy zerowe |
| Wykaz nie mieści się na rewersie | pojemność karty to `2 × back_rows` (domyślnie 28 pozycji); powyżej tego lista terenów pokazuje ostrzeżenie „wykaz się nie zmieści” — podziel teren albo skróć zapis adresów |

---

## 13. Pliki

| Plik | Zawartość |
|---|---|
| `config.php` | wszystkie ustawienia: baza, geokoder, kafle, geometria mapki, zaznaczenia |
| `lib.php` | baza, parsowanie list, geokodery, kafle, kształty, składanie mapki w GD |
| `api.php` | endpointy POST: geokodowanie, mapki, obrys ulic, zapis zaznaczenia |
| `map.php` | wydaje gotową mapkę jako JPEG (`plain=1` — wersja bez zaznaczenia, dla edytora) |
| `index.php` | ekran roboczy: import list, lista terenów, edytor zaznaczeń |
| `karta-terenu.php` | kafelek jednego terenu — jedyne miejsce, w którym powstaje jego HTML |
| `dane.php` | eksport i import masowy: szablon, bieżące dane, wgrywanie z podglądem |
| `xlsx.php` | zapis i odczyt .xlsx oraz CSV, bez bibliotek zewnętrznych |
| `app.js` | pętle krokowe z paskiem postępu, edytor zaznaczenia obszaru |
| `print.php` | arkusze awers/rewers plus arkusz kontrolny dupleksu |
| `styl.css` | interfejs i wydruk w jednym pliku |
| `sprawdz.php` | kontrola środowiska: lista „jest / brakuje” |
| `wms.php` | przeglądarka warstw usługi WMS z podglądem |
| `schema.mysql.sql` | schemat do ręcznego importu na MySQL/MariaDB |
| `windows/karty-terenu-windows.zip` | gotowa paczka dla Windowsa — w niej jest wszystko |
| `windows/zrodla/` | pliki, z których ta paczka jest składana (same nie działają) |
| `narzedzia/zbuduj-paczke.sh` | składanie paczek do pobrania |
| `narzedzia/sprawdz-paczke.sh` | kontrola, czy zacommitowana paczka odpowiada kodowi |
| `nginx/karty.conf` | gotowa konfiguracja nginx-a — własna domena |
| `nginx/karty-podkatalog.conf` | gotowa konfiguracja nginx-a — podkatalog |
| `WDROZENIE.md` | instalacja na serwerze z nginx-em krok po kroku |
| `przydzialy.php` | zestawienie przydziałów (S-13): stan terenów, dwa ostatnie przydziały, pełna historia, filtry |
| `raporty.php` | raporty przydziałów: liczby za okres, wykresy, kolejka do przydziału, głosiciele, NŻ |
| `nz.php` | lista NŻ: przegląd, filtry, dopisywanie i poprawki |
| `przydzialy-import.php` | import trzech list modułu: zestawienie terenów, NŻ, historia (także arkusz S-13) |
| `przydzialy-eksport.php` | druk S-13 (Word z szablonu, Excel, wydruk/PDF), lista wpisów, NŻ, raport, szablony list |
| `szablony/S-13_P.docx` | szablon druku S-13 — wypełnia go eksport do Worda |
| `przydzialy-api.php` | endpointy POST: przydział, opracowanie, poprawka, usunięcie, wpisy NŻ |
| `przydzialy-lib.php` | logika modułu: model zestawienia, reguły zapisu, importy, raporty, arkusze |
| `przydzialy-widok.php` | nagłówek modułu i wiersz terenu — jedyne miejsce, w którym powstaje jego HTML |
| `przydzialy.js` | okna przydziału i NŻ, rozwijanie historii, wykresy raportu (SVG, bez bibliotek) |
| `opis.md` | pierwotny opis zadania, na podstawie którego powstała aplikacja |
| `data/` | baza SQLite, kafle, gotowe mapki — poza repozytorium i poza WWW |

Struktura bazy (obie odmiany tak samo):

* `territory` — `id, nr, address, city, lat, lon, zoom, display, geo_src,
  pos, shape, shape_src, addr_extra, addr_notes, addr_key, points, color_edge`,
  unikat na `(address, city, addr_key)`; `addr_key` to dopisek adresu
  głównego (małe litery, bez zbędnych spacji) — jeden budynek bywa kilkoma
  terenami z różnymi zakresami lokali. Bazy ze starszej wersji (unikat na
  samym `(address, city)`) przechodzą na nowy unikat same przy pierwszym
  uruchomieniu; konto MySQL potrzebuje do tego prawa `ALTER`.
  `addr_extra` to dodatkowe adresy terenu (po jednym
  w wierszu), `addr_notes` — dopiski przy adresach (JSON, po jednym na adres),
  `points` — współrzędne wszystkich adresów, `lat`/`lon` to środek kadru,
  `color_edge` — przerywany obrys granicy koloru (`''` jak w `config.php`,
  `'1'` tak, `'0'` nie)
* `entry` — `id, territory_id, full_address, unit, entry_date, pos`,
  kasowanie kaskadowe
* `geo_cache` — `query, lat, lon, display, source, created`
* `assignment` — `id, territory_nr, person, assigned_on, completed_on, note,
  created_at, updated_at`; historia przydziałów, teren wskazany **numerem**
  (rozdział 14), `completed_on = NULL` — teren nadal u głosiciela
* `nz_address` — `id, territory_nr, street, address, nz_date, note,
  created_at, updated_at`; lista NŻ, też po numerze terenu
* `prior_completion` — `id, territory_nr, completed_on, source, created_at`;
  „Data ostatniego opracowania” z importowanego druku S-13 (opracowanie sprzed
  historii), unikalna para teren + data

---

## 14. Przydziały terenów — zestawienie S-13

Moduł prowadzi to, co dotąd siedziało w arkuszu „Zestawienie przydziałów
terenów”: kto ma który teren, od kiedy, kiedy go opracował — z pełną
historią, filtrami, raportami i wydrukiem w układzie druku S-13. Wchodzi się
na niego przyciskiem **„Przydziały terenów →”** na ekranie roboczym albo
wprost: `przydzialy.php`.

### 14.1. Jak to jest poukładane

```
 Zestawienie terenów ─┐    (Numer terenu | Adres — ta sama lista 1, z której drukuje generator kart)
                      ├──► kartoteka terenów (territory) ──┐
 Arkusz S-13 / lista ─┤                                    ├──► Zestawienie  ──► druk S-13: Word / Excel / PDF
   historii           └──► historia przydziałów ───────────┤    (przydzialy.php)  (szablon S-13_P.docx, 2 ostatnie)
                            (assignment)                   │                      Pełna historia — w przeglądarce
 Lista NŻ ────────────────► lista NŻ (nz_address) ─────────┴──► Raporty, wykresy, kolejka (raporty.php)
```

„Data ostatniego opracowania” z importowanego druku S-13 trafia do osobnej
tabeli `prior_completion` (numer terenu i data) — to opracowanie sprzed
historii, bez głosiciela i daty przydziału.

| Strona | Do czego |
|---|---|
| **Zestawienie** (`przydzialy.php`) | wiersz na teren: stan na dziś, dwa ostatnie przydziały, rozwijana pełna historia; przyciski „Przydziel”, „Opracowano”, poprawka wpisu; eksport druku S-13 do Worda, Excela i PDF |
| **Wpisy historii** (ten sam adres, `?widok=wpisy`) | wiersz na przydział — do przeglądania po nazwisku i datach, sortowanie po kolumnach |
| **Raporty** (`raporty.php`) | liczby za okres, dwa wykresy, kolejka do przydziału, tereny u głosicieli, głosiciele, NŻ do sprawdzenia, niespójności w danych |
| **Lista NŻ** (`nz.php`) | adresy, pod którymi nie życzą sobie odwiedzin — przegląd, filtry, dopisywanie |
| **Import** (`przydzialy-import.php`) | trzy listy wejściowe, zawsze z podglądem przed zapisem |

Eksport do Worda potrzebuje rozszerzenia PHP `dom` (ten sam pakiet `php-xml`
co `simplexml`); `sprawdz.php` ma na to osobny wiersz, razem z obecnością
szablonu druku. Nic poza tym nie trzeba instalować: tabele `assignment`, `nz_address`
i `prior_completion` powstają same
przy pierwszym wejściu (na MySQL-u bez prawa `CREATE` — import
`schema.mysql.sql`, rozdział 4.1). Działa na SQLite i na MySQL/MariaDB tak
samo; sprawdzone na MariaDB 10.11 w trybie `STRICT_TRANS_TABLES`.

### 14.2. Teren to numer — dlaczego

Historia przydziałów i lista NŻ wskazują teren **numerem**, a nie wewnętrznym
identyfikatorem karty. Powód jest praktyczny: import listy 1 w generatorze kart
kasuje tereny, których w niej nie ma, a poprawiony adres potrafi założyć teren
od nowa. Przy kluczu obcym z kasowaniem kaskadowym jedna pomyłka przy imporcie
zabrałaby całą historię przydziałów — a tej z papieru już się nie odtworzy.
Numer przeżywa jedno i drugie; w S-13 i tak to on jest tożsamością terenu.

Skutki, o których warto wiedzieć:

* teren usunięty z kartoteki **nie znika z zestawienia**, jeśli ma historię —
  zostaje z plakietką „spoza zestawienia”, a raport wymienia go w „Do sprawdzenia”;
* generator kart dopuszcza kilka kart o tym samym numerze (teren podzielony na
  dwie karty) — w zestawieniu to jeden wiersz, z nazwami połączonymi plusem;
* tereny **bez numeru** nie mają jak trafić do zestawienia; nad listą stoi
  wtedy informacja, ile ich jest. Numer nadaje import zestawienia;
* numery porównywane są bez wielkości liter: `12A` i `12a` to ten sam teren.

### 14.3. Trzy listy wejściowe

Każdą listę można **wkleić prosto z Excela** (zaznacz komórki, Ctrl+C, Ctrl+V
w pole — kolumny przyjdą rozdzielone tabulatorem) albo **wgrać jako plik**
`.xlsx` / `.csv`. Kolumny rozpoznawane są po nagłówku, bez wielkości liter
i polskich znaków, więc wolno je poprzestawiać. Bez nagłówka obowiązuje
kolejność podana niżej. Szablon każdej listy pobierzesz przyciskiem
„Szablon .xlsx”.

Po wczytaniu zawsze jest **podgląd**: ile przybędzie, co się zmieni, które
wiersze są błędne i dlaczego. Podgląd liczy ten sam kod, który potem zapisuje
(transakcja jest wykonywana i wycofywana), więc liczby w podglądzie to dokładnie
to, co pójdzie do bazy. Do bazy trafia dopiero po „Zapisz”.

**1. Zestawienie terenów** — `Numer terenu | Adres`

```
Numer terenu   Adres
1              Ujejskiego 2 (21) (1-21)
2              Ujejskiego 4 (22-45)
3              Cicha 1 + Kossaka 12
```

To jest **wspólna kartoteka z generatorem kart** — nowy teren pojawi się też
na ekranie roboczym i da się dla niego wydrukować kartę. Składnia adresu jak
w liście 1 (rozdział 7): nawiasy to dopisek na karcie (nie idzie do geokodera),
dwa budynki przez plus.

* teren rozpoznawany jest po numerze; **nic nie jest kasowane**,
* zmieniony adres przy tym samym numerze to poprawka — przy zaznaczonym
  „Popraw adresy…” teren dostaje nowy adres i wraca do kolejki „Przygotuj
  tereny” w generatorze kart (współrzędne i mapka od nowa; zaznaczenie
  poprawione ręcznie zostaje). Podgląd wypisuje każdą taką zmianę,
* adres z dopiskiem, który w kartotece ma już inny numer, jest odrzucany
  z komunikatem. Ten sam budynek z różnymi zakresami lokali w nawiasie —
  `Kisielewskiego 1 (1-40)`, `Kisielewskiego 1 (41-80)` — to osobne tereny
  (rozdział 7, „Jeden budynek na kilka terenów”).

**2. Lista NŻ** — `Nr terenu | Ulica | Adres | Data | Notatka`

```
Nr terenu   Ulica        Adres            Data         Notatka
1           Ujejskiego   Ujejskiego 2/5   12.03.2024   prosi o niepukanie
```

Domyślnie plik **zastępuje** całą listę (arkusz NŻ jest zwykle pełny);
„Dopisz nowe adresy” pomija wpisy identyczne co do terenu, ulicy i adresu.
Wiersz bez numeru terenu albo z numerem spoza zestawienia wchodzi, ale podgląd
o nim mówi. Data musi być z przeszłości.

**3. Historia przydziałów** — najprościej **wgraj arkusz S-13 z Excela**:
urzędowy druk S-13-P przepisany do Excela albo własne zestawienie w podobnym
układzie, np.:

```
           │                    │     Przydzielono      │     Przydzielono      │ …
 Teren nr  │ Nazwa terenu       ├───────────┬───────────┼───────────┬───────────┤
           │                    │ Data przydziału │ Data opracowania │ …
───────────┼────────────────────┼───────────────────────┼───────────────────────┤
     1     │ Ujejskiego 2 (21)  │     Jan Kowalski      │     Anna Nowak        │
           │ (1-21)             │ 01.09.2022│14.05.2023 │ 16.11.2023│           │
```

Układ rozpoznawany jest sam — po nagłówkach kolumn, nie po ich pozycji:

* **kolumny**: „Teren nr”, „Data ostatniego opracowania”, pary „Data przydziału”
  / „Data opracowania” (także „Data przydz.” / „Data oprac.”, „Data pobrania” /
  „Data zwrotu”, „Data przydzielenia”, „Data otrzymania”, „Przydzielono dnia” /
  „Opracowano dnia”, „Data opr.”, „Data powrotu”, „Koniec”, krótkie „od” / „do”
  pod „Przydzielono”, angielski druk „Date assigned” / „Date completed” /
  „Date returned”) i ewentualnie „Nazwa terenu”. Kolumna tuż za datą
  przydziału z innym nagłówkiem zaczynającym się od „Data” albo z samymi datami
  też jest datą opracowania; gdy pary nie ma z czym złożyć, podgląd mówi, że jej
  przydziały wejdą jako „w toku”. Tabela może
  zaczynać się w dowolnej kolumnie i wierszu, nad nią mogą stać tytuł, rok
  służbowy, zbór; nagłówek rozbity na kilka wierszy („Data” / „przydziału” po
  konwersji z PDF-u) i puste kolumny między parami nie przeszkadzają. Par może
  być dowolnie wiele, „Data ostatniego opracowania” może stać przed parami albo
  za nimi,
* **pomijane kolumny**: „Termin zwrotu” (data planowana, nie opracowanie)
  i uwagi obok pary. „Nr grupy” obok „Teren nr” ani ukryty „Stary nr” nie
  mylą numeru terenu. Kolumny ukryte w Excelu są czytane jak inne — ukryte
  stare pary dat to też historia,
* **kilka tabel obok siebie** na jednej zakładce (np. trzy kopie druku: tereny
  1–5, 6–10, 11–15) — każda para dat należy do „Teren nr” swojej tabeli,
* **jeden teren na zakładkę** — bez kolumny numeru, a numer w nazwie zakładki
  („5”, „Teren 5”) albo w tytule nad tabelą,
* **głosiciel** — w wierszu nad datami (scalony na parę albo w jednej z jej
  kratek), pod datami albo w osobnej kolumnie obok („Głosiciel | Data
  przydziału | Data opracowania” w jednym wierszu). Rozpoznawany po treści:
  data to data, tekst to nazwisko — także nazwisko podobne do miesiąca („Jan
  Maj”, „Lis”, „J. Marzec”); nazwa grupy („Grupa 2”) też jest nazwiskiem.
  Kratka z nazwiskiem scalona w pionie na kilka przydziałów daje to nazwisko
  każdemu z nich. Numer terenu może stać w górnym wierszu albo w wierszu dat
  (konwersja z PDF-u), nazwa terenu — w osobnej kolumnie, pod numerem albo
  razem z nim („1. Rynek”, „2 - Cicha”),
* **numer terenu**: `12`, `12A`, `3-1`, `7/2`, `T-5`, `S-13`; „Teren 5”,
  „Nr 5”, „5.” dają `5`. Dopisek „c.d.” („1 cd.”, „(cd. 3)”, samo „c.d.”)
  to dalszy ciąg terenu z wiersza wyżej, nie nowy teren. Stopka strony
  („Strona 1 z 2”, „Razem 20”) nie jest terenem,
* **daty**: prawdziwe daty Excela (wtedy `#####` w za wąskiej kolumnie niczemu
  nie przeszkadza; skoroszyty z Maca liczące od 1904 roku też) albo tekst:
  `01.09.2024`, `1.9.24`, `01.09.2024 r.`, `2024-09-01`, `01/09/2024`,
  `1 IX 2024`, `1 wrz 2024`, `1 września 2024`, z godziną lub bez (także ISO
  ze strefą `2024-09-01T00:00:00Z`). Sam miesiąc i rok — `09.2024`,
  `9/2024`, `2024-09`, `IX 2024`, `wrzesień 2024` — to 1. dzień miesiąca;
  opracowanie zapisane miesiącem przydziału dostaje dzień przydziału, a podgląd
  mówi, ile takich dat było. Obie daty w jednej kratce
  (`01.09.2024 - 15.12.2024`) to przydział i opracowanie. Data bez roku
  (`01.09`) dostaje rok z roku służbowego arkusza — z wiersza „Rok służbowy:
  2024/25”, z tytułu („Przydziały 2025/26”, „Rok 25/26”) albo z nazwy
  zakładki („2024-25”, „S-13 2024-25”, „2024-25 (2)”, „2025”):
  wrzesień–grudzień to 2024, styczeń–sierpień 2025; wpisy terenu idą
  chronologicznie, więc przydział na przełomie roku dostaje kolejny rok. Bez roku służbowego taka data trafia do „Pominięte”
  z prośbą o jego dopisanie. Pusta kratka opracowania, `-`, `—`, `x`, „w toku”,
  `#N/A` znaczą, że teren jest jeszcze u głosiciela. Same krzyżyki `#####`
  (data skopiowana z za wąskiej kolumny) trafiają do „Pominięte”,
* **wszystkie zakładki** skoroszytu z tabelą przydziałów wchodzą razem
  (zakładka na rok służbowy albo na każde 20 terenów); ukryte i te bez tabeli
  (strona tytułowa, zakładka „Tereny”) są pomijane, a podgląd o tym mówi. Ten
  sam przydział przepisany na kolejny arkusz wchodzi raz; gdy zakładki różnią
  się nazwiskiem albo datą opracowania, podgląd to wypisuje,
* **„Data ostatniego opracowania”** z druku zapisuje się przy terenie jako
  opracowanie sprzed historii — teren bez zapisanych przydziałów, ale
  opracowany, nie jest wtedy „nieprzydzielany”, tylko czeka od tej daty,
  a druk S-13 wpisze ją w swoją kolumnę. Zapisana bez roku należy do
  poprzedniego roku służbowego. W rozwiniętej historii terenu widać ją
  w kolejności dat jako „opracowany wcześniej” z przyciskiem ×. Data, która
  jest już opracowaniem z historii (kolejny arkusz roku służbowego ją
  powtarza), nie jest zapisywana drugi raz — bez względu na to, w jakiej
  kolejności wczytano arkusze. Data późniejsza niż przydział w toku trafia
  do „Do sprawdzenia w danych”,
* **podgląd** pokazuje odczyt pogrupowany po terenach: data ostatniego
  opracowania i przydziały „głosiciel — przydział → opracowanie”, każdy
  z własną zakładką i wierszem Excela. Kratka, której nie da się odczytać
  (`31.02.2025`, nazwisko bez daty przydziału, daty bez numeru terenu),
  trafia do „Pominięte” z numerem wiersza z Excela.

Rozpoznawana jest też płaska lista
`Nr terenu | Imię i nazwisko | Data przydziału | Data opracowania` — jeden
wiersz to jeden przydział.

* **„Dodaj brakujące tereny do zestawienia”** zakłada w kartotece tereny
  z arkusza (numer i nazwa) — także te bez ani jednego przydziału. Jeden plik
  przenosi więc i listę terenów, i całą historię,
* **„Dopisz, pomijając powtórzenia”** — wpis o tym samym terenie i dacie
  przydziału już w historii nie wchodzi drugi raz; ten sam plik można wgrać
  ponownie bez dublowania. Prowadzony arkusz S-13 wczytuj tak co jakiś czas:
  przydział, który był w toku, a w pliku ma już datę opracowania, dostaje ją
  (tak samo brakujące nazwisko) — podgląd liczy to jako „do uzupełnienia”.
  Inna data opracowania albo inne nazwisko niż w historii zostają, jak były,
  a podgląd wypisuje różnicę,
* **„Zastąp historię terenów obecnych w pliku”** — historia terenów z pliku
  jest kasowana i wstawiana od nowa; pozostałe tereny zostają nietknięte.
  Daty ostatniego opracowania plik zastępuje tylko tam, gdzie sam je podaje
  (arkusz S-13 z tą kolumną) — lista bez tej kolumny ich nie rusza. Podgląd
  i komunikat po zapisie mówią, ile wpisów i dat zniknie,
* wiersz z datą z przyszłości albo z opracowaniem przed przydziałem jest
  odrzucany z numerem wiersza; nakładające się okresy i przydział bez daty
  opracowania, po którym przyszedł kolejny, wchodzą, ale trafiają do „Do
  sprawdzenia w danych” w raporcie.

**Ujednolicenie nazwisk.** Podgląd historii wypisuje grupy nazwisk, które
wyglądają na tę samą osobę — z pliku i z historii zapisanej wcześniej —
z propozycją jednej pisowni: „Gr. 2 Abner Kurzymski”, „Kurzymski Abner”
i „Abner Kurzymski” → „Abner Kurzymski”; „Magda Nowak” → „Magdalena Nowak”;
różnica w ogonkach, tytuł („br.”), dopisek w nawiasie. Słabsze podobieństwa —
skrót imienia („Sława Kowalska” i „Sławomira Kowalska”), literówka, samo
nazwisko — są oznaczone „sprawdź” i domyślnie odznaczone. Różna płeć
(Kowalski / Kowalska, Jan / Janina) nigdy nie łączy, a inicjał pasujący do
dwóch osób („J. Lis” przy „Jan Lis” i „Józef Lis”) zostaje bez propozycji.
Pisownię można poprawić w polu obok; **„Zastosuj zaznaczone i odśwież
podgląd”** zmienia nazwiska w pliku i — przy zapisie — we wcześniejszych
wpisach historii, po czym podgląd liczy się od nowa. Bez kliknięcia nic się
nie zmienia.

„Zapisz” zapisuje dokładnie podgląd z ekranu. Gdy w międzyczasie w drugiej
karcie przeglądarki wczytano inny plik, starszy podgląd nie zostanie zapisany
— trzeba go wczytać jeszcze raz.

CSV zapisany przez polskiego Excela („CSV (rozdzielany przecinkami)”, kodowanie
Windows-1250) czyta się z polskimi znakami. Treść w wierszach dalszych niż
20000 jest pomijana z uwagą w podglądzie — przypadkowa kratka na dole arkusza
nie blokuje importu.

Dwa pliki z aplikacji wracają przez import bez przeróbek:

* **„Pobierz tę listę (.xlsx)”** w widoku „Wpisy historii” — cała historia
  po filtrach, jeden wiersz na wpis. To plik do poprawek w Excelu: wczytany
  w trybie „Zastąp” odtwarza historię 1:1, a daty ostatniego opracowania
  zostają;
* **druk S-13 w Excelu** (punkt 14.7) — tylko ostatnie przydziały terenów
  i bez nazw terenów (urzędowy druk ich nie ma). Wczytuj go z opcją
  „Dopisz”; przy „Zastąp” podgląd ostrzega, ile starszych wpisów by zniknęło.

### 14.4. Praca na co dzień

* **Przydziel** — przy wolnym terenie. Imię i nazwisko (pole podpowiada nazwiska
  z historii), data przydziału (domyślnie dziś), opcjonalnie notatka.
* **Opracowano** — przy terenie u głosiciela. Data opracowania (domyślnie dziś),
  a **teren zostaje u tego samego głosiciela**: przydział może zebrać dowolnie
  wiele dat opracowania. Każda kolejna to w historii osobna karta oznaczona
  „kolejne opracowanie” (ten sam głosiciel od poprzedniej daty) — tak samo jak
  kolejna para „Przydzielono:” z tym samym nazwiskiem w druku S-13.
* **Teren zdany** — głosiciel oddaje teren; przydział się kończy, teren wraca do
  puli wolnych. Data zdania jest datą opracowania (druk S-13 innej nie zna).
  Gdy teren był już wcześniej opracowany w tym przydziale, okno pyta, czy
  opracowano go ponownie: „Nie” zostawia jako ostatnie opracowanie poprzednią
  datę.
* **✎ przy wpisie** w rozwiniętej historii — poprawka nazwiska, dat i notatki
  albo usunięcie wpisu.
* **+ wpis z przeszłości** — dopisanie historycznego przydziału z obiema datami
  (np. z papierowej karty, której nie było w arkuszu).
* **+ kolejne opracowanie (ten sam głosiciel)** w oknie wpisu (dopisanie
  i poprawka) — kilka dat opracowania naraz, np. z papierowej karty, na której
  jeden głosiciel opracował teren trzy razy. Daty muszą rosnąć; puste ostatnie
  pole znaczy, że teren nadal jest u głosiciela. Zapisuje się wszystko albo nic.
* **Karty u głosiciela** — pole nad filtrami: wpisz imię lub nazwisko, a od razu
  widać, które tereny ma teraz ta osoba (od kiedy, ile dni, czy przetrzymany).
  „Pokaż w zestawieniu” zawęża listę do tych terenów, a „Drukuj te karty”
  otwiera wydruk generatora kart tylko z nimi (`print.php?ids=…`).

Zapis idzie bez przeładowania strony: serwer odsyła gotowy wiersz terenu
i nowe liczby na kafelkach. Reguły pilnowane są po stronie serwera, nie tylko
w formularzu:

* daty nie mogą być z przyszłości, opracowanie nie może być przed przydziałem,
* okresy przydziałów jednego terenu nie mogą się nakładać — teren nie może
  być u dwóch osób naraz. **Styk jest dozwolony**: oddany i wydany komuś
  innemu tego samego dnia to normalna sytuacja przy stoliku z terenami,
* komunikat o kolizji mówi, z którym wpisem (kto, od kiedy do kiedy).

Stan terenu liczony jest na dziś:

| Stan | Kiedy | Ustawienie |
|---|---|---|
| **U głosiciela** | ostatni przydział nie ma daty opracowania | — |
| **Przetrzymany** | jak wyżej, ale dłużej niż limit | `przydzial_limit_dni` (120) |
| **Wolny** | ostatni przydział opracowany | — |
| **Zaległy** | wolny dłużej niż próg od ostatniego opracowania | `przydzial_zaleglosc_dni` (365) |
| **Nieprzydzielany** | teren bez żadnego wpisu w historii | — |

### 14.5. Filtry

Jeden wiersz filtrów nad listą; filtry idą w adresie strony, więc widok można
zapisać w zakładkach, a przyciski eksportu niosą to, co akurat widać.

| Filtr | Jak działa |
|---|---|
| Nr terenu | `12`, lista `3, 7, 12a`, zakres `1-20` (zakres porównuje część liczbową, więc `12a` mieści się w `10-20`) |
| Adres / nazwa | fragment nazwy terenu |
| Głosiciel | fragment imienia lub nazwiska; bez wielkości liter i polskich znaków — `lukasz` znajdzie „Łukasz” |
| Data przydziału / opracowania | zakres od–do; każdy koniec można zostawić pusty |
| Stan terenu | wszystkie, u głosicieli, przetrzymane, wolne, zaległe i nieprzydzielane, nieprzydzielane |
| Karty u głosiciela (`ma=`) | tereny, które ta osoba ma teraz (przydział w toku) |

W widoku **Zestawienie** filtr głosiciela i dat wybiera **tereny**, w których
historii jest pasujący wpis; ich historia rozwija się sama, a pasujące wpisy są
podświetlone. W widoku **Wpisy historii** te same filtry wybierają pojedyncze
przydziały. Kafelki nad listą (wszystkie, u głosicieli, przetrzymane, wolne,
zaległe) to skróty do filtra stanu.

**Na telefonie** teren w zestawieniu i wpis historii to karty jedna pod drugą
(nic nie wystaje w bok), filtry są zwinięte pod przyciskiem „Filtry”, dopóki
żaden nie jest ustawiony, a nawigację modułu przesuwa się palcem.

### 14.6. Raporty

Okres wybiera się jednym wierszem nad całym raportem: gotowe zakresy (bieżący
i poprzedni **rok służbowy** — od miesiąca `rok_sluzbowy_od`, domyślnie
września — ostatnie 12 i 6 miesięcy, cała historia), lista **„Rok służbowy”**
z każdym rokiem, który ma historia, albo własne daty. Lat służbowych nie trzeba
nigdzie dodawać: liczą się same z dat — nowy rok pojawia się na listach
w swoim pierwszym miesiącu, a starsze, gdy historia po nie sięga.
Domyślnie ostatnie 12 miesięcy. Przydział liczy się do okresu po dacie
przydziału, opracowanie — po dacie opracowania. Kolejne opracowanie u tego
samego głosiciela liczy się jako opracowanie, ale nie jako nowy przydział.

* **Stan na dziś** — u głosicieli (w tym przetrzymane), wolne (w tym zaległe
  i nieprzydzielane), liczba terenów i adresów NŻ. Nie zależy od okresu.
* **W wybranym okresie** — przydziały, opracowania, **czas opracowania**
  (mediana i średnia, w dniach od przydziału do opracowania), **w terminie**
  (odsetek opracowań nie dłuższych niż `przydzial_limit_dni`), **pokrycie
  terenu** (ile terenów z zestawienia zostało opracowanych przynajmniej raz
  w okresie — przy roku służbowym to odpowiedź na pytanie „czy obeszliśmy cały
  teren”).
* **Wykres „Przydziały i opracowania”** — kolumny w kolejnych miesiącach (przy
  zakresie ponad 3 lata kwartałach, ponad 9 lat — latach). Najechanie pokazuje
  liczby, **kliknięcie kolumny otwiera listę przydziałów z tego miesiąca**.
* **Wykres „Ile trwa opracowanie”** — rozkład czasu opracowania; próg
  przetrzymania wypada na granicy przedziałów.
* **Do przydziału w pierwszej kolejności** — wolne tereny: najpierw
  nieprzydzielane, potem najdłużej czekające od ostatniego opracowania;
  przycisk „Przydziel” otwiera od razu okno przydziału.
* **U głosicieli** — najdłużej trzymane na górze, przetrzymane oznaczone.
* **Głosiciele w okresie** — przydziały, opracowania, średni czas, tereny
  posiadane teraz; nazwisko prowadzi do jego wpisów.
* **Lista NŻ** — liczba adresów i terenów, wpisy starsze niż `nz_odswiez_mies`
  miesięcy (albo bez daty) **do ponownego sprawdzenia**, wpisy bez terenu.
* **Do sprawdzenia w danych** — nakładające się okresy, przydziały bez daty
  opracowania, po których przyszedł kolejny, tereny z historią spoza
  zestawienia, tereny bez numeru.

Wykresy rysuje sam skrypt modułu (SVG), bez bibliotek z CDN-ów. Pod każdym
jest „Tabela z danymi” z tymi samymi liczbami — nic nie zależy od najechania
myszą. Na wydruku zostaje sam wykres; liczby co do sztuki niesie eksport
raportu do Excela.

### 14.7. Eksport — druk S-13 (Word, Excel, PDF)

Zestawienie eksportuje się **w układzie druku S-13-P** — wzorem jest plik
[`szablony/S-13_P.docx`](szablony/S-13_P.docx). Przed przyciskami są dwie
opcje:

* **„Rok służbowy”** — pierwsza pozycja to ostatnie przydziały każdego terenu
  z bieżącym rokiem w kratce „Rok służbowy:”; dalej każdy rok, który ma
  historia (lista rośnie sama). Wybrany rok drukuje arkusz tego roku: tylko
  przydziały, które w nim trwały, a „Data ostatniego opracowania” sprzed nich;
* **„z adresem”** — w kratce numeru stoi numer, a pod nim adres terenu.
  Kratka zabiera wtedy szerokość jednej pary „Przydzielono:”, więc druk
  pokazuje trzy najnowsze przydziały zamiast czterech. Domyślnie zaznaczone,
  gdy `s13_adres` w `config.php` jest `true`. Arkusz Excela z adresem wraca
  importem razem z nazwami terenów.

| Przycisk | Co powstaje |
|---|---|
| **Word (S-13)** | plik szablonu **wypełniony danymi** — ten sam dokument, tylko z wpisami |
| **Excel (S-13)** | `.xlsx` odwzorowujący druk: te same kolumny, szare tło nagłówka, krawędzie tej samej grubości, stopka strony |
| **PDF / druk** | arkusze A4 do druku — w oknie drukowania „Zapisz jako PDF” (marginesy: „Brak”, skala 100 %, bez „Nagłówków i stopek” przeglądarki — inaczej na kartce wyjdzie data i adres strony) |
| **Pobierz tę listę** w widoku wpisów | `.xlsx` z wpisami historii po filtrach |
| **Excel** na liście NŻ | `.xlsx` w układzie, który przyjmuje import |
| **Excel** w raporcie | `.xlsx` z zakładką na każdą sekcję raportu |
| **Drukuj / PDF** w raporcie | raport do druku, bez filtrów i przycisków, z kompletem wierszy |

Jak wypełniany jest druk:

* **arkusz = 20 terenów**, jak w szablonie; kolejne tereny idą na następne
  arkusze, a ostatni arkusz dopełniają puste wiersze — do wpisania ręcznie.
  Każdy arkusz ma tytuł, „Rok służbowy:”, przypis i oznaczenie
  „S-13-P 1/22” u dołu strony;
* **„Teren nr”** — numer z zestawienia, a z opcją „z adresem” także adres
  (drugą linią, krojem dobranym do szerokości kratki);
* **„Przydzielono:”** — **cztery ostatnie przydziały terenu** (nazwisko nad
  datą przydziału i opracowania), od lewej chronologicznie — arkusz jest pełny;
  z adresem trzy. Liczbę wpisanych przydziałów zmienia
  `przydzial_eksport_wpisy` (1–4); mniejsza zostawia pary wolne do wpisania
  długopisem. Teren wciąż u głosiciela ma pustą datę opracowania. Kolejne
  opracowania u tego samego głosiciela to kolejne pary z tym samym nazwiskiem.
  **Pełna historia jest w przeglądarce**;
* **„Data ostatniego opracowania\*”** — zgodnie z przypisem druku: data, kiedy
  teren opracowano ostatnio **przed** przydziałami wpisanymi na arkusz (czyli
  z wcześniejszej historii). Teren bez takiej historii ma tę kratkę pustą;
* w eksporcie **nie ma żadnych dopisków spoza druku** — ani daty wydruku,
  ani nazwy programu.

Wpisy dostają mniejszy krój niż 11-punktowe akapity szablonu (daty 9 pt,
nazwiska 6–9 pt, numer terenu 7–11 pt, rok 8–12 pt — dobierane do szerokości
kratki według metryk kroju Arial, z polskimi znakami i cyrylicą), a wiersze
danych mają stałą wysokość 14,5 pt. Dzięki temu arkusz z 20 terenami zostaje
na jednej stronie — także w LibreOffice, który składa ten szablon o włos wyżej
niż Word i bez przypiętej wysokości przenosił ostatni wiersz na drugą stronę.
Tekst zbyt długi nawet dla najmniejszego stopnia (nazwisko, numer terenu,
„Rok służbowy”) jest skracany wielokropkiem — w Wordzie i w wydruku; Excel
dostaje pełną wartość i sam zmniejsza ją do kratki, żeby powrotny import
arkusza nie zmieniał numerów ani nazwisk.

Szerokości kolumn arkusza Excela są przeliczone z szablonu w jednostkach
Excela (szerokość cyfry Ariala 10). LibreOffice Calc mierzy tę jednostkę
o ok. 6 % szerzej, więc przy wydruku sam dopasowuje arkusz do szerokości
strony — tabela ma wtedy właściwą szerokość, a pismo jest o tyle mniejsze.

Eksport respektuje filtry terenu (numer, adres, stan); filtr głosiciela i dat
wybiera tereny, ale w druku stoją zawsze ich ostatnie przydziały.

**Własny szablon.** Plik wskazuje `szablon_s13` w `config.php`. Można go
podmienić na inną wersję druku, o ile tabela zachowa budowę: wiersz nagłówka
z napisem „Data przydziału”, a pod nim pary wierszy — w górnym komórki
„Teren nr”, „Data ostatniego opracowania” i cztery kratki na nazwiska, w dolnym
osiem kratek na daty. Liczbę terenów na arkuszu wyznacza liczba par w szablonie.
Excel i wydruk do PDF odwzorowują układ tego, dostarczonego szablonu
(szerokości kolumn i krawędzie są przepisane z niego do kodu).

**Sprawdzone:** plik Worda przechodzi walidację schematu OOXML; Word, Excel
i wydruk do PDF zostały wyrenderowane (LibreOffice, Chromium) i porównane
z pustym szablonem — linie tabeli i położenie wpisów w wydruku z przeglądarki
zgadzają się z Wordem co do ok. 0,2 mm. W samym Wordzie i Excelu pliki nie
były otwierane.

**Dlaczego PDF przez okno drukowania.** Własny generator PDF z polskimi
znakami wymaga osadzania czcionek — czyli biblioteki, a aplikacja celowo żadnej
nie ma. „Zapisz jako PDF” w Chrome, Edge czy Firefoksie daje PDF z tekstem
(da się zaznaczać i wyszukiwać); arkusze same trzymają marginesy szablonu,
dlatego w oknie drukowania marginesy ustaw na „Brak”. Gdy potrzebny jest
plik w formacie Worda — przycisk **Word (S-13)**.

### 14.8. Ustawienia w `config.php`

| Klucz | Domyślnie | Znaczenie |
|---|---|---|
| `przydzial_limit_dni` | `120` | po tylu dniach teren u głosiciela jest „przetrzymany” |
| `przydzial_zaleglosc_dni` | `365` | po tylu dniach od opracowania wolny teren jest „zaległy” |
| `przydzial_eksport_wpisy` | `4` | ile ostatnich przydziałów wpisać do druku S-13 (1–4; druk ma cztery pary kolumn, z adresem trzy) |
| `s13_adres` | `false` | adres terenu pod numerem w druku S-13 — domyślny stan pola „z adresem” przy eksporcie |
| `szablon_s13` | `szablony/S-13_P.docx` | szablon druku S-13 — wypełnia go eksport do Worda, odwzorowują Excel i PDF |
| `nz_odswiez_mies` | `12` | wpis NŻ starszy niż tyle miesięcy — do ponownego sprawdzenia; `0` wyłącza |
| `rok_sluzbowy_od` | `9` | miesiąc początku roku służbowego (zakresy i lista lat w raporcie, „Rok służbowy” w druku); lata liczą się z dat same — nie trzeba ich dodawać |
| `strefa_czasowa` | `Europe/Warsaw` | strefa „dzisiejszej” daty — bez niej tuż po północy przydział zapisałby się z wczorajszą |

### 14.9. Bezpieczeństwo

* każda zmiana to POST z tokenem formularza; strony tylko do odczytu i eksport
  idą GET-em, tak jak w reszcie aplikacji,
* zapytania wyłącznie przez PDO z parametrami wiązanymi; nazwy kolumn i tabel
  pochodzą tylko z kodu,
* wszystko, co trafia na stronę, przechodzi przez `h()`; wiersz terenu składa
  PHP, a skrypt tylko podmienia gotowy węzeł; etykiety wykresów wstawiane są
  przez `textContent` — nazwisko w rodzaju `<img onerror=…>` jest po prostu
  tekstem (sprawdzone),
* wgrywany plik: `is_uploaded_file`, te same limity co w rozdziale 7b (12 MB,
  ochrona przed bombą zip, XML bez encji zewnętrznych); podgląd importu czeka
  w sesji, nie w ukrytym polu formularza,
* parametry adresu podane jako tablica (`?nr[]=…`) są ignorowane, a błąd
  serwera nie zdradza przeglądarce treści błędu SQL (ta idzie do logu PHP),
* `przydzialy-lib.php` i `przydzialy-widok.php` odmawiają uruchomienia wprost;
  blokady w `nginx/*.conf` i w routerze paczki windowsowej je obejmują,
* moduł, tak jak cała aplikacja, **nie ma logowania** — jeśli stoi w internecie,
  zamknij go na poziomie serwera (rozdział 3, „Ograniczenie dostępu”). Dane
  o tym, kto ma który teren, to dane osobowe.

### 14.10. Czego moduł (jeszcze) nie robi

* **Lista NŻ i wykaz na rewersie karty to dwa osobne zbiory.** Rewers karty
  drukuje się z listy 2 generatora (tabela `entry`), lista NŻ modułu ma więcej
  pól (ulica, notatka) i żyje w `nz_address`. Naturalny następny krok: przycisk
  „Przenieś NŻ na rewersy kart”, który zbuduje listę 2 z listy NŻ —
  do zrobienia, gdy ustalimy, jak w Twoich danych dzielą się kolumny „Ulica”
  i „Adres”.
* nie ma kont użytkowników ani dziennika zmian (kto i kiedy poprawił wpis) —
  przy jednym słudze terenu zwykle niepotrzebne; przy kilku osobach warto
  dodać kolumnę „zmienił” i logowanie na poziomie serwera,
* nazwisko jest zwykłym tekstem, bez osobnej kartoteki głosicieli — zmiana
  pisowni nazwiska w całej historii to dziś poprawka wpis po wpisie, import
  z ujednoliceniem nazwisk (punkt 14.3) albo „Pobierz tę listę” w widoku
  wpisów, poprawka w Excelu i import tego pliku w trybie „Zastąp”,
* import arkusza S-13 czyta Excela (`.xlsx`), CSV i tekst wklejony z Excela —
  nie skan ani PDF papierowego druku (PDF trzeba najpierw przekonwertować do
  Excela; typowe ślady takiej konwersji import rozumie). Data zapisana po
  amerykańsku (`09/15/2024`) jest rozpoznana tylko wtedy, gdy inaczej się nie
  da; `01/09/2024` to zawsze 1 września.

---

## Licencja

Kod: patrz [LICENSE](LICENSE). Dane map: © OpenStreetMap contributors
(ODbL) — oznaczenie źródła jest wypalane w rogu każdej mapki.
