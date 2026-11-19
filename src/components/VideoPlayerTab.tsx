import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { VideoTeaching } from '../data/dhammaData';
import { formatTimeSec, getSynthesizedAudioUrl } from '../lib/mediaSynthesizer';
import { ResilientImage } from './ResilientImage';

interface VideoPlayerTabProps {
  videos: VideoTeaching[];
  isAdmin: boolean;
  onVideoPlaybackStart?: () => void;
  onAdminAddVideo: () => void;
  onAdminEditVideo: (video: VideoTeaching) => void;
  onAdminDeleteVideo: (video: VideoTeaching) => Promise<void>;
}

export const VideoPlayerTab: React.FC<VideoPlayerTabProps> = ({
  videos,
  isAdmin,
  onVideoPlaybackStart,
  onAdminAddVideo,
  onAdminEditVideo,
  onAdminDeleteVideo,
}) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>(videos[0]?.id ?? '');
  const activeVideo = videos.find((v) => v.id === selectedVideoId) ?? videos[0];
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theaterRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawCoverFrame = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement | null,
    zoom = 1.04
  ) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#140907';
    ctx.fillRect(0, 0, w, h);

    if (img && img.complete && img.naturalWidth > 0) {
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;
      let drawW = w * zoom;
      let drawH = h * zoom;
      if (imgAspect > canvasAspect) {
        drawW = drawH * imgAspect;
      } else {
        drawH = drawW / imgAspect;
      }
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;
      ctx.globalAlpha = 0.86;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.globalAlpha = 1;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(20, 9, 7, 0.35)');
    grad.addColorStop(0.5, 'rgba(20, 9, 7, 0.25)');
    grad.addColorStop(1, 'rgba(15, 7, 5, 0.90)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  // Load current thumbnail into offscreen Image for smooth 60fps Canvas rendering
  useEffect(() => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = activeVideo.thumbnail;
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && !isPlaying) {
        drawCoverFrame(ctx, canvas.width, canvas.height, img, 1.04);
      }
    };
  }, [activeVideo.thumbnail, isPlaying]);

  // Setup synthesized audio stream for video teaching (only when no real MP4 videoUrl is uploaded)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeVideo.videoUrl) {
      audio.pause();
      audio.removeAttribute('src');
      setCurrentTime(0);
      return;
    }

    const url = getSynthesizedAudioUrl(`vid_${activeVideo.id}`, activeVideo.acoustic);
    audio.src = url;
    audio.muted = isMuted;
    audio.currentTime = 0;
    setCurrentTime(0);

    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [activeVideo]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Synchronized Canvas visual loop
  useEffect(() => {
    let rafId = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: 18 }, (_, i) => ({
      xSeed: ((i * 73) % 100) / 100,
      yOffset: ((i * 37) % 100) / 100,
      speed: 0.018 + (i % 5) * 0.006,
      size: 1.8 + (i % 3) * 1.1,
    }));

    const renderFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = audioRef.current ? audioRef.current.currentTime : 0;
      const zoom = 1.04 + 0.04 * Math.sin(t * 0.18);

      drawCoverFrame(ctx, w, h, imageRef.current, zoom);

      // Soft drifting golden light motes when playing
      if (isPlaying) {
        for (const p of particles) {
          const px = (p.xSeed + Math.sin(t * 0.35 + p.yOffset * 6) * 0.03) * w;
          const py = ((1 - ((p.yOffset + t * p.speed) % 1)) * 0.85 + 0.05) * h;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(212, 175, 55, 0.42)';
          ctx.fill();
        }
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeVideo, isPlaying]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      onVideoPlaybackStart?.();
      void audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSelectVideo = (video: VideoTeaching) => {
    onVideoPlaybackStart?.();
    setSelectedVideoId(video.id);
    setIsPlaying(true);
  };

  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const toggleFullscreen = () => {
    const el = theaterRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  };

  if (!activeVideo) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center space-y-4 border border-[#3D140F]/10">
        <p className="text-sm text-[#5C4038]">ဗီဒီယိုများ မရှိသေးပါ။</p>
        {isAdmin && (
          <button
            type="button"
            onClick={onAdminAddVideo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>MP4 ဗီဒီယိုအသစ်ထည့်ရန်</span>
          </button>
        )}
      </div>
    );
  }

  // Find active synchronized subtitle for current timestamp
  const currentSubtitle =
    activeVideo.subtitles.length > 0
      ? [...activeVideo.subtitles]
          .reverse()
          .find((s) => currentTime >= s.atSec) || activeVideo.subtitles[0]
      : null;

  const progressPct = Math.min(
    100,
    Math.max(0, (currentTime / activeVideo.durationSec) * 100)
  );

  return (
    <div className="space-y-6 pb-8">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      {isAdmin && (
        <div className="bg-[#3D140F] text-[#FAF6EE] rounded-2xl px-4 py-3 border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F3E5AB]">
            <Film className="w-4 h-4 text-[#D4AF37]" />
            <span>Admin ဗီဒီယို စီမံခန့်ခွဲမှု</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAdminAddVideo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] text-[#1E1E1E] text-xs sm:text-sm font-semibold hover:bg-[#E5C153] min-h-[40px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ဗီဒီယိုအသစ်ထည့်ရန်</span>
            </button>
            <button
              type="button"
              onClick={() => onAdminEditVideo(activeVideo)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-[#F3E5AB] hover:bg-white/20 text-xs sm:text-sm font-medium min-h-[40px] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>ပြင်ဆင်</span>
            </button>
            <button
              type="button"
              onClick={() => void onAdminDeleteVideo(activeVideo)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7A1C1C] text-[#FFD6D6] hover:bg-[#932323] text-xs sm:text-sm font-medium min-h-[40px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ဖျက်</span>
            </button>
          </div>
        </div>
      )}

      {/* Theater Video Player */}
      <section
        ref={theaterRef}
        className="bg-[#1E1E1E] text-[#FAF6EE] rounded-3xl overflow-hidden border border-[#D4AF37]/30 shadow-md"
      >
        {activeVideo.videoUrl ? (
          <div className="relative aspect-video w-full bg-[#140907]">
            <video
              key={activeVideo.videoUrl}
              src={activeVideo.videoUrl}
              poster={activeVideo.thumbnail}
              controls
              playsInline
              onPlay={() => onVideoPlaybackStart?.()}
              className="w-full h-full object-contain bg-black"
            />
          </div>
        ) : (
          <div
            onClick={togglePlay}
            className="relative aspect-video w-full bg-[#140907] cursor-pointer select-none overflow-hidden"
          >
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-cover block"
            />

            {/* Top subtle caption */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className="text-xs font-medium text-[#F3E5AB]/90 bg-black/45 px-3 py-1 rounded-lg backdrop-blur-sm">
                {activeVideo.category}
              </span>
            </div>

            {/* Center Play Overlay when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#D4AF37] text-[#1E1E1E] flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                </div>
              </div>
            )}

            {/* Synchronized Myanmar & Pāli Subtitles */}
            {currentSubtitle && (
              <div className="absolute inset-x-0 bottom-4 sm:bottom-6 px-4 sm:px-8 text-center pointer-events-none">
                <div className="inline-block max-w-3xl bg-black/65 backdrop-blur-sm rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 border border-[#D4AF37]/25">
                  <p className="text-xs sm:text-sm text-[#F3E5AB] font-medium">
                    {currentSubtitle.pali}
                  </p>
                  <p className="text-sm sm:text-base text-white mt-1 leading-relaxed">
                    {currentSubtitle.myanmar}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Controls & Details */}
        <div className="p-4 sm:p-5 space-y-3 bg-[#1E1E1E]">
          {!activeVideo.videoUrl && (
            <>
              {/* Seekbar */}
              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-[#F3E5AB] w-11">
                  {formatTimeSec(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={activeVideo.durationSec}
                  step={0.5}
                  value={Math.min(currentTime, activeVideo.durationSec)}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  aria-label="ဗီဒီယိုအချိန်ရွှေ့ရန်"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
                  }}
                  className="dhamma-seekbar flex-1 h-1 rounded-full"
                />
                <span className="text-xs tabular-nums text-[#FAF6EE]/75 w-11 text-right">
                  {formatTimeSec(activeVideo.durationSec)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] text-[#1E1E1E] text-sm font-semibold min-h-[44px] hover:bg-[#E3C152] transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>ခေတ္တရပ်ရန်</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>ကြည့်ရှုရန်</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'အသံဖွင့်ရန်' : 'အသံပိတ်ရန်'}
                    className="w-11 h-11 rounded-xl bg-white/10 text-[#FAF6EE] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'မျက်နှာပြင်ကျယ်ပိတ်ရန်' : 'မျက်နှာပြင်ကျယ်ကြည့်ရန်'}
                  className="w-11 h-11 rounded-xl bg-white/10 text-[#FAF6EE] hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </>
          )}

          <div className={activeVideo.videoUrl ? '' : 'pt-2 border-t border-white/10'}>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {activeVideo.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#F3E5AB]/85 mt-1">
              {activeVideo.speaker} · {activeVideo.dateLabel}
            </p>
            <p className="text-sm text-[#FAF6EE]/80 mt-2 leading-relaxed">
              {activeVideo.description}
            </p>
          </div>
        </div>
      </section>

      {/* Video Playlist Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#8C6810]" />
            <h3 className="text-lg sm:text-xl font-bold text-[#3D140F]">
              MP4 တရားဗီဒီယို အစီအစဉ်များ
            </h3>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onAdminAddVideo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium hover:bg-[#541D16] min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>ဗီဒီယိုအသစ်ထည့်ရန်</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videos.map((video) => {
            const selected = video.id === activeVideo.id;
            return (
              <div
                key={video.id}
                className={`rounded-3xl overflow-hidden border transition-all duration-200 flex flex-col ${
                  selected
                    ? 'bg-[#3D140F] text-[#FAF6EE] border-[#D4AF37] shadow-md'
                    : 'bg-white text-[#2A1815] border-[#3D140F]/10 hover:border-[#D4AF37]/60 shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectVideo(video)}
                  className="text-left flex flex-col flex-1 cursor-pointer"
                >
                  <div className="relative aspect-video w-full bg-[#1E1E1E] overflow-hidden">
                    <ResilientImage
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      fallbackTitle={video.category}
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selected
                            ? 'bg-[#D4AF37] text-[#1E1E1E]'
                            : 'bg-black/60 text-white'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </span>
                    </div>
                    <span className="absolute bottom-2 right-2 text-[11px] tabular-nums bg-black/75 text-white px-2 py-0.5 rounded-md">
                      {formatTimeSec(video.durationSec)}
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5 flex-1">
                    <p
                      className={`text-xs ${
                        selected ? 'text-[#F3E5AB]' : 'text-[#8C6810]'
                      }`}
                    >
                      {video.category}
                    </p>
                    <h4
                      className={`text-sm font-bold leading-relaxed line-clamp-2 ${
                        selected ? 'text-white' : 'text-[#3D140F]'
                      }`}
                    >
                      {video.title}
                    </h4>
                    <p
                      className={`text-xs ${
                        selected ? 'text-[#FAF6EE]/75' : 'text-[#6B4F47]'
                      }`}
                    >
                      {video.speaker}
                    </p>
                  </div>
                </button>

                {isAdmin && (
                  <div
                    className={`px-4 pb-3 pt-1 flex items-center gap-2 border-t ${
                      selected ? 'border-white/10' : 'border-[#3D140F]/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onAdminEditVideo(video)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        selected
                          ? 'bg-white/10 text-[#F3E5AB] hover:bg-white/20'
                          : 'bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/15'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>ပြင်ဆင်</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onAdminDeleteVideo(video)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        selected
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
            );
          })}
        </div>
      </section>
    </div>
  );
};
