import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/syncService';
import { NotificationService } from '../services/notificationService';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Server, Smartphone, Key, Lock, Shield, RefreshCw, 
  CheckCircle2, XCircle, HardDrive, Wifi, Info, Zap, 
  Copy, Check, ChevronDown, ChevronUp, Code, Bell, BellRing, Clock, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface SettingsTabProps {
  onRefresh: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [authMethod, setAuthMethod] = useState<'token' | 'basic' | 'none'>(settings.authMethod || 'token');
  const [serverToken, setServerToken] = useState(settings.serverToken || '');
  const [basicUser, setBasicUser] = useState(settings.basicUser || '');
  const [basicPass, setBasicPass] = useState(settings.basicPass || '');
  const [customHeader, setCustomHeader] = useState(settings.customHeader || 'X-App-Token');
  const [defaultCity, setDefaultCity] = useState(settings.defaultCity);
  const [mapSource, setMapSource] = useState(settings.mapSource);
  const [geoapifyKey, setGeoapifyKey] = useState(settings.geoapifyKey);

  // Push notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled ?? true);
  const [thresholdMonths, setThresholdMonths] = useState(settings.notificationThresholdMonths || 4);
  const [notifPermission, setNotifPermission] = useState<string>(NotificationService.getPermission());
  const [testNotifMessage, setTestNotifMessage] = useState<string | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; statusCode?: number } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Accordion for Nginx config guide
  const [showNginxGuide, setShowNginxGuide] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { isInstalled } = usePWAInstall();
  const queue = StorageService.getSyncQueue();

  useEffect(() => {
    setOverdueCount(NotificationService.getOverdueTerritories(thresholdMonths).length);
    setNotifPermission(NotificationService.getPermission());
  }, [thresholdMonths]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = StorageService.saveSettings({
      serverUrl: serverUrl.trim(),
      authMethod,
      serverToken: serverToken.trim(),
      basicUser: basicUser.trim(),
      basicPass: basicPass.trim(),
      customHeader: customHeader.trim() || 'X-App-Token',
      defaultCity: defaultCity.trim(),
      mapSource,
      geoapifyKey: geoapifyKey.trim(),
      notificationsEnabled,
      notificationThresholdMonths: thresholdMonths,
    });
    setSettings(updated);
    alert('Ustawienia i powiadomienia zostały trwale zapisane na telefonie!');
    onRefresh();
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await NotificationService.requestPermission();
      setNotifPermission(NotificationService.getPermission());
      if (granted) {
        setNotificationsEnabled(true);
        StorageService.saveSettings({ notificationsEnabled: true });
      } else {
        alert('Uprawnienia do powiadomień zostały odrzucone w przeglądarce telefonu. Zezwól na nie w ustawieniach witryny.');
      }
    } else {
      setNotificationsEnabled(false);
      StorageService.saveSettings({ notificationsEnabled: false });
    }
  };

  const handleSendTestNotification = async () => {
    setTestNotifMessage('Wysyłanie powiadomienia...');
    const ok = await NotificationService.sendTestNotification();
    setNotifPermission(NotificationService.getPermission());
    if (ok) {
      setTestNotifMessage('Powiadomienie zostało wysłane na Twój telefon!');
    } else {
      setTestNotifMessage('Nie udało się wysłać powiadomienia. Upewnij się, że zezwolono na powiadomienia w przeglądarce.');
    }
    setTimeout(() => setTestNotifMessage(null), 4000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const tempSettings = {
      serverUrl,
      authMethod,
      serverToken,
      basicUser,
      basicPass,
      customHeader: customHeader || 'X-App-Token',
    };
    const res = await SyncService.testConnection(serverUrl, tempSettings);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await SyncService.syncOutbox();
    setSyncMessage(res.message);
    setIsSyncing(false);
    onRefresh();
  };

  const nginxSnippet = `# Wklej to do /etc/nginx/sites-available/nextcloud.conf
# W sekcji WYJATKI Z BRAMKI TOTP (okolo linii 102):
map "$http_x_app_token|$request_uri" $totp_bypass_karty {
    default 0;
    "~^${serverToken || 'TWOJ_WYGENEROWANY_TOKEN'}\\|/karty/" 1;
}

# Wewnatrz location = /auth/check.php:
if ($totp_bypass_karty) { return 204; }
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(nginxSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 1. Android Installation Status & QR Code */}
      <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50/50 p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aplikacja na telefon: Karty Terenów</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {isInstalled 
                  ? 'Aplikacja zainstalowana w pamięci telefonu w trybie autonomicznym (PWA).'
                  : 'Zainstaluj aplikację na telefonie, aby uruchamiać ją z ikony i pracować offline.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PWAInstallButton />
          <a
            href="/KartyTerenow.apk"
            download="KartyTerenow.apk"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            <span>Pobierz plik KartyTerenow.apk</span>
          </a>
        </div>

        {/* ADB USB installation instruction */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-200 text-xs">
          <span className="text-slate-400 text-[11px] block mb-1">
            Instalacja na podłączonym telefonie przez wiersz poleceń (ADB):
          </span>
          <code className="text-emerald-400 font-mono text-[11px] block select-all">
            adb install KartyTerenow.apk
          </code>
        </div>

        {/* Quick QR code scanner for connected phone */}
        {!isInstalled && (
          <div className="mt-4 pt-4 border-t border-blue-200/60 flex flex-col sm:flex-row items-center gap-4 bg-white/70 p-3.5 rounded-xl">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs shrink-0">
              <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : 'https://amache-tech.uk/karty'} size={100} level="M" />
            </div>
            <div className="text-xs text-slate-700 text-center sm:text-left">
              <span className="font-bold text-slate-900 block mb-0.5">Zainstaluj na podłączonym telefonie:</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Skieruj aparat telefonu na ten kod QR. Po otwarciu strony w Chrome na telefonie kliknij <strong>„Zainstaluj na Androidzie”</strong> — aplikacja pojawi się w telefonie jako samodzielna apka.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. WEEKLY PUSH NOTIFICATIONS FOR OVERDUE TERRITORIES */}
      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs space-y-3.5">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white shadow-xs">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cotygodniowe powiadomienia Push</h3>
              <p className="text-xs text-slate-500">Przypomnienia o terenach z dawną datą opracowania</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={handleToggleNotifications}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Aplikacja raz w tygodniu wyśle powiadomienie push na Twój telefon z listą kart, które nie były opracowywane dłużej niż określony czas.
        </p>

        {/* Current status chip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">
              Wykryto przeterminowanych: <strong className="text-amber-800">{overdueCount} terenów</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Uprawnienia w telefonie:</span>
            {notifPermission === 'granted' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Zezwolono</span>
            ) : notifPermission === 'denied' ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">Zablokowane</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Wymaga zgody</span>
            )}
          </div>
        </div>

        {/* Threshold selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Uznaj teren za wymagający opracowania po:
          </label>
          <select
            value={thresholdMonths}
            onChange={e => setThresholdMonths(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
          >
            <option value={3}>3 miesiącach bez opracowania</option>
            <option value={4}>4 miesiącach (standard według druku S-13)</option>
            <option value={6}>6 miesiącach (pół roku)</option>
            <option value={12}>12 miesiącach (1 rok)</option>
          </select>
        </div>

        {/* Test Notification Button */}
        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestNotification}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>Wyślij powiadomienie testowe na telefon</span>
          </button>
        </div>

        {testNotifMessage && (
          <p className="text-xs text-blue-700 font-medium bg-blue-50 p-2.5 rounded-xl border border-blue-200">
            {testNotifMessage}
          </p>
        )}
      </div>

      {/* 3. Server Configuration */}
      <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="rounded-xl bg-slate-900 p-2 text-white">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Adres serwera hostingowego</h3>
            <p className="text-xs text-slate-500">
              Główny adres Twojej instancji Karty Terenów
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adres URL serwera:
          </label>
          <input
            type="text"
            required
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="https://amache-tech.uk/karty"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* --- NGINX GATE / AUTHENTICATION SECTION --- */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900">Autoryzacja bramki Nginx</h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Wybierz sposób, w jaki aplikacja ma trwale autoryzować się w Nginx (np. omijając bramkę hasła <code>htpasswd</code>):
          </p>

          {/* Auth Method Selector */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <button
              type="button"
              onClick={() => setAuthMethod('token')}
              className={`p-2.5 rounded-xl border text-left transition ${
                authMethod === 'token' 
                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/20' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>Stały Token (Bypass)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal block leading-tight">
                Nagłówek X-App-Token omijający bramkę w Nginx
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMethod('basic')}
              className={`p-2.5 rounded-xl border text-left transition ${
                authMethod === 'basic' 
                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/20' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Login i Hasło (htpasswd)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal block leading-tight">
                Zapamiętane w telefonie dane Basic Auth
              </span>
            </button>
          </div>

          {/* TOKEN METHOD INPUTS */}
          {authMethod === 'token' && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Twój stały token aplikacji (API Secret Key):
                </label>
                <input
                  type="text"
                  value={serverToken}
                  onChange={e => setServerToken(e.target.value)}
                  placeholder="Wpisz token wygenerowany przez openssl rand -hex 24"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Aplikacja wysyła ten token w nagłówku <code>X-App-Token</code> omijającym bramkę TOTP.
                </span>
              </div>

              {/* Nginx configuration guide trigger */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowNginxGuide(!showNginxGuide)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showNginxGuide ? 'Ukryj fragment Nginx' : 'Pokaż fragment do wklejenia w nextcloud.conf'}</span>
                  {showNginxGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showNginxGuide && (
                  <div className="mt-2.5 rounded-xl bg-slate-900 p-3 text-slate-200 text-xs font-mono relative">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet ? 'Skopiowano!' : 'Kopiuj'}</span>
                    </button>
                    <pre className="overflow-x-auto whitespace-pre-wrap pr-16 text-[11px] leading-relaxed">
                      {nginxSnippet}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BASIC AUTH METHOD INPUTS */}
          {authMethod === 'basic' && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <p className="text-[11px] text-slate-600">
                Wpisz dane logowania z pliku <code>.htpasswd-karty</code>. Telefon zapamięta je w zaszyfrowanej pamięci i prześle w nagłówku <code>Authorization: Basic</code> bez pytania o hasło.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Login (użytkownik):</label>
                  <input
                    type="text"
                    value={basicUser}
                    onChange={e => setBasicUser(e.target.value)}
                    placeholder="np. slugaterenu"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hasło:</label>
                  <input
                    type="password"
                    value={basicPass}
                    onChange={e => setBasicPass(e.target.value)}
                    placeholder="Wpisz hasło htpasswd"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Connection Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
          >
            <Wifi className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-blue-600' : ''}`} />
            <span>{isTesting ? 'Sprawdzanie bramki...' : 'Testuj połączenie i autoryzację'}</span>
          </button>

          {testResult && (
            <div className={`mt-2.5 rounded-xl p-3 text-xs flex items-start gap-2 ${
              testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latencyMs && <p className="text-[10px] opacity-80 mt-0.5">Opóźnienie: {testResult.latencyMs} ms</p>}
              </div>
            </div>
          )}
        </div>

        {/* 4. Sync & Local-First Mode */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Zapis z poziomu telefonu (Offline First)</h4>
              <p className="text-[11px] text-slate-500">
                Wszystkie akcje w terenie zapisują się natychmiast w pamięci telefonu.
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
              <Zap className="w-3 h-3" /> Aktywny
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-600 block">
                Kolejka zmian telefonu: <strong>{queue.length}</strong>
              </span>
              <span className="text-[10px] text-slate-400">
                Ostatnia synchronizacja: {settings.lastSync ? new Date(settings.lastSync).toLocaleString('pl-PL') : 'Brak danych'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizuję...' : 'Synchronizuj'}</span>
            </button>
          </div>

          {syncMessage && (
            <p className="mt-2 text-xs text-blue-700 font-medium px-1">
              {syncMessage}
            </p>
          )}
        </div>

        {/* 5. Geography and Map Defaults */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-900">Podkłady map i geokoder</h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Domyślna miejscowość:
            </label>
            <input
              type="text"
              value={defaultCity}
              onChange={e => setDefaultCity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dostawca kafelków mapy:
            </label>
            <select
              value={mapSource}
              onChange={e => setMapSource(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs bg-white"
            >
              <option value="osm">OpenStreetMap (Darmowe kafle publiczne z cache na telefonie)</option>
              <option value="geoapify">Geoapify (Wymaga własnego klucza API z config.php)</option>
              <option value="wms">GUGiK Geoportal (WMS ortofotomapa / topo)</option>
            </select>
          </div>

          {mapSource === 'geoapify' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Klucz Geoapify API:
              </label>
              <input
                type="text"
                value={geoapifyKey}
                onChange={e => setGeoapifyKey(e.target.value)}
                placeholder="Wklej klucz Geoapify"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-98 transition"
        >
          Zapisz ustawienia i powiadomienia na telefonie
        </button>
      </form>

      {/* Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Aplikacja <strong>Karty Terenów</strong> działa jako autonomiczny klient offline. Cotygodniowe powiadomienia pomagają pamiętać o rewirach, które dawno nie były odwiedzane.
        </p>
      </div>
    </div>
  );
};
