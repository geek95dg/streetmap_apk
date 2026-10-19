# Karty Terenu Mobile (Android / PWA)

Mobilna aplikacja na telefon z systemem Android przeznaczona do obsługi kart terenu według druku **S-12-P 6/72** oraz zestawienia przydziałów **S-13**.

## Główne cechy

1. **Praca bezpośrednio z telefonu (Offline First)**:
   - Wszystkie tereny, wykazy lokali, przydziały głosicielom oraz lista NŻ zapisują się natychmiast w lokalnej pamięci podręcznej telefonu (IndexedDB / LocalStorage).
   - Pełna funkcjonalność w terenie nawet bez dostępu do sieci internetowej.
2. **Łączność z serwerem hostującym**:
   - W zakładce **Serwer** można skonfigurować adres URL Twojego serwera (np. `https://karty.twojadomena.pl`), opcjonalny token oraz przetestować połączenie.
   - Bufor zmian lokalnych (Outbox): akcje wykonane w terenie czekają w kolejce i synchronizują się z serwerem po naciśnięciu „Synchronizuj”.
3. **Karty terenu (S-12-P)**:
   - Podgląd awersu z mapą i zaznaczonym obszarem (Leaflet / OSM / Geoapify / GUGiK Geoportal).
   - Podgląd rewersu z wykazem lokali i datami.
   - Nawigacja jednym dotknięciem w Google Maps.
   - Geokodowanie adresów przez PRG GUGiK i OpenStreetMap.
4. **Zestawienie przydziałów (S-13)**:
   - Przydzielanie terenu głosicielom bezpośrednio z telefonu.
   - Zaznaczanie „Opracowano” oraz „Zdaj teren”.
   - Wskaźniki KPI (Wolne, Przydzielone, Przetrzymane > 4 miesiące).
5. **Lista NŻ (Nie życzą sobie)**:
   - Dodawanie i podgląd adresów NŻ powiązanych z terenami.
6. **Instalacja jako aplikacja na telefonie**:
   - PWA (Progressive Web App): wystarczy kliknąć przycisk **„Zainstaluj na Androidzie”** lub w menu Chrome wybrać **„Zainstaluj aplikację / Dodaj do ekranu głównego”**, aby mieć pełnoekranową aplikację z ikoną na pulpicie.
