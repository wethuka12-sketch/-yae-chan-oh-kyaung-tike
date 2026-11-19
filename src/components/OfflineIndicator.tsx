import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC<{ hasStickyAudio?: boolean }> = ({
  hasStickyAudio = false,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={`fixed left-4 z-40 inline-flex items-center gap-2 rounded-xl bg-[#3D140F] border border-[#D4AF37]/60 px-3.5 py-2 text-xs font-medium text-[#F3E5AB] shadow-lg ${
        hasStickyAudio ? 'bottom-36 lg:bottom-24' : 'bottom-20 lg:bottom-6'
      }`}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
      <span>အင်တာနက်မရှိပါ — Offline စနစ်ဖြင့် အသုံးပြုနေသည်</span>
    </div>
  );
};
