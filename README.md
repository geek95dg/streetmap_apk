# Karty Terenów (Android / PWA)

Mobilna aplikacja na telefon z systemem Android przeznaczona do obsługi kart terenu według druku **S-12-P 6/72** oraz zestawienia przydziałów **S-13**.

## Główne cechy

1. **Nazwa i manifest PWA**:
   - Pełna nazwa: **Karty Terenów** (short_name: **KartyTerenów**).
   - Zgodność z PWABuilder, Chrome WebAPK i instalacją na Androidzie.
2. **Cotygodniowe powiadomienia Push o dawnych opracowaniach**:
   - Aplikacja automatycznie raz w tygodniu sprawdza kartotekę i wysyła powiadomienie push na telefon, jeśli tereny nie były opracowywane od dłuższego czasu (np. > 4 miesięcy).
   - W zakładce **Serwer / Ustawienia** można testować powiadomienie jednym kliknięciem oraz dostosować próg czasowy.
3. **Praca bezpośrednio z telefonu (Offline First)**:
   - Wszystkie tereny, wykazy lokali, przydziały głosicielom oraz lista NŻ zapisują się natychmiast w lokalnej pamięci podręcznej telefonu (IndexedDB / LocalStorage).
   - Pełna funkcjonalność w terenie nawet bez dostępu do sieci internetowej.
4. **Łączność z serwerem hostującym (Nginx / TOTP bypass)**:
   - W zakładce **Serwer** można skonfigurować adres URL Twojego serwera (np. `https://amache-tech.uk/karty`), stały token bypassu Nginx (`X-App-Token`) oraz przetestować połączenie.
   - Bufor zmian lokalnych (Outbox): akcje wykonane w terenie czekają w kolejce i synchronizują się z serwerem po naciśnięciu „Synchronizuj”.
5. **Karty terenu (S-12-P)**:
   - Podgląd awersu z mapą i zaznaczonym obszarem (Leaflet / OSM / Geoapify / GUGiK Geoportal).
   - Podgląd rewersu z wykazem lokali i datami.
   - Nawigacja jednym dotknięciem w Google Maps.
   - Geokodowanie adresów przez PRG GUGiK i OpenStreetMap.
6. **Zestawienie przydziałów (S-13)**:
   - Przydzielanie terenu głosicielom bezpośrednio z telefonu.
   - Zaznaczanie „Opracowano” oraz „Zdaj teren”.
   - Wskaźniki KPI (Wolne, Przydzielone, Przetrzymane > 4 miesiące).
7. **Lista NŻ (Nie życzą sobie)**:
   - Dodawanie i podgląd adresów NŻ powiązanych z terenami.
8. **Instalacja jako aplikacja na telefonie**:
   - PWA (Progressive Web App): wystarczy kliknąć przycisk **„Zainstaluj na Androidzie”** lub zeskanować kod QR telefonem.
