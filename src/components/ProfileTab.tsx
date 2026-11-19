import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { LogOut, ThumbsUp, MessageCircle, ShieldCheck, Mail } from 'lucide-react';
import { IMAGES } from '../data/dhammaData';
import { ResilientImage } from './ResilientImage';

interface ProfileTabProps {
  user: User | null;
  isAdmin: boolean;
  authLoading: boolean;
  userReactionCount: number;
  userCommentCount: number;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  isAdmin,
  authLoading,
  userReactionCount,
  userCommentCount,
  onSignIn,
  onSignOut,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);

    try {
      await onSignIn();
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      const msg = err instanceof Error ? err.message : String(err || '');
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        /cancel|user_cancelled/i.test(msg)
      ) {
        setAuthError('အကောင့်ရွေးချယ်မှုကို ပိတ်လိုက်ပါသည်။ လိုအပ်ပါက ထပ်မံကြိုးစားနိုင်ပါသည်။');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Browser မှ Popup ကို ပိတ်ထားပါသဖြင့် ခွင့်ပြုပြီး ထပ်မံနှိပ်ပေးပါ။');
      } else if (/28444|developer console/i.test(msg)) {
        setAuthError(
          'Google Cloud Console တွင် Android OAuth (Package: com.yaechanoh.kyaungtike နှင့် APK SHA-1) ချိတ်ဆက်ရန် လိုအပ်နေပါသည်။'
        );
      } else if (/network/i.test(msg) || code === 'auth/network-request-failed') {
        setAuthError('အင်တာနက်ချိတ်ဆက်မှု မရှိပါသဖြင့် ကွန်ရက်စစ်ဆေးပြီး ထပ်မံကြိုးစားပေးပါ။');
      } else {
        setAuthError('Google အကောင့်ဖြင့် ဝင်ရောက်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။ ထပ်မံကြိုးစားပေးပါ။');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Sanctuary Header Card */}
      <div className="bg-white rounded-3xl border border-[#3D140F]/10 shadow-sm overflow-hidden">
        <div className="relative h-36 sm:h-44 w-full bg-[#3D140F]">
          <ResilientImage
            src={IMAGES.pagodaDusk}
            alt="ရေချမ်းအိုးကျောင်းတိုက်"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3D140F] via-[#3D140F]/40 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 text-[#FAF6EE]">
            <p className="text-xs text-[#F3E5AB]">ဓမ္မမိတ်ဆွေ ကိုယ်ရေးအချက်အလက်</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              ရေချမ်းအိုးကျောင်းတိုက် အဖွဲ့ဝင်
            </h2>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {authLoading ? (
            <div className="py-10 text-center text-sm text-[#6B4F47]">
              အကောင့်အခြေအနေ စစ်ဆေးနေပါသည်...
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* Signed-In User Info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Devotee Avatar'}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#3D140F] text-[#F3E5AB] flex items-center justify-center text-2xl font-bold border-2 border-[#D4AF37] shrink-0">
                    {(user.displayName || user.email || 'D').slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-[#3D140F] truncate">
                      {user.displayName || 'ဓမ္မမိတ်ဆွေ'}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-[#8C6810] shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#5C4038] truncate">
                    <Mail className="w-4 h-4 text-[#8C6810] shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {isAdmin && (
                    <p className="text-xs font-semibold text-[#8C6810] pt-0.5">
                      ကျောင်းတိုက် စီမံခန့်ခွဲသူ (Admin Privileges Active)
                    </p>
                  )}
                </div>
              </div>

              {/* Contribution Counters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#3D140F]/10">
                  <div className="flex items-center gap-2 text-xs text-[#6B4F47] mb-1">
                    <ThumbsUp className="w-4 h-4 text-[#8C6810]" />
                    <span>သာဓုခေါ်ဆိုမှုများ</span>
                  </div>
                  <p className="text-2xl font-bold text-[#3D140F] tabular-nums">
                    {userReactionCount}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#3D140F]/10">
                  <div className="flex items-center gap-2 text-xs text-[#6B4F47] mb-1">
                    <MessageCircle className="w-4 h-4 text-[#8C6810]" />
                    <span>ဓမ္မမှတ်ချက်များ</span>
                  </div>
                  <p className="text-2xl font-bold text-[#3D140F] tabular-nums">
                    {userCommentCount}
                  </p>
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="pt-2 border-t border-[#3D140F]/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#3D140F]/20 text-sm font-medium text-[#3D140F] hover:bg-[#FAF6EE] transition-colors min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>အကောင့်မှ ထွက်ရန် (Sign Out)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg sm:text-xl font-bold text-[#3D140F]">
                  Google အကောင့်ဖြင့် ချိတ်ဆက်ပါ
                </h3>
                <p className="text-sm text-[#5C4038] leading-relaxed">
                  ကျောင်းတိုက်သတင်းများတွင် သာဓုခေါ်ဆိုခြင်း (Good / Love) နှင့် ဓမ္မမှတ်ချက်များ ရေးသားနိုင်ရန် သင်၏ Gmail အကောင့်ကို ရွေးချယ်ဝင်ရောက်ပါ။
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-2xl bg-[#7A1C1C]/10 border border-[#7A1C1C]/25 text-xs sm:text-sm text-[#7A1C1C] max-w-md mx-auto">
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={signingIn}
                className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-[#3D140F] text-[#FAF6EE] hover:bg-[#541D16] transition-all shadow-sm active:scale-[0.98] min-h-[48px] text-sm sm:text-base font-medium cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
                <span>
                  {signingIn ? 'ဝင်ရောက်နေပါသည်...' : 'Google ဖြင့် ဝင်ရောက်ရန် (Sign in with Google)'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
