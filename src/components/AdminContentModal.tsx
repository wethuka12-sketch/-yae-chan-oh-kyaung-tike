import React, { useEffect, useRef, useState } from 'react';
import { X, Save, Upload, Music, Video, Trash2, Image as ImageIcon } from 'lucide-react';
import {
  IMAGES,
  type CommunityPost,
  type AudioTalk,
  type VideoTeaching,
  type DhammaBook,
} from '../data/dhammaData';
import {
  validateImageFile,
  uploadThumbnailToStorage,
  type PostInput,
  type AudioTalkInput,
  type VideoInput,
  type BookInput,
} from '../lib/firebase';
import {
  detectLocalMediaDuration,
  formatFileSize,
  uploadMediaFile,
} from '../lib/mediaUpload';

export type AdminModalTarget =
  | { kind: 'post'; item?: CommunityPost }
  | { kind: 'audio'; item?: AudioTalk }
  | { kind: 'video'; item?: VideoTeaching }
  | { kind: 'book'; item?: DhammaBook };

interface AdminContentModalProps {
  target: AdminModalTarget;
  onClose: () => void;
  onSavePost: (data: PostInput, targetId?: string) => Promise<void>;
  onSaveAudio: (data: AudioTalkInput, targetId?: string) => Promise<void>;
  onSaveVideo: (data: VideoInput, targetId?: string) => Promise<void>;
  onSaveBook: (data: BookInput, targetId?: string) => Promise<void>;
}

const IMAGE_PRESETS = [
  { label: 'ကျောင်းတိုက်မြင်ကွင်း', url: IMAGES.hero },
  { label: 'ဓမ္မာရုံတရားပွဲ', url: IMAGES.dhammaHall },
  { label: 'ရေချမ်းအိုးစင်', url: IMAGES.waterPots },
  { label: 'ရွှေစေတီညနေခင်း', url: IMAGES.pagodaDusk },
  { label: 'ဓမ္မစာအုပ်', url: IMAGES.bookCover },
];

export const AdminContentModal: React.FC<AdminContentModalProps> = ({
  target,
  onClose,
  onSavePost,
  onSaveAudio,
  onSaveVideo,
  onSaveBook,
}) => {
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  const handleSelectGalleryImage = (file: File | null) => {
    if (!file) {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingImageFile(null);
      setPendingPreviewUrl(null);
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg(null);
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingImageFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  };

  // Post fields
  const [postTitle, setPostTitle] = useState(
    target.kind === 'post' && target.item ? target.item.title : ''
  );
  const [postCategory, setPostCategory] = useState(
    target.kind === 'post' && target.item ? target.item.category : 'ကျောင်းတိုက် သတင်းလွှာ'
  );
  const [postDate, setPostDate] = useState(
    target.kind === 'post' && target.item ? target.item.dateMyanmar : 'ယနေ့'
  );
  const [postAuthor, setPostAuthor] = useState(
    target.kind === 'post' && target.item ? target.item.author : 'ရေချမ်းအိုးကျောင်းတိုက်'
  );
  const [postSummary, setPostSummary] = useState(
    target.kind === 'post' && target.item ? target.item.summary : ''
  );
  const [postBody, setPostBody] = useState(
    target.kind === 'post' && target.item ? target.item.body : ''
  );
  const [postImage, setPostImage] = useState(
    target.kind === 'post' && target.item ? target.item.image : IMAGES.hero
  );
  const [postAudioUrl, setPostAudioUrl] = useState(
    target.kind === 'post' && target.item ? target.item.audioUrl || '' : ''
  );
  const [postVideoUrl, setPostVideoUrl] = useState(
    target.kind === 'post' && target.item ? target.item.videoUrl || '' : ''
  );

  // Audio fields
  const [audioTitle, setAudioTitle] = useState(
    target.kind === 'audio' && target.item ? target.item.title : ''
  );
  const [audioSpeaker, setAudioSpeaker] = useState(
    target.kind === 'audio' && target.item ? target.item.speaker : 'ဒေါက်တာဘဒ္ဒန္တဉာဏိက'
  );
  const [audioCategory, setAudioCategory] = useState<
    'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ' | 'ပရိတ်တော်' | 'သုတ္တန်'
  >(
    target.kind === 'audio' && target.item
      ? target.item.category
      : 'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ'
  );
  const [audioDuration, setAudioDuration] = useState(
    target.kind === 'audio' && target.item ? String(target.item.durationSec) : '120'
  );
  const [audioDesc, setAudioDesc] = useState(
    target.kind === 'audio' && target.item ? target.item.description : ''
  );
  const [audioCover, setAudioCover] = useState(
    target.kind === 'audio' && target.item ? target.item.coverImage : IMAGES.hero
  );
  const [audioUrl, setAudioUrl] = useState(
    target.kind === 'audio' && target.item ? target.item.audioUrl || '' : ''
  );

  // Video fields
  const [videoTitle, setVideoTitle] = useState(
    target.kind === 'video' && target.item ? target.item.title : ''
  );
  const [videoSpeaker, setVideoSpeaker] = useState(
    target.kind === 'video' && target.item
      ? target.item.speaker
      : 'ရေချမ်းအိုးကျောင်းတိုက် ဆရာတော်'
  );
  const [videoCategory, setVideoCategory] = useState(
    target.kind === 'video' && target.item ? target.item.category : 'ဓမ္မသဘင် ဗီဒီယို'
  );
  const [videoDuration, setVideoDuration] = useState(
    target.kind === 'video' && target.item ? String(target.item.durationSec) : '75'
  );
  const [videoDesc, setVideoDesc] = useState(
    target.kind === 'video' && target.item ? target.item.description : ''
  );
  const [videoThumb, setVideoThumb] = useState(
    target.kind === 'video' && target.item ? target.item.thumbnail : IMAGES.dhammaHall
  );
  const [videoUrl, setVideoUrl] = useState(
    target.kind === 'video' && target.item ? target.item.videoUrl || '' : ''
  );

  // Book fields
  const [bookTitle, setBookTitle] = useState(
    target.kind === 'book' && target.item ? target.item.title : ''
  );
  const [bookAuthor, setBookAuthor] = useState(
    target.kind === 'book' && target.item
      ? target.item.author
      : 'ရေချမ်းအိုးကျောင်းတိုက် စာပေဌာန'
  );
  const [bookCategory, setBookCategory] = useState(
    target.kind === 'book' && target.item ? target.item.category : 'သုတ္တန်ပိဋကတ်'
  );
  const [bookPages, setBookPages] = useState(
    target.kind === 'book' && target.item ? target.item.pagesLabel : 'ဓမ္မစာပေ'
  );
  const [bookSynopsis, setBookSynopsis] = useState(
    target.kind === 'book' && target.item ? target.item.synopsis : ''
  );
  const [bookContent, setBookContent] = useState(
    target.kind === 'book' && target.item
      ? target.item.content ||
          target.item.chapters
            .map((c) => `${c.chapterNumber} · ${c.title}\n${c.paliVerse}\n${c.paragraphs.join('\n\n')}`)
            .join('\n\n---\n\n')
      : ''
  );
  const [bookCover, setBookCover] = useState(
    target.kind === 'book' && target.item ? target.item.coverImage : IMAGES.bookCover
  );
  const [bookPdfUrl, setBookPdfUrl] = useState(
    target.kind === 'book' && target.item ? target.item.pdfUrl || '' : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploadingCount > 0) return;
    setErrorMsg(null);

    if (target.kind === 'post' && (!postTitle.trim() || !postBody.trim())) {
      setErrorMsg('ခေါင်းစဉ်နှင့် အကြောင်းအရာကို ဖြည့်သွင်းပေးပါ။');
      return;
    }
    if (target.kind === 'audio' && (!audioTitle.trim() || !audioDesc.trim())) {
      setErrorMsg('တရားတော်ခေါင်းစဉ်နှင့် ဖော်ပြချက်ကို ဖြည့်သွင်းပေးပါ။');
      return;
    }
    if (target.kind === 'video' && (!videoTitle.trim() || !videoDesc.trim())) {
      setErrorMsg('ဗီဒီယိုခေါင်းစဉ်နှင့် ဖော်ပြချက်ကို ဖြည့်သွင်းပေးပါ။');
      return;
    }
    if (target.kind === 'book' && (!bookTitle.trim() || !bookSynopsis.trim())) {
      setErrorMsg('စာအုပ်အမည်နှင့် အကျဉ်းချုပ်ကို ဖြည့်သွင်းပေးပါ။');
      return;
    }

    setSaving(true);

    try {
      const folderMap = {
        post: 'posts',
        audio: 'audio',
        video: 'video',
        book: 'books',
      } as const;

      let uploadedImageUrl: string | null = null;
      if (pendingImageFile) {
        setImageUploadProgress(0);
        uploadedImageUrl = await uploadThumbnailToStorage(
          pendingImageFile,
          folderMap[target.kind],
          (pct) => setImageUploadProgress(pct)
        );
      }

      if (target.kind === 'post') {
        await onSavePost(
          {
            category: postCategory,
            dateMyanmar: postDate,
            author: postAuthor,
            title: postTitle,
            summary: postSummary.trim() || postBody.trim().slice(0, 140),
            body: postBody,
            image: uploadedImageUrl || postImage || IMAGES.hero,
            imageAlt: postTitle,
            audioUrl: postAudioUrl,
            videoUrl: postVideoUrl,
            initialGood: target.item?.initialGood ?? 0,
            initialLove: target.item?.initialLove ?? 0,
            isArchived: false,
          },
          target.item?.id
        );
      } else if (target.kind === 'audio') {
        const dur = Math.max(10, Number(audioDuration) || 120);
        await onSaveAudio(
          {
            title: audioTitle,
            speaker: audioSpeaker,
            category: audioCategory,
            durationSec: dur,
            dateLabel: `${Math.max(1, Math.round(dur / 60))} မိနစ် · ${audioCategory}`,
            description: audioDesc,
            coverImage: uploadedImageUrl || audioCover || IMAGES.hero,
            audioUrl,
            isArchived: false,
          },
          target.item?.id
        );
      } else if (target.kind === 'video') {
        const dur = Math.max(10, Number(videoDuration) || 75);
        await onSaveVideo(
          {
            title: videoTitle,
            speaker: videoSpeaker,
            category: videoCategory,
            durationSec: dur,
            dateLabel: `HD · ${videoCategory}`,
            description: videoDesc,
            thumbnail: uploadedImageUrl || videoThumb || IMAGES.dhammaHall,
            videoUrl,
            isArchived: false,
          },
          target.item?.id
        );
      } else if (target.kind === 'book') {
        await onSaveBook(
          {
            title: bookTitle,
            author: bookAuthor,
            category: bookCategory,
            pagesLabel: bookPages,
            coverImage: uploadedImageUrl || bookCover || IMAGES.bookCover,
            synopsis: bookSynopsis,
            content: bookContent.trim() || bookSynopsis,
            pdfUrl: bookPdfUrl,
            isArchived: false,
          },
          target.item?.id
        );
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'သိမ်းဆည်းရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
      );
    } finally {
      setImageUploadProgress(null);
      setSaving(false);
    }
  };

  const titleLabel =
    target.kind === 'post'
      ? target.item
        ? 'သတင်း/ဆောင်းပါး ပြင်ဆင်ရန်'
        : 'သတင်း/ဆောင်းပါး အသစ်ထည့်ရန်'
      : target.kind === 'audio'
      ? target.item
        ? 'MP3 တရားတော် ပြင်ဆင်ရန်'
        : 'MP3 တရားတော် အသစ်ထည့်ရန်'
      : target.kind === 'video'
      ? target.item
        ? 'MP4 ဗီဒီယို ပြင်ဆင်ရန်'
        : 'MP4 ဗီဒီယို အသစ်ထည့်ရန်'
      : target.item
      ? 'ဓမ္မစာအုပ် ပြင်ဆင်ရန်'
      : 'ဓမ္မစာအုပ် အသစ်ထည့်ရန်';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel}
    >
      <div className="bg-[#FAF6EE] text-[#2A1815] w-full max-w-xl max-h-[90vh] rounded-3xl border border-[#D4AF37]/40 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-[#3D140F] text-[#FAF6EE] flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-[#F3E5AB]">{titleLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="ပိတ်ရန်"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex-1 overflow-y-auto smooth-scroll-container p-5 sm:p-6 space-y-4"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#7A1C1C]/10 border border-[#7A1C1C]/30 text-xs sm:text-sm text-[#7A1C1C]">
              {errorMsg}
            </div>
          )}

          {target.kind === 'post' && (
            <>
              <Field label="ခေါင်းစဉ် *" value={postTitle} onChange={setPostTitle} maxLength={200} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ကဏ္ဍ" value={postCategory} onChange={setPostCategory} maxLength={80} />
                <Field label="နေ့စွဲ / အချိန်" value={postDate} onChange={setPostDate} maxLength={80} />
              </div>
              <Field label="ရေးသားသူ / ဌာန" value={postAuthor} onChange={setPostAuthor} maxLength={100} />
              <Field
                label="အကျဉ်းချုပ်"
                value={postSummary}
                onChange={setPostSummary}
                maxLength={500}
              />
              <TextAreaField
                label="အပြည့်အစုံ စာသား *"
                value={postBody}
                onChange={setPostBody}
                rows={4}
                maxLength={5000}
              />
              <MediaFileUploadField
                kind="audio"
                label="MP3 အသံဖိုင် ထည့်ရန် (ရွေးချယ်နိုင်သည်)"
                value={postAudioUrl}
                onChange={setPostAudioUrl}
                onUploadingChange={(busy) =>
                  setUploadingCount((c) => Math.max(0, c + (busy ? 1 : -1)))
                }
                onError={setErrorMsg}
              />
              <MediaFileUploadField
                kind="video"
                label="MP4 ဗီဒီယိုဖိုင် ထည့်ရန် (ရွေးချယ်နိုင်သည်)"
                value={postVideoUrl}
                onChange={setPostVideoUrl}
                onUploadingChange={(busy) =>
                  setUploadingCount((c) => Math.max(0, c + (busy ? 1 : -1)))
                }
                onError={setErrorMsg}
              />
              <ImageSelectorField
                label="အဖုံးပုံ (ဖုန်း Gallery မှ ရွေးချယ်ရန်)"
                value={postImage}
                pendingFile={pendingImageFile}
                previewUrl={pendingPreviewUrl}
                uploadProgress={imageUploadProgress}
                onSelectFile={handleSelectGalleryImage}
                onSelectPreset={(url) => {
                  handleSelectGalleryImage(null);
                  setPostImage(url);
                }}
              />
            </>
          )}

          {target.kind === 'audio' && (
            <>
              <Field label="တရားတော်ခေါင်းစဉ် *" value={audioTitle} onChange={setAudioTitle} maxLength={200} />
              <Field label="ဟောကြားသူ ဆရာတော်" value={audioSpeaker} onChange={setAudioSpeaker} maxLength={120} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D140F] mb-1">အမျိုးအစား</label>
                  <select
                    value={audioCategory}
                    onChange={(e) =>
                      setAudioCategory(
                        e.target.value as
                          | 'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ'
                          | 'ပရိတ်တော်'
                          | 'သုတ္တန်'
                      )
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#3D140F]/15 text-sm"
                  >
                    <option value="ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ">
                      ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ
                    </option>
                    <option value="ပရိတ်တော်">ပရိတ်တော်</option>
                    <option value="သုတ္တန်">သုတ္တန်</option>
                  </select>
                </div>
                <Field
                  label="ကြာမြင့်ချိန် (စက္ကန့်)"
                  value={audioDuration}
                  onChange={setAudioDuration}
                  maxLength={10}
                />
              </div>
              <TextAreaField
                label="တရားတော် ဖော်ပြချက် *"
                value={audioDesc}
                onChange={setAudioDesc}
                rows={3}
                maxLength={1000}
              />
              <MediaFileUploadField
                kind="audio"
                label="MP3 အသံဖိုင် ရွေးချယ်ထည့်ရန်"
                value={audioUrl}
                onChange={setAudioUrl}
                onDurationDetected={(sec) => setAudioDuration(String(sec))}
                onUploadingChange={(busy) =>
                  setUploadingCount((c) => Math.max(0, c + (busy ? 1 : -1)))
                }
                onError={setErrorMsg}
              />
              <ImageSelectorField
                label="မျက်နှာဖုံးပုံ (ဖုန်း Gallery မှ ရွေးချယ်ရန်)"
                value={audioCover}
                pendingFile={pendingImageFile}
                previewUrl={pendingPreviewUrl}
                uploadProgress={imageUploadProgress}
                onSelectFile={handleSelectGalleryImage}
                onSelectPreset={(url) => {
                  handleSelectGalleryImage(null);
                  setAudioCover(url);
                }}
              />
            </>
          )}

          {target.kind === 'video' && (
            <>
              <Field label="ဗီဒီယိုခေါင်းစဉ် *" value={videoTitle} onChange={setVideoTitle} maxLength={200} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ဟောကြားသူ" value={videoSpeaker} onChange={setVideoSpeaker} maxLength={120} />
                <Field label="ကဏ္ဍ" value={videoCategory} onChange={setVideoCategory} maxLength={100} />
              </div>
              <Field
                label="ကြာမြင့်ချိန် (စက္ကန့်)"
                value={videoDuration}
                onChange={setVideoDuration}
                maxLength={10}
              />
              <TextAreaField
                label="ဗီဒီယို ဖော်ပြချက် *"
                value={videoDesc}
                onChange={setVideoDesc}
                rows={3}
                maxLength={1000}
              />
              <MediaFileUploadField
                kind="video"
                label="MP4 ဗီဒီယိုဖိုင် ရွေးချယ်ထည့်ရန်"
                value={videoUrl}
                onChange={setVideoUrl}
                onDurationDetected={(sec) => setVideoDuration(String(sec))}
                onUploadingChange={(busy) =>
                  setUploadingCount((c) => Math.max(0, c + (busy ? 1 : -1)))
                }
                onError={setErrorMsg}
              />
              <ImageSelectorField
                label="အဖုံးပုံ Thumbnail (ဖုန်း Gallery မှ ရွေးချယ်ရန်)"
                value={videoThumb}
                pendingFile={pendingImageFile}
                previewUrl={pendingPreviewUrl}
                uploadProgress={imageUploadProgress}
                onSelectFile={handleSelectGalleryImage}
                onSelectPreset={(url) => {
                  handleSelectGalleryImage(null);
                  setVideoThumb(url);
                }}
              />
            </>
          )}

          {target.kind === 'book' && (
            <>
              <Field label="စာအုပ်အမည် *" value={bookTitle} onChange={setBookTitle} maxLength={200} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ရေးသားပြုစုသူ" value={bookAuthor} onChange={setBookAuthor} maxLength={120} />
                <Field label="ကဏ္ဍ" value={bookCategory} onChange={setBookCategory} maxLength={100} />
              </div>
              <Field label="စာမျက်နှာ / ဖတ်ရှုချိန်" value={bookPages} onChange={setBookPages} maxLength={100} />
              <TextAreaField
                label="အကျဉ်းချုပ် *"
                value={bookSynopsis}
                onChange={setBookSynopsis}
                rows={2}
                maxLength={1000}
              />
              <TextAreaField
                label="စာအုပ်စာသား အပြည့်အစုံ"
                value={bookContent}
                onChange={setBookContent}
                rows={5}
                maxLength={50000}
              />
              <Field
                label="PDF URL (ရွေးချယ်နိုင်သည်)"
                value={bookPdfUrl}
                onChange={setBookPdfUrl}
                maxLength={1000}
              />
              <ImageSelectorField
                label="စာအုပ်မျက်နှာဖုံးပုံ (ဖုန်း Gallery မှ ရွေးချယ်ရန်)"
                value={bookCover}
                pendingFile={pendingImageFile}
                previewUrl={pendingPreviewUrl}
                uploadProgress={imageUploadProgress}
                onSelectFile={handleSelectGalleryImage}
                onSelectPreset={(url) => {
                  handleSelectGalleryImage(null);
                  setBookCover(url);
                }}
              />
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#3D140F]/20 text-sm font-medium text-[#3D140F] hover:bg-black/5 min-h-[44px] cursor-pointer"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              disabled={saving || uploadingCount > 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium hover:bg-[#541D16] min-h-[44px] cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>
                {imageUploadProgress !== null
                  ? `ပုံတင်နေသည်... ${imageUploadProgress}%`
                  : uploadingCount > 0
                  ? 'ဖိုင်တင်နေပါသည်...'
                  : saving
                  ? 'သိမ်းဆည်းနေပါသည်...'
                  : 'သိမ်းဆည်းရန်'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function MediaFileUploadField({
  kind,
  label,
  value,
  onChange,
  onDurationDetected,
  onUploadingChange,
  onError,
}: {
  kind: 'audio' | 'video';
  label: string;
  value: string;
  onChange: (url: string) => void;
  onDurationDetected?: (sec: number) => void;
  onUploadingChange: (busy: boolean) => void;
  onError: (msg: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileLabel, setFileLabel] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    onError(null);
    setUploading(true);
    setProgress(0);
    onUploadingChange(true);

    try {
      const [duration, uploaded] = await Promise.all([
        detectLocalMediaDuration(file, kind),
        uploadMediaFile(file, kind, (pct) => setProgress(pct)),
      ]);
      if (duration && onDurationDetected) {
        onDurationDetected(duration);
      }
      setFileLabel(`${file.name} (${formatFileSize(file.size)})`);
      onChange(uploaded.url);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'ဖိုင်တင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
      );
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  };

  const Icon = kind === 'video' ? Video : Music;

  return (
    <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#3D140F]/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-medium text-[#3D140F] flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-[#8C6810]" />
          <span>{label}</span>
        </label>

        <input
          ref={inputRef}
          type="file"
          accept={kind === 'video' ? 'video/mp4,video/*' : 'audio/mpeg,audio/mp3,audio/*'}
          onChange={(e) => void handleFileChange(e)}
          className="hidden"
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3D140F] text-[#F3E5AB] hover:bg-[#541D16] text-xs font-medium min-h-[40px] cursor-pointer disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>
            {uploading
              ? `တင်နေသည်... ${progress}%`
              : kind === 'video'
              ? 'ဖုန်းထဲမှ MP4 ဗီဒီယို ရွေးရန်'
              : 'ဖုန်းထဲမှ MP3 အသံဖိုင် ရွေးရန်'}
          </span>
        </button>
      </div>

      {uploading && (
        <div className="w-full h-1.5 rounded-full bg-[#EFE7D8] overflow-hidden">
          <div
            className="h-full bg-[#D4AF37] transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {value && !uploading && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2 text-xs text-[#5C4038] bg-[#FAF6EE] px-3 py-2 rounded-xl border border-[#3D140F]/10">
            <span className="truncate font-medium">
              {fileLabel || (kind === 'video' ? 'ဗီဒီယိုဖိုင် ထည့်သွင်းပြီးပါပြီ' : 'အသံဖိုင် ထည့်သွင်းပြီးပါပြီ')}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setFileLabel('');
              }}
              className="inline-flex items-center gap-1 text-[#A33030] hover:underline shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ဖယ်ရှား</span>
            </button>
          </div>

          {kind === 'audio' ? (
            <audio controls preload="metadata" src={value} className="w-full h-10" />
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              src={value}
              className="w-full max-h-48 rounded-xl bg-black object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#3D140F] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#3D140F]/15 text-sm text-[#2A1815] focus:outline-none focus:border-[#D4AF37]"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  maxLength: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#3D140F] mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3.5 rounded-xl bg-white border border-[#3D140F]/15 text-sm text-[#2A1815] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
      />
    </div>
  );
}

function ImageSelectorField({
  label,
  value,
  pendingFile,
  previewUrl,
  uploadProgress,
  onSelectFile,
  onSelectPreset,
}: {
  label: string;
  value: string;
  pendingFile: File | null;
  previewUrl: string | null;
  uploadProgress: number | null;
  onSelectFile: (file: File | null) => void;
  onSelectPreset: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayedSrc = previewUrl || value;

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-white border border-[#3D140F]/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-medium text-[#3D140F] flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-[#8C6810]" />
          <span>{label}</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = '';
            if (file) {
              onSelectFile(file);
            }
          }}
          className="hidden"
        />

        <button
          type="button"
          disabled={uploadProgress !== null}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3D140F] text-[#F3E5AB] hover:bg-[#541D16] text-xs font-medium min-h-[40px] cursor-pointer disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>{pendingFile ? 'ပုံအသစ်ပြောင်းရွေးရန်' : 'ဖုန်း Gallery မှ ပုံရွေးရန်'}</span>
        </button>
      </div>

      <p className="text-[11px] text-[#7D635B]">
        JPG, PNG, WebP, GIF (အများဆုံး 5MB) ရွေးချယ်နိုင်ပါသည်။ Save နှိပ်သည့်အခါ Firebase Storage သို့ တင်ပေးပါမည်။
      </p>

      {uploadProgress !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#3D140F]">
            <span>Firebase Storage သို့ ပုံတင်နေပါသည်...</span>
            <span className="tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EFE7D8] overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {displayedSrc && (
        <div className="space-y-2">
          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[#260B08] border border-[#3D140F]/15">
            <img
              src={displayedSrc}
              alt="အဖုံးပုံ Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {pendingFile && (
            <div className="flex items-center justify-between gap-2 text-xs text-[#5C4038] bg-[#FAF6EE] px-3 py-2 rounded-xl border border-[#D4AF37]/30">
              <span className="truncate font-medium">
                {pendingFile.name} ({formatFileSize(pendingFile.size)})
              </span>
              <button
                type="button"
                disabled={uploadProgress !== null}
                onClick={() => onSelectFile(null)}
                className="inline-flex items-center gap-1 text-[#A33030] hover:underline shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ဖယ်ရှား</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <span className="block text-[11px] text-[#6B4F47]">
          (သို့မဟုတ်) ကျောင်းတိုက် အသင့်သုံးပုံ ရွေးချယ်ရန် —
        </span>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_PRESETS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              disabled={uploadProgress !== null}
              onClick={() => onSelectPreset(preset.url)}
              className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer disabled:opacity-50 ${
                !pendingFile && value === preset.url
                  ? 'bg-[#3D140F] text-[#F3E5AB] border-[#3D140F]'
                  : 'bg-[#FAF6EE] text-[#5C4038] border-[#3D140F]/15 hover:border-[#D4AF37]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
