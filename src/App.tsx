import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { Home, Headphones, Film, BookOpen, User as UserIcon, Plus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  isAdminUser,
  signInWithGooglePicker,
  signOutUser,
  syncUserProfile,
  togglePostReaction,
  addPostComment,
  deletePostComment,
  saveAdminPost,
  deleteAdminPost,
  saveAdminAudioTalk,
  deleteAdminAudioTalk,
  saveAdminVideo,
  deleteAdminVideo,
  saveAdminBook,
  deleteAdminBook,
} from './lib/firebase';
import {
  COMMUNITY_POSTS,
  AUDIO_TALKS,
  VIDEO_TEACHINGS,
  DHAMMA_BOOKS,
  type CommunityPost,
  type AudioTalk,
  type VideoTeaching,
  type DhammaBook,
} from './data/dhammaData';
import { getSynthesizedAudioUrl } from './lib/mediaSynthesizer';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  HomeFeedTab,
  type FirestoreComment,
  type FirestoreReaction,
} from './components/HomeFeedTab';
import { AudioPlayerTab } from './components/AudioPlayerTab';
import { StickyAudioBar } from './components/StickyAudioBar';
import { VideoPlayerTab } from './components/VideoPlayerTab';
import { ELibraryTab } from './components/ELibraryTab';
import { ProfileTab } from './components/ProfileTab';
import {
  AdminContentModal,
  type AdminModalTarget,
} from './components/AdminContentModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type TabId = 'home' | 'audio' | 'video' | 'books' | 'profile';

const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'ပင်မ', icon: Home },
  { id: 'audio', label: 'MP3 တရား', icon: Headphones },
  { id: 'video', label: 'MP4 ဗီဒီယို', icon: Film },
  { id: 'books', label: 'စာအုပ်များ', icon: BookOpen },
  { id: 'profile', label: 'ကိုယ်ရေး', icon: UserIcon },
];

const SPEEDS = [1, 1.25, 1.5] as const;

function mergeItems<T extends { id: string; isArchived?: boolean }>(
  defaults: T[],
  firestoreItems: T[]
): T[] {
  const byId = new Map<string, T>();
  defaults.forEach((item) => byId.set(item.id, item));
  firestoreItems.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).filter((item) => !item.isArchived);
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [reactions, setReactions] = useState<FirestoreReaction[]>([]);
  const [comments, setComments] = useState<FirestoreComment[]>([]);

  const [fsPosts, setFsPosts] = useState<CommunityPost[]>([]);
  const [fsAudioTalks, setFsAudioTalks] = useState<AudioTalk[]>([]);
  const [fsVideos, setFsVideos] = useState<VideoTeaching[]>([]);
  const [fsBooks, setFsBooks] = useState<DhammaBook[]>([]);

  const [adminModal, setAdminModal] = useState<AdminModalTarget | null>(null);

  // Global MP3 Audio Player State
  const [currentTrack, setCurrentTrack] = useState<AudioTalk | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  // Firebase Auth listener (handles sign-in, sign-out, and token/claims updates)
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        void syncUserProfile(firebaseUser).catch((err) => {
          console.error('Profile sync warning:', err);
        });
      }
    });
    return () => unsub();
  }, []);

  // Android hardware back button handling inside native APK
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      if (adminModal) {
        setAdminModal(null);
      } else if (activeTab !== 'home') {
        setActiveTab('home');
      } else {
        void CapacitorApp.exitApp();
      }
    });
    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [adminModal, activeTab]);

  // Firestore real-time reactions listener
  useEffect(() => {
    const reactionsQuery = query(
      collection(db, 'reactions'),
      where('isPublic', '==', true)
    );
    const unsub = onSnapshot(
      reactionsQuery,
      (snapshot) => {
        const list: FirestoreReaction[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            postId: String(d.postId || ''),
            userId: String(d.userId || ''),
            reactionType: d.reactionType === 'love' ? 'love' : 'good',
          };
        });
        setReactions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reactions');
      }
    );
    return () => unsub();
  }, []);

  // Firestore real-time comments listener
  useEffect(() => {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('isPublic', '==', true)
    );
    const unsub = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const list: FirestoreComment[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const ts = d.createdAt as Timestamp | undefined;
          return {
            id: docSnap.id,
            postId: String(d.postId || ''),
            authorId: String(d.authorId || ''),
            authorName: String(d.authorName || 'ဓမ္မမိတ်ဆွေ'),
            authorPhoto: String(d.authorPhoto || ''),
            text: String(d.text || ''),
            createdAtMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now(),
          };
        });
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'comments');
      }
    );
    return () => unsub();
  }, []);

  // Firestore real-time listeners for Admin-managed content
  useEffect(() => {
    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), where('isPublic', '==', true)),
      (snapshot) => {
        setFsPosts(
          snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              category: String(d.category || ''),
              dateMyanmar: String(d.dateMyanmar || ''),
              author: String(d.author || ''),
              title: String(d.title || ''),
              summary: String(d.summary || ''),
              body: String(d.body || ''),
              image: String(d.image || ''),
              imageAlt: String(d.imageAlt || ''),
              audioUrl: String(d.audioUrl || ''),
              videoUrl: String(d.videoUrl || ''),
              initialGood: Number(d.initialGood || 0),
              initialLove: Number(d.initialLove || 0),
              isArchived: Boolean(d.isArchived),
              fromFirestore: true,
            };
          })
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'posts')
    );

    const unsubAudio = onSnapshot(
      query(collection(db, 'audioTalks'), where('isPublic', '==', true)),
      (snapshot) => {
        setFsAudioTalks(
          snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const cat =
              d.category === 'ပရိတ်တော်' || d.category === 'သုတ္တန်'
                ? d.category
                : 'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ';
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              speaker: String(d.speaker || ''),
              category: cat,
              durationSec: Number(d.durationSec || 120),
              dateLabel: String(d.dateLabel || ''),
              description: String(d.description || ''),
              coverImage: String(d.coverImage || ''),
              audioUrl: String(d.audioUrl || ''),
              acoustic: {
                baseFreq: 164.81,
                harmonicFreq: 246.94,
                chimeIntervalSec: 12,
                durationSec: Number(d.durationSec || 120),
              },
              isArchived: Boolean(d.isArchived),
              fromFirestore: true,
            };
          })
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'audioTalks')
    );

    const unsubVideos = onSnapshot(
      query(collection(db, 'videos'), where('isPublic', '==', true)),
      (snapshot) => {
        setFsVideos(
          snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const defaultMatch = VIDEO_TEACHINGS.find((v) => v.id === docSnap.id);
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              speaker: String(d.speaker || ''),
              category: String(d.category || ''),
              durationSec: Number(d.durationSec || 75),
              dateLabel: String(d.dateLabel || ''),
              description: String(d.description || ''),
              thumbnail: String(d.thumbnail || ''),
              videoUrl: String(d.videoUrl || ''),
              acoustic: defaultMatch?.acoustic ?? {
                baseFreq: 146.83,
                harmonicFreq: 220.0,
                chimeIntervalSec: 10,
                durationSec: Number(d.durationSec || 75),
              },
              subtitles: defaultMatch?.subtitles ?? [
                {
                  atSec: 0,
                  pali: 'နမော တဿ ဘဂဝတော အရဟတော သမ္မာသမ္ဗုဒ္ဓဿ',
                  myanmar: String(d.description || d.title || ''),
                },
              ],
              isArchived: Boolean(d.isArchived),
              fromFirestore: true,
            };
          })
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'videos')
    );

    const unsubBooks = onSnapshot(
      query(collection(db, 'books'), where('isPublic', '==', true)),
      (snapshot) => {
        setFsBooks(
          snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const defaultMatch = DHAMMA_BOOKS.find((b) => b.id === docSnap.id);
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              author: String(d.author || ''),
              category: String(d.category || ''),
              pagesLabel: String(d.pagesLabel || ''),
              coverImage: String(d.coverImage || ''),
              synopsis: String(d.synopsis || ''),
              content: String(d.content || ''),
              pdfUrl: String(d.pdfUrl || ''),
              chapters: defaultMatch?.chapters ?? [],
              isArchived: Boolean(d.isArchived),
              fromFirestore: true,
            };
          })
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'books')
    );

    return () => {
      unsubPosts();
      unsubAudio();
      unsubVideos();
      unsubBooks();
    };
  }, []);

  const posts = useMemo(() => mergeItems(COMMUNITY_POSTS, fsPosts), [fsPosts]);
  const audioTalks = useMemo(() => mergeItems(AUDIO_TALKS, fsAudioTalks), [fsAudioTalks]);
  const videos = useMemo(() => mergeItems(VIDEO_TEACHINGS, fsVideos), [fsVideos]);
  const books = useMemo(() => mergeItems(DHAMMA_BOOKS, fsBooks), [fsBooks]);

  // Audio playback synchronization
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio || !currentTrack) return;

    const url =
      currentTrack.audioUrl?.trim() ||
      getSynthesizedAudioUrl(currentTrack.id, currentTrack.acoustic);
    const resolvedUrl = new URL(url, window.location.href).href;
    if (audio.src !== resolvedUrl) {
      audio.src = resolvedUrl;
      audio.playbackRate = SPEEDS[speedIndex];
      setAudioCurrentTime(0);
      setAudioDuration(currentTrack.durationSec);
    }

    if (isAudioPlaying) {
      void audio.play().catch(() => setIsAudioPlaying(false));
    } else {
      audio.pause();
    }
  }, [currentTrack, isAudioPlaying]);

  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.playbackRate = SPEEDS[speedIndex];
    }
  }, [speedIndex]);

  const handleSelectAudioTrack = (track: AudioTalk) => {
    if (currentTrack?.id === track.id) {
      setIsAudioPlaying((prev) => !prev);
    } else {
      setCurrentTrack(track);
      setIsAudioPlaying(true);
    }
  };

  const handlePrevTrack = () => {
    if (!currentTrack || audioTalks.length === 0) return;
    const idx = audioTalks.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = (idx - 1 + audioTalks.length) % audioTalks.length;
    setCurrentTrack(audioTalks[prevIdx]);
    setIsAudioPlaying(true);
  };

  const handleNextTrack = () => {
    if (!currentTrack || audioTalks.length === 0) return;
    const idx = audioTalks.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = (idx + 1) % audioTalks.length;
    setCurrentTrack(audioTalks[nextIdx]);
    setIsAudioPlaying(true);
  };

  const handleAudioSeek = (sec: number) => {
    setAudioCurrentTime(sec);
    if (audioElRef.current) {
      audioElRef.current.currentTime = sec;
    }
  };

  const handleCloseStickyPlayer = () => {
    setIsAudioPlaying(false);
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    setCurrentTrack(null);
  };

  const handleSignIn = async () => {
    await signInWithGooglePicker();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const userReactionCount = user
    ? reactions.filter((r) => r.userId === user.uid).length
    : 0;
  const userCommentCount = user
    ? comments.filter((c) => c.authorId === user.uid).length
    : 0;

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2A1815] flex flex-col">
      <audio
        ref={audioElRef}
        onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.duration) {
            setAudioDuration(e.currentTarget.duration);
          }
        }}
        onEnded={handleNextTrack}
        preload="auto"
      />

      {/* Top Navigation Bar (Safe-area top clearance on mobile; clean 3-zone bar on desktop) */}
      <header className="sticky top-0 z-30 pt-safe-mobile bg-[#3D140F] text-[#FAF6EE] border-b border-[#D4AF37]/30 shadow-sm">
        <div className="max-w-6xl mx-auto h-[52px] lg:h-16 px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="text-base sm:text-lg font-bold tracking-wide text-[#F3E5AB] whitespace-nowrap shrink-0 cursor-pointer"
          >
            ရေချမ်းအိုးကျောင်းတိုက်
          </button>

          <nav
            className="hidden lg:flex items-center gap-6"
            aria-label="အဓိက စာမျက်နှာများ"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 py-1.5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#D4AF37] border-[#D4AF37]'
                      : 'text-[#FAF6EE]/80 border-transparent hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-medium text-[#F3E5AB] whitespace-nowrap shrink-0 transition-colors min-h-[38px] cursor-pointer"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-[#D4AF37]" />
              )}
              <span className="truncate max-w-[110px]">
                {user ? user.displayName?.split(' ')[0] || 'အကောင့်' : 'ဝင်ရောက်ရန်'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7 smooth-scroll-container ${
          currentTrack ? 'pb-36 lg:pb-24' : 'pb-24 lg:pb-12'
        }`}
      >
        {activeTab === 'home' && (
          <HomeFeedTab
            user={user}
            isAdmin={isAdmin}
            posts={posts}
            reactions={reactions}
            comments={comments}
            onToggleReaction={async (postId, type, currentlyActive) => {
              if (!user) return;
              await togglePostReaction(postId, type, user.uid, currentlyActive);
            }}
            onAddComment={async (postId, text) => {
              if (!user) return;
              await addPostComment(postId, user, text);
            }}
            onDeleteComment={deletePostComment}
            onRequestSignIn={handleSignIn}
            onAdminAddPost={() => setAdminModal({ kind: 'post' })}
            onAdminEditPost={(post) => setAdminModal({ kind: 'post', item: post })}
            onAdminDeletePost={async (post) => {
              if (!user || !isAdmin) return;
              const isDefault = COMMUNITY_POSTS.some((p) => p.id === post.id);
              await deleteAdminPost(post.id, isDefault, post, user.uid);
            }}
          />
        )}

        {activeTab === 'audio' && (
          <AudioPlayerTab
            talks={audioTalks}
            isAdmin={isAdmin}
            currentTrack={currentTrack}
            isPlaying={isAudioPlaying}
            onSelectTrack={handleSelectAudioTrack}
            onAdminAddAudio={() => setAdminModal({ kind: 'audio' })}
            onAdminEditAudio={(talk) => setAdminModal({ kind: 'audio', item: talk })}
            onAdminDeleteAudio={async (talk) => {
              if (!user || !isAdmin) return;
              const isDefault = AUDIO_TALKS.some((t) => t.id === talk.id);
              await deleteAdminAudioTalk(
                talk.id,
                isDefault,
                { ...talk, audioUrl: talk.audioUrl || '' },
                user.uid
              );
              if (currentTrack?.id === talk.id) {
                handleCloseStickyPlayer();
              }
            }}
          />
        )}

        {activeTab === 'video' && (
          <VideoPlayerTab
            videos={videos}
            isAdmin={isAdmin}
            onVideoPlaybackStart={() => {
              if (isAudioPlaying) {
                setIsAudioPlaying(false);
              }
            }}
            onAdminAddVideo={() => setAdminModal({ kind: 'video' })}
            onAdminEditVideo={(video) => setAdminModal({ kind: 'video', item: video })}
            onAdminDeleteVideo={async (video) => {
              if (!user || !isAdmin) return;
              const isDefault = VIDEO_TEACHINGS.some((v) => v.id === video.id);
              await deleteAdminVideo(
                video.id,
                isDefault,
                { ...video, videoUrl: video.videoUrl || '' },
                user.uid
              );
            }}
          />
        )}

        {activeTab === 'books' && (
          <ELibraryTab
            books={books}
            isAdmin={isAdmin}
            onAdminAddBook={() => setAdminModal({ kind: 'book' })}
            onAdminEditBook={(book) => setAdminModal({ kind: 'book', item: book })}
            onAdminDeleteBook={async (book) => {
              if (!user || !isAdmin) return;
              const isDefault = DHAMMA_BOOKS.some((b) => b.id === book.id);
              await deleteAdminBook(
                book.id,
                isDefault,
                {
                  ...book,
                  content: book.content || book.synopsis,
                  pdfUrl: book.pdfUrl || '',
                },
                user.uid
              );
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            isAdmin={isAdmin}
            authLoading={authLoading}
            userReactionCount={userReactionCount}
            userCommentCount={userCommentCount}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Floating Admin Action Button (Only visible to verified ashinzargara08@gmail.com on content tabs) */}
      {isAdmin && activeTab !== 'profile' && (
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'home') setAdminModal({ kind: 'post' });
            else if (activeTab === 'audio') setAdminModal({ kind: 'audio' });
            else if (activeTab === 'video') setAdminModal({ kind: 'video' });
            else if (activeTab === 'books') setAdminModal({ kind: 'book' });
          }}
          className={`fixed right-4 lg:right-8 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#3D140F] text-[#F3E5AB] border border-[#D4AF37] shadow-lg hover:bg-[#541D16] active:scale-95 transition-all text-sm font-semibold min-h-[46px] cursor-pointer ${
            currentTrack ? 'bottom-36 lg:bottom-24' : 'bottom-20 lg:bottom-8'
          }`}
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>
            {activeTab === 'home'
              ? 'သတင်းအသစ်တင်ရန်'
              : activeTab === 'audio'
              ? 'MP3 အသစ်ထည့်ရန်'
              : activeTab === 'video'
              ? 'ဗီဒီယိုအသစ်ထည့်ရန်'
              : 'စာအုပ်အသစ်ထည့်ရန်'}
          </span>
        </button>
      )}

      {/* Admin Add/Edit Modal (Only accessible when verified ashinzargara08@gmail.com is signed in) */}
      {isAdmin && adminModal && user && (
        <AdminContentModal
          key={`${adminModal.kind}_${adminModal.item?.id ?? 'new'}`}
          target={adminModal}
          onClose={() => setAdminModal(null)}
          onSavePost={(data, id) => saveAdminPost(data, user.uid, id)}
          onSaveAudio={(data, id) => saveAdminAudioTalk(data, user.uid, id)}
          onSaveVideo={(data, id) => saveAdminVideo(data, user.uid, id)}
          onSaveBook={(data, id) => saveAdminBook(data, user.uid, id)}
        />
      )}

      {/* Sticky Bottom MP3 Audio Player */}
      {currentTrack && (
        <StickyAudioBar
          track={currentTrack}
          isPlaying={isAudioPlaying}
          currentTime={audioCurrentTime}
          duration={audioDuration}
          playbackRate={SPEEDS[speedIndex]}
          onTogglePlay={() => setIsAudioPlaying((p) => !p)}
          onSeek={handleAudioSeek}
          onPrev={handlePrevTrack}
          onNext={handleNextTrack}
          onCycleSpeed={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
          onClose={handleCloseStickyPlayer}
        />
      )}

      {/* Offline Mode Status Banner */}
      <OfflineIndicator hasStickyAudio={!!currentTrack} />

      {/* Mobile Fixed Bottom Navigation Bar (5 Tabs) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF6EE]/95 backdrop-blur-md border-t border-[#3D140F]/15 pb-safe gpu-accelerated"
        aria-label="မိုဘိုင်းလ် လမ်းညွှန်ဘား"
      >
        <div className="grid grid-cols-5 items-center h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
                  active ? 'text-[#3D140F]' : 'text-[#7D635B] hover:text-[#3D140F]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active ? 'text-[#B8860B] stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 tracking-tight whitespace-nowrap ${
                    active ? 'font-bold text-[#3D140F]' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
