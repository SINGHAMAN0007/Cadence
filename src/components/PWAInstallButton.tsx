import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside an installed PWA / APK, hide the install button
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 h-[32px] min-h-[32px] rounded-full bg-neutral-900/80 hover:bg-neutral-800 active:scale-95 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-800 shadow-sm backdrop-blur-md transition-all shrink-0 cursor-pointer"
        title="Install Android App"
      >
        <Smartphone size={13} className="text-neutral-400" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors shrink-0 min-h-[36px]"
        >
          <Smartphone size={14} />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-[#0a0a0a] border border-white/10 p-5 shadow-2xl text-zinc-100">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-white">Install on Mobile</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the browser toolbar.<br />
                2. Scroll down and choose <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
