import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'header'
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#1E1E1E] hover:bg-[#E5C153] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[38px] cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#1E1E1E] hover:bg-[#E5C153] text-sm font-semibold transition-colors min-h-[44px] cursor-pointer'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>App ထည့်သွင်းရန်</span>
      </button>
    );
  }

  if (variant === 'header' && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className={
          variant === 'header'
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-[#F3E5AB] hover:bg-white/15 border border-[#D4AF37]/40 text-xs font-medium whitespace-nowrap shrink-0 transition-colors min-h-[38px] cursor-pointer'
            : 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3D140F] text-[#F3E5AB] hover:bg-[#541D16] text-sm font-medium transition-colors min-h-[44px] cursor-pointer'
        }
      >
        <Smartphone className="w-4 h-4 text-[#D4AF37] shrink-0" />
        <span>
          {isIOS ? 'iPhone တွင် ထည့်သွင်းရန်' : 'ဖုန်းပေါ်တွင် App ထည့်သွင်းနည်း'}
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile App Install Guide"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EE] text-[#2A1815] border border-[#D4AF37]/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[#3D140F]">
                {isIOS
                  ? 'iPhone / iPad တွင် App ထည့်သွင်းရန်'
                  : 'Android ဖုန်းတွင် App ထည့်သွင်းရန်'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="ပိတ်ရန်"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-[#422D28] leading-relaxed list-decimal list-inside">
                <li>
                  <strong>Safari</strong> ဘရောက်ဆာဖြင့် App လင့်ခ်ကို တိုက်ရိုက်ဖွင့်ပါ။
                </li>
                <li>
                  အောက်ခြေရှိ <strong>Share</strong> ခလုတ် (အပေါ်မြားပုံ) ကို နှိပ်ပါ။
                </li>
                <li>
                  အောက်သို့ဆွဲချ၍ <strong>Add to Home Screen</strong> ကို ရွေးပါ။
                </li>
                <li>
                  ညာဘက်အပေါ်ရှိ <strong>Add</strong> ကို နှိပ်၍ ဖုန်းမျက်နှာပြင်တွင် ထည့်သွင်းပါ။
                </li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm text-[#422D28] leading-relaxed list-decimal list-inside">
                <li>
                  App လင့်ခ်ကို Messenger/Facebook အတွင်းမှ မဖွင့်ဘဲ{' '}
                  <strong>Google Chrome</strong> ဖြင့် တိုက်ရိုက်ဖွင့်ပါ။
                </li>
                <li>
                  ညာဘက်အပေါ်ထောင့်ရှိ <strong>⋮ (အစက် ၃ စက်)</strong> ခလုတ်ကို နှိပ်ပါ။
                </li>
                <li>
                  <strong>Install app</strong> (သို့မဟုတ်){' '}
                  <strong>Add to Home screen</strong> ကို နှိပ်ပါ။
                </li>
                <li>
                  ပေါ်လာသော <strong>Install</strong> ခလုတ်ကို နှိပ်လိုက်ပါက ဖုန်းပေါ်တွင် App အဖြစ် ရောက်ရှိပါမည်။
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium hover:bg-[#541D16] cursor-pointer"
            >
              နားလည်ပါပြီ
            </button>
          </div>
        </div>
      )}
    </>
  );
};
