import React, { useState } from 'react';
import { Play, Pause, Volume2, Headphones, Plus, Pencil, Trash2 } from 'lucide-react';
import type { AudioTalk } from '../data/dhammaData';
import { formatTimeSec } from '../lib/mediaSynthesizer';
import { ResilientImage } from './ResilientImage';

interface AudioPlayerTabProps {
  talks: AudioTalk[];
  isAdmin: boolean;
  currentTrack: AudioTalk | null;
  isPlaying: boolean;
  onSelectTrack: (track: AudioTalk) => void;
  onAdminAddAudio: () => void;
  onAdminEditAudio: (talk: AudioTalk) => void;
  onAdminDeleteAudio: (talk: AudioTalk) => Promise<void>;
}

const CATEGORIES = [
  'အားလုံး',
  'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ',
  'ပရိတ်တော်',
  'သုတ္တန်',
] as const;

export const AudioPlayerTab: React.FC<AudioPlayerTabProps> = ({
  talks,
  isAdmin,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onAdminAddAudio,
  onAdminEditAudio,
  onAdminDeleteAudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('အားလုံး');

  const filteredTalks =
    selectedCategory === 'အားလုံး'
      ? talks
      : talks.filter((talk) => talk.category === selectedCategory);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-[#3D140F] text-[#FAF6EE] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/25 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[#F3E5AB]">
              <Headphones className="w-4 h-4 text-[#D4AF37]" />
              <span>အသံသွင်း ဓမ္မဒေသနာတော်များ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              MP3 တရားတော်များ
            </h2>
            <p className="text-sm text-[#FAF6EE]/85 max-w-2xl leading-relaxed">
              တရားတော်တစ်ပုဒ်ကို ရွေးချယ်၍ အောက်ခြေရှိ အသံဖွင့်စက်ဖြင့် အေးချမ်းစွာ နာယူနိုင်ပါသည်။
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {currentTrack && (
              <div className="bg-[#1E1E1E] border border-[#D4AF37]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-[#D4AF37]" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#D4AF37]">လက်ရှိနာယူနေသော တရား</p>
                  <p className="text-xs font-medium text-white truncate max-w-[200px]">
                    {currentTrack.title}
                  </p>
                </div>
              </div>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={onAdminAddAudio}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] text-[#1E1E1E] text-sm font-semibold hover:bg-[#E5C153] min-h-[44px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>MP3 တရားအသစ်ထည့်ရန်</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Segmented Controls */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#EFE7D8] rounded-2xl overflow-x-auto smooth-scroll-container">
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 min-h-[44px] transition-all cursor-pointer ${
                active
                  ? 'bg-[#3D140F] text-[#F3E5AB] shadow-sm'
                  : 'text-[#4F3731] hover:text-[#3D140F]'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Audio Talks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTalks.map((talk, index) => {
          const isCurrent = currentTrack?.id === talk.id;
          const isTrackPlaying = isCurrent && isPlaying;

          return (
            <div
              key={talk.id}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                isCurrent
                  ? 'bg-[#1E1E1E] text-[#FAF6EE] border-[#D4AF37]/50 shadow-md'
                  : 'bg-white text-[#2A1815] border-[#3D140F]/10 hover:border-[#D4AF37]/50 shadow-sm'
              }`}
            >
              <div className="p-4 sm:p-5 flex items-start gap-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-[#3D140F]">
                  <ResilientImage
                    src={talk.coverImage}
                    alt={talk.title}
                    className="w-full h-full object-cover"
                    fallbackTitle={talk.category}
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white tabular-nums">
                      0{index + 1}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div
                    className={`flex flex-wrap items-center gap-x-2 text-xs ${
                      isCurrent ? 'text-[#D4AF37]' : 'text-[#8C6810]'
                    }`}
                  >
                    <span className="font-medium">{talk.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatTimeSec(talk.durationSec)}</span>
                  </div>

                  <h3
                    className={`text-base sm:text-lg font-bold leading-snug ${
                      isCurrent ? 'text-white' : 'text-[#3D140F]'
                    }`}
                  >
                    {talk.title}
                  </h3>

                  <p
                    className={`text-xs ${
                      isCurrent ? 'text-[#FAF6EE]/75' : 'text-[#6B4F47]'
                    }`}
                  >
                    {talk.speaker}
                  </p>

                  <p
                    className={`text-xs sm:text-sm leading-relaxed line-clamp-2 ${
                      isCurrent ? 'text-[#FAF6EE]/80' : 'text-[#5C4038]'
                    }`}
                  >
                    {talk.description}
                  </p>

                  {isAdmin && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAdminEditAudio(talk)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          isCurrent
                            ? 'bg-white/10 text-[#F3E5AB] hover:bg-white/20'
                            : 'bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/15 hover:border-[#D4AF37]'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>ပြင်ဆင်</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onAdminDeleteAudio(talk)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          isCurrent
                            ? 'bg-[#7A1C1C] text-[#FFD6D6] hover:bg-[#932323]'
                            : 'bg-[#7A1C1C]/10 text-[#A33030] hover:bg-[#7A1C1C]/20'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ဖျက်</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTrack(talk)}
                  aria-label={
                    isTrackPlaying ? `${talk.title} ခေတ္တရပ်ရန်` : `${talk.title} နာယူရန်`
                  }
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                    isTrackPlaying
                      ? 'bg-[#D4AF37] text-[#1E1E1E]'
                      : isCurrent
                      ? 'bg-white/15 text-[#D4AF37] hover:bg-white/25'
                      : 'bg-[#3D140F] text-[#F3E5AB] hover:bg-[#541D16]'
                  }`}
                >
                  {isTrackPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

