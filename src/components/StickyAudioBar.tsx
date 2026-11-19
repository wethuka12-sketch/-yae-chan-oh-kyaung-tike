import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import type { AudioTalk } from '../data/dhammaData';
import { formatTimeSec } from '../lib/mediaSynthesizer';

interface StickyAudioBarProps {
  track: AudioTalk;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (timeSec: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onCycleSpeed: () => void;
  onClose: () => void;
}

export const StickyAudioBar: React.FC<StickyAudioBarProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onCycleSpeed,
  onClose,
}) => {
  const safeDuration = duration > 0 ? duration : track.durationSec;
  const progressPct = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  return (
    <div
      className="fixed bottom-16 lg:bottom-4 left-0 right-0 lg:left-auto lg:right-6 lg:w-[460px] z-30 px-3 lg:px-0 gpu-accelerated"
      role="region"
      aria-label="အသံဖွင့်စက်"
    >
      <div className="bg-[#1E1E1E]/95 backdrop-blur-md text-[#FAF6EE] rounded-2xl border border-[#D4AF37]/35 shadow-xl px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Track info */}
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-white truncate">
              {track.title}
            </p>
            <p className="text-[11px] text-[#F3E5AB]/80 truncate">
              {track.speaker}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onCycleSpeed}
              aria-label="အသံနှုန်းပြောင်းရန်"
              className="px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums text-[#D4AF37] hover:bg-white/10 transition-colors min-h-[36px] cursor-pointer"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={onPrev}
              aria-label="ယခင်တရားတော်"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#FAF6EE]/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'ခေတ္တရပ်ရန်' : 'ဖွင့်ရန်'}
              className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#1E1E1E] flex items-center justify-center hover:bg-[#E2BF4E] transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="နောက်တရားတော်"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#FAF6EE]/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="အသံဖွင့်စက်ပိတ်ရန်"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FAF6EE]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seekbar & Time */}
        <div className="mt-1.5 flex items-center gap-2.5">
          <span className="text-[11px] tabular-nums text-[#F3E5AB]/85 w-10">
            {formatTimeSec(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.5}
            value={Math.min(currentTime, safeDuration)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="တရားတော် အချိန်ရွှေ့ရန်"
            style={{
              background: `linear-gradient(to right, #D4AF37 ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
            }}
            className="dhamma-seekbar flex-1 h-1 rounded-full"
          />
          <span className="text-[11px] tabular-nums text-[#FAF6EE]/70 w-10 text-right">
            {formatTimeSec(safeDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
