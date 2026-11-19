import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { DhammaBook, BookChapter } from '../data/dhammaData';
import { ResilientImage } from './ResilientImage';

type ReaderTheme = 'ivory' | 'sepia' | 'dark';
type FontScale = 'sm' | 'md' | 'lg';

interface ELibraryTabProps {
  books: DhammaBook[];
  isAdmin: boolean;
  onAdminAddBook: () => void;
  onAdminEditBook: (book: DhammaBook) => void;
  onAdminDeleteBook: (book: DhammaBook) => Promise<void>;
}

function getReadableChapters(book: DhammaBook): BookChapter[] {
  if (book.chapters && book.chapters.length > 0) {
    return book.chapters;
  }
  const raw = (book.content || book.synopsis || '').trim();
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return [
    {
      chapterNumber: 'အခန်း ၁',
      title: book.title,
      paliVerse: book.category,
      paragraphs: paragraphs.length > 0 ? paragraphs : [book.synopsis],
    },
  ];
}

export const ELibraryTab: React.FC<ELibraryTabProps> = ({
  books,
  isAdmin,
  onAdminAddBook,
  onAdminEditBook,
  onAdminDeleteBook,
}) => {
  const [activeBook, setActiveBook] = useState<DhammaBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('ivory');
  const [fontScale, setFontScale] = useState<FontScale>('md');

  const openBook = (book: DhammaBook) => {
    setActiveBook(book);
    setChapterIndex(0);
  };

  const handleDownloadBook = (book: DhammaBook) => {
    const chapters = getReadableChapters(book);
    const lines: string[] = [
      `${book.title}`,
      `ရေးသားပြုစုသူ — ${book.author}`,
      `ကဏ္ဍ — ${book.category}`,
      '========================================',
      '',
    ];

    chapters.forEach((ch) => {
      lines.push(`${ch.chapterNumber} · ${ch.title}`);
      lines.push('');
      lines.push(ch.paliVerse);
      lines.push('');
      ch.paragraphs.forEach((p) => {
        lines.push(p);
        lines.push('');
      });
      lines.push('----------------------------------------');
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${book.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const themeClasses: Record<ReaderTheme, string> = {
    ivory: 'bg-[#FAF6EE] text-[#2A1815]',
    sepia: 'bg-[#F1E4CD] text-[#332218]',
    dark: 'bg-[#1E1E1E] text-[#F2ECE1]',
  };

  const textSizeClasses: Record<FontScale, string> = {
    sm: 'text-[15px] leading-[1.8]',
    md: 'text-[17px] leading-[1.9]',
    lg: 'text-[19px] leading-[1.95]',
  };

  const activeChapters = activeBook ? getReadableChapters(activeBook) : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-[#3D140F] text-[#FAF6EE] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/25 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#F3E5AB] mb-1.5">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>ရေချမ်းအိုးကျောင်းတိုက် ဒစ်ဂျစ်တယ်စာကြည့်တိုက်</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            ဓမ္မစာအုပ်များ (E-Library)
          </h2>
          <p className="text-sm text-[#FAF6EE]/85 mt-1.5 max-w-2xl leading-relaxed">
            သုတ္တန်၊ ပရိတ်တော်နှင့် ဝိပဿနာကျင့်စဉ် ဓမ္မစာအုပ်များကို ဖုန်းနှင့် ကွန်ပျူတာများပေါ်တွင် အခမဲ့ ဖတ်ရှုသိမ်းဆည်းနိုင်ပါသည်။
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onAdminAddBook}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#1E1E1E] text-sm font-semibold hover:bg-[#E5C153] min-h-[44px] self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>စာအုပ်အသစ်ထည့်ရန်</span>
          </button>
        )}
      </div>

      {/* Bookshelf Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {books.map((book) => (
          <article
            key={book.id}
            className="bg-white rounded-3xl border border-[#3D140F]/10 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md"
          >
            <div className="aspect-[3/4] w-full bg-[#2A0D0A] overflow-hidden">
              <ResilientImage
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                fallbackTitle={book.title}
              />
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-[#8C6810] font-medium">
                  {book.category} · {book.pagesLabel}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-[#3D140F] leading-snug">
                  {book.title}
                </h3>
                <p className="text-xs text-[#6B4F47]">{book.author}</p>
                <p className="text-sm text-[#422D28] leading-relaxed line-clamp-3">
                  {book.synopsis}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openBook(book)}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium hover:bg-[#541D16] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    <span>ဖတ်ရှုရန်</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadBook(book)}
                    aria-label={`${book.title} သိမ်းဆည်းရန်`}
                    className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#FAF6EE] border border-[#3D140F]/15 text-[#3D140F] hover:border-[#D4AF37] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onAdminEditBook(book)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/15 hover:border-[#D4AF37] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>ပြင်ဆင်</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onAdminDeleteBook(book)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#7A1C1C]/10 text-[#A33030] hover:bg-[#7A1C1C]/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ဖျက်</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Fullscreen / Modal E-Book Reader */}
      {activeBook && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeBook.title}
        >
          <div
            className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#D4AF37]/30 ${themeClasses[readerTheme]}`}
          >
            {/* Reader Top Bar */}
            <div
              className={`pt-safe-mobile sm:pt-0 border-b ${
                readerTheme === 'dark'
                  ? 'border-white/10 bg-[#161616]'
                  : 'border-[#3D140F]/10 bg-black/[0.03]'
              }`}
            >
              <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold truncate">
                  {activeBook.title}
                </h3>
                <p className="text-xs opacity-75 truncate">{activeBook.author}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Font Size Switcher */}
                <div className="hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-xl p-1">
                  {(['sm', 'md', 'lg'] as FontScale[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontScale(size)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        fontScale === size
                          ? 'bg-[#D4AF37] text-[#1E1E1E]'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      {size === 'sm' ? 'သေး' : size === 'md' ? 'လတ်' : 'ကြီး'}
                    </button>
                  ))}
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReaderTheme('ivory')}
                    aria-label="ဆင်စွယ်ရောင်"
                    className={`w-7 h-7 rounded-full bg-[#FAF6EE] border cursor-pointer ${
                      readerTheme === 'ivory' ? 'ring-2 ring-[#D4AF37]' : 'border-black/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setReaderTheme('sepia')}
                    aria-label="စက္ကူဝါရောင်"
                    className={`w-7 h-7 rounded-full bg-[#F1E4CD] border cursor-pointer ${
                      readerTheme === 'sepia' ? 'ring-2 ring-[#D4AF37]' : 'border-black/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setReaderTheme('dark')}
                    aria-label="ညဘက်အမည်းရောင်"
                    className={`w-7 h-7 rounded-full bg-[#1E1E1E] border cursor-pointer ${
                      readerTheme === 'dark' ? 'ring-2 ring-[#D4AF37]' : 'border-white/30'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActiveBook(null)}
                  aria-label="စာအုပ်ပိတ်ရန်"
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              </div>
            </div>

            {/* Chapter Tabs */}
            <div
              className={`px-4 sm:px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto smooth-scroll-container ${
                readerTheme === 'dark' ? 'border-white/10' : 'border-[#3D140F]/10'
              }`}
            >
              {activeChapters.map((ch, idx) => (
                <button
                  key={ch.chapterNumber}
                  type="button"
                  onClick={() => setChapterIndex(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[38px] transition-colors cursor-pointer ${
                    chapterIndex === idx
                      ? 'bg-[#3D140F] text-[#F3E5AB]'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {ch.chapterNumber}
                </button>
              ))}
            </div>

            {/* Scrollable Chapter Body */}
            <div className="flex-1 overflow-y-auto smooth-scroll-container px-5 sm:px-8 py-6 space-y-5">
              {(() => {
                const chapter = activeChapters[chapterIndex];
                if (!chapter) return null;
                return (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#B88917]">
                        {chapter.chapterNumber}
                      </p>
                      <h4 className="text-xl sm:text-2xl font-bold leading-snug">
                        {chapter.title}
                      </h4>
                    </div>

                    <div
                      className={`p-4 sm:p-5 rounded-2xl border ${
                        readerTheme === 'dark'
                          ? 'bg-white/5 border-[#D4AF37]/30 text-[#F3E5AB]'
                          : 'bg-[#3D140F]/[0.04] border-[#D4AF37]/35 text-[#3D140F]'
                      }`}
                    >
                      <p className="text-sm sm:text-base font-medium leading-[1.85]">
                        {chapter.paliVerse}
                      </p>
                    </div>

                    <div className={`space-y-4 ${textSizeClasses[fontScale]}`}>
                      {chapter.paragraphs.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Reader Footer Pagination */}
            <div
              className={`px-4 sm:px-6 py-3 border-t flex items-center justify-between gap-3 ${
                readerTheme === 'dark' ? 'border-white/10' : 'border-[#3D140F]/10'
              }`}
            >
              <button
                type="button"
                disabled={chapterIndex === 0}
                onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-35 hover:bg-black/5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ရှေ့အခန်း</span>
              </button>

              <span className="text-xs tabular-nums opacity-75">
                {chapterIndex + 1} / {activeChapters.length}
              </span>

              <button
                type="button"
                disabled={chapterIndex >= activeChapters.length - 1}
                onClick={() =>
                  setChapterIndex((i) => Math.min(activeChapters.length - 1, i + 1))
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium min-h-[44px] disabled:opacity-35 hover:bg-black/5 cursor-pointer"
              >
                <span>နောက်အခန်း</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
