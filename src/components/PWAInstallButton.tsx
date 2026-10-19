import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle, Smartphone, X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // App URL for the phone to access
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://amache-tech.uk/karty';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>Zainstalowano na telefonie</span>
      </div>
    );
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          className={`flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium shadow-md shadow-blue-500/20 transition-all ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Zainstaluj na Androidzie</span>
        </button>
      ) : (
        <button
          onClick={() => setShowGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-all ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Zainstaluj na telefonie</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl relative text-left max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Zainstaluj na telefonie
                </h3>
                <p className="text-xs text-slate-500">Android (Samsung, Xiaomi, Pixel itd.)</p>
              </div>
            </div>

            {/* QR Code section */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 text-center">
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                <QRCodeSVG value={currentUrl} size={160} level="M" />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-800">
                Skieruj aparat telefonu na powyższy kod QR
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Aparat automatycznie rozpozna link i otworzy stronę w przeglądarce Chrome.
              </p>
            </div>

            {/* Steps on phone */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-slate-700 space-y-2 mb-4">
              <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>Jak zainstalować po otwarciu na telefonie:</span>
              </div>
              <p>
                <strong>Krok 1:</strong> Po otwarciu strony na telefonie kliknij niebieski przycisk <strong>„Zainstaluj na Androidzie”</strong> na górze ekranu.
              </p>
              <p>
                <strong>Krok 2:</strong> (Alternatywnie w Chrome): Dotknij menu z trzema kropkami <strong>⋮</strong> w prawym górnym rogu i wybierz <strong>„Zainstaluj aplikację”</strong> (lub <em>„Dodaj do ekranu głównego”</em>).
              </p>
              <p className="text-emerald-800 font-semibold pt-1">
                ✓ Aplikacja zainstaluje się na telefonie z własną ikoną w menu aplikacji, działa w 100% pełnoekranowo i zapisuje wszystkie dane offline w pamięci telefonu!
              </p>
            </div>

            {/* Download APK Section */}
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Download className="w-4 h-4 text-emerald-700" />
                  Spakowany plik APK (Gotowy do pobrania):
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  240 KB
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Możesz pobrać plik APK bezpośrednio z repozytorium i zainstalować przez kabel USB.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="/KartyTerenow.apk"
                  download="KartyTerenow.apk"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 text-xs shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pobierz KartyTerenow.apk</span>
                </a>
              </div>
              <div className="pt-1.5 border-t border-emerald-200/80">
                <span className="text-[10px] text-emerald-900 font-semibold block mb-1">
                  Instalacja na podłączonym telefonie przez ADB:
                </span>
                <code className="block bg-emerald-950 text-emerald-300 p-2 rounded-lg text-[11px] font-mono select-all">
                  adb install KartyTerenow.apk
                </code>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800"
            >
              Zamknij okno
            </button>
          </div>
        </div>
      )}
    </>
  );
};
