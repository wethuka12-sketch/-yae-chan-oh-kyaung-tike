import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ThumbsUp,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  LogIn,
  Plus,
  Pencil,
  Headphones,
  Film,
} from 'lucide-react';
import { IMAGES, type CommunityPost } from '../data/dhammaData';
import { ResilientImage } from './ResilientImage';

export interface FirestoreReaction {
  id: string;
  postId: string;
  userId: string;
  reactionType: 'good' | 'love';
}

export interface FirestoreComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAtMs: number;
}

interface HomeFeedTabProps {
  user: User | null;
  isAdmin: boolean;
  posts: CommunityPost[];
  reactions: FirestoreReaction[];
  comments: FirestoreComment[];
  onToggleReaction: (
    postId: string,
    type: 'good' | 'love',
    currentlyActive: boolean
  ) => Promise<void>;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onRequestSignIn: () => Promise<void>;
  onAdminAddPost: () => void;
  onAdminEditPost: (post: CommunityPost) => void;
  onAdminDeletePost: (post: CommunityPost) => Promise<void>;
}

export const HomeFeedTab: React.FC<HomeFeedTabProps> = ({
  user,
  isAdmin,
  posts,
  reactions,
  comments,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
  onRequestSignIn,
  onAdminAddPost,
  onAdminEditPost,
  onAdminDeletePost,
}) => {
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(
    posts[0]?.id ?? null
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingPostId, setSubmittingPostId] = useState<string | null>(null);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [authNoticePostId, setAuthNoticePostId] = useState<string | null>(null);

  const toggleExpanded = (postId: string) => {
    setExpandedPostIds((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReactionClick = async (post: CommunityPost, type: 'good' | 'love') => {
    if (!user) {
      setAuthNoticePostId(post.id);
      return;
    }

    const key = `${post.id}_${type}`;
    if (pendingReactionKey === key) return;

    const currentlyActive = reactions.some(
      (r) => r.postId === post.id && r.reactionType === type && r.userId === user.uid
    );

    setPendingReactionKey(key);
    try {
      await onToggleReaction(post.id, type, currentlyActive);
    } finally {
      setPendingReactionKey(null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!user) {
      setAuthNoticePostId(postId);
      return;
    }
    const text = (commentDrafts[postId] || '').trim();
    if (!text || submittingPostId === postId) return;

    setSubmittingPostId(postId);
    try {
      await onAddComment(postId, text);
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } finally {
      setSubmittingPostId(null);
    }
  };

  const formatCommentDate = (ms: number) => {
    if (!ms) return 'မကြာသေးမီက';
    try {
      return new Intl.DateTimeFormat('my-MM', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ms));
    } catch {
      return 'မကြာသေးမီက';
    }
  };

  return (
    <div className="space-y-8 pb-6">
      {isAdmin && (
        <div className="bg-[#3D140F] text-[#FAF6EE] rounded-2xl px-4 py-3 border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-[#F3E5AB]">
            Admin စီမံခန့်ခွဲမှု · သတင်းနှင့် ဓမ္မဆောင်းပါးများ
          </span>
          <button
            type="button"
            onClick={onAdminAddPost}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] text-[#1E1E1E] text-xs sm:text-sm font-semibold hover:bg-[#E5C153] min-h-[40px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>သတင်းအသစ်တင်ရန်</span>
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#3D140F] shadow-sm border border-[#D4AF37]/25">
        <div className="relative h-64 sm:h-80 lg:h-96 w-full">
          <ResilientImage
            src={IMAGES.hero}
            alt="ရေချမ်းအိုးကျောင်းတိုက် မြင်ကွင်း"
            className="w-full h-full object-cover"
            fallbackTitle="ရေချမ်းအိုးကျောင်းတိုက်"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E0907]/95 via-[#3D140F]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10 text-[#FAF6EE]">
            <p className="text-xs sm:text-sm text-[#F3E5AB] tracking-wide mb-2">
              မင်္ဂလာအပေါင်းနှင့် ပြည့်စုံပါစေ · ဓမ္မမိတ်ဆွေများအတွက်
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug text-balance max-w-2xl">
              ရေချမ်းအိုးကျောင်းတိုက် ဓမ္မနှင့် လူမှုအသိုင်းအဝိုင်း
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
              “သဗ္ဗဒါနံ ဓမ္မဒါနံ ဇိနာတိ — တရားအလှူသည် အလှူအားလုံးတို့ကို အောင်မြင်၏”
            </p>
          </div>
        </div>
      </section>

      {/* Community Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3D140F]">
            ကျောင်းတိုက် သတင်းနှင့် ဓမ္မဆောင်းပါးများ
          </h2>
          <p className="text-sm text-[#6B4F47] mt-0.5">
            သာဓုခေါ်ဆိုမှုများနှင့် ဓမ္မသုတ မှတ်ချက်များ မျှဝေနိုင်ပါသည်
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onAdminAddPost}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3D140F] text-[#F3E5AB] text-sm font-medium hover:bg-[#541D16] min-h-[44px] self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>သတင်းအသစ်တင်ရန်</span>
          </button>
        )}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {posts.map((post) => {
          const postReactions = reactions.filter((r) => r.postId === post.id);
          const goodExtras = postReactions.filter((r) => r.reactionType === 'good').length;
          const loveExtras = postReactions.filter((r) => r.reactionType === 'love').length;
          const totalGood = post.initialGood + goodExtras;
          const totalLove = post.initialLove + loveExtras;

          const userLikedGood =
            !!user &&
            postReactions.some(
              (r) => r.reactionType === 'good' && r.userId === user.uid
            );
          const userLikedLove =
            !!user &&
            postReactions.some(
              (r) => r.reactionType === 'love' && r.userId === user.uid
            );

          const postComments = comments
            .filter((c) => c.postId === post.id)
            .sort((a, b) => b.createdAtMs - a.createdAtMs);

          const isExpanded = !!expandedPostIds[post.id];
          const isCommentsOpen = openCommentsPostId === post.id;

          return (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-[#3D140F]/10 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md"
            >
              {/* Post Image */}
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#260B08]">
                <ResilientImage
                  src={post.image}
                  alt={post.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  fallbackTitle={post.title}
                />
              </div>

              {/* Post Body */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Clean Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#7D5A50]">
                  <span className="font-semibold text-[#9B7514]">{post.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.dateMyanmar}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.author}</span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#3D140F] leading-relaxed">
                  {post.title}
                </h3>

                <p className="text-sm sm:text-[15px] text-[#422D28] leading-[1.75]">
                  {isExpanded ? post.body : post.summary}
                </p>

                {post.audioUrl && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#D4AF37]/35 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#3D140F]">
                      <Headphones className="w-4 h-4 text-[#8C6810]" />
                      <span>တွဲဖက်ပါ MP3 အသံဖိုင်</span>
                    </div>
                    <audio
                      controls
                      preload="metadata"
                      src={post.audioUrl}
                      className="w-full h-10"
                    />
                  </div>
                )}

                {post.videoUrl && (
                  <div className="p-2.5 rounded-2xl bg-[#1E1E1E] border border-[#D4AF37]/30 space-y-2">
                    <div className="flex items-center gap-2 px-1 text-xs font-medium text-[#F3E5AB]">
                      <Film className="w-4 h-4 text-[#D4AF37]" />
                      <span>တွဲဖက်ပါ MP4 ဗီဒီယို</span>
                    </div>
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      poster={post.image}
                      src={post.videoUrl}
                      className="w-full rounded-xl bg-black aspect-video object-contain"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(post.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8C6810] hover:text-[#3D140F] transition-colors min-h-[44px] px-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <span>အကျဉ်းချုပ်ကြည့်ရန်</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>အပြည့်အစုံ ဖတ်ရှုရန်</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAdminEditPost(post)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/15 hover:border-[#D4AF37] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>ပြင်ဆင်</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onAdminDeletePost(post)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#7A1C1C]/10 text-[#A33030] hover:bg-[#7A1C1C]/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ဖျက်</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Sign-In Notice if unauthenticated user taps react/comment */}
                {authNoticePostId === post.id && !user && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#D4AF37]/40 text-xs sm:text-sm text-[#3D140F]">
                    <span>
                      သာဓုခေါ်ဆိုရန်နှင့် မှတ်ချက်ရေးသားရန် Google အကောင့်ဖြင့် ဝင်ရောက်ပေးပါ။
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthNoticePostId(null);
                        void onRequestSignIn();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#3D140F] text-[#FAF6EE] text-xs font-medium whitespace-nowrap shrink-0 hover:bg-[#541D16] transition-colors min-h-[44px] cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Google ဖြင့် ဝင်ရန်</span>
                    </button>
                  </div>
                )}

                {/* Reaction & Comment Action Row */}
                <div className="pt-3 border-t border-[#3D140F]/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReactionClick(post, 'good')}
                      disabled={pendingReactionKey === `${post.id}_good`}
                      aria-pressed={userLikedGood}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] cursor-pointer active:scale-[0.97] ${
                        userLikedGood
                          ? 'bg-[#3D140F] text-[#F3E5AB] shadow-sm'
                          : 'bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/12 hover:border-[#D4AF37]'
                      }`}
                    >
                      <ThumbsUp
                        className={`w-4 h-4 ${
                          userLikedGood ? 'text-[#D4AF37] fill-[#D4AF37]/20' : 'text-[#8C6810]'
                        }`}
                      />
                      <span>Good</span>
                      <span className="tabular-nums text-xs opacity-90">{totalGood}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleReactionClick(post, 'love')}
                      disabled={pendingReactionKey === `${post.id}_love`}
                      aria-pressed={userLikedLove}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] cursor-pointer active:scale-[0.97] ${
                        userLikedLove
                          ? 'bg-[#7A1C1C] text-[#FAF6EE] shadow-sm'
                          : 'bg-[#FAF6EE] text-[#3D140F] border border-[#3D140F]/12 hover:border-[#D4AF37]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          userLikedLove ? 'text-[#FFB4B4] fill-[#FFB4B4]' : 'text-[#A33030]'
                        }`}
                      />
                      <span>Love</span>
                      <span className="tabular-nums text-xs opacity-90">{totalLove}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenCommentsPostId(isCommentsOpen ? null : post.id)
                    }
                    aria-expanded={isCommentsOpen}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] cursor-pointer ${
                      isCommentsOpen
                        ? 'bg-[#D4AF37]/20 text-[#3D140F]'
                        : 'text-[#5C4038] hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-[#8C6810]" />
                    <span>မှတ်ချက်</span>
                    <span className="tabular-nums text-xs">{postComments.length}</span>
                  </button>
                </div>

                {/* Comment Drawer Section */}
                {isCommentsOpen && (
                  <div className="pt-4 border-t border-[#3D140F]/10 space-y-4">
                    {/* Write a Comment */}
                    <form
                      onSubmit={(e) => void handleCommentSubmit(e, post.id)}
                      className="flex items-start gap-2.5"
                    >
                      <input
                        type="text"
                        maxLength={1000}
                        value={commentDrafts[post.id] || ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          user
                            ? 'သာဓုခေါ်ဆိုစကား သို့မဟုတ် မှတ်ချက်ရေးသားပါ...'
                            : 'မှတ်ချက်ရေးရန် Google ဖြင့် ဝင်ရောက်ပါ...'
                        }
                        className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#3D140F]/15 text-sm text-[#2A1815] placeholder:text-[#8E746C] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/25"
                      />
                      <button
                        type="submit"
                        disabled={submittingPostId === post.id}
                        aria-label="မှတ်ချက်ပေးပို့ရန်"
                        className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#3D140F] text-[#F3E5AB] hover:bg-[#541D16] transition-colors flex items-center justify-center gap-1.5 text-sm font-medium shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-[#D4AF37]" />
                        <span className="hidden sm:inline">ပို့ရန်</span>
                      </button>
                    </form>

                    {/* Comments List */}
                    {postComments.length === 0 ? (
                      <p className="text-xs sm:text-sm text-[#7D635B] py-2">
                        မှတ်ချက်များ မရှိသေးပါ။ ပထမဆုံး သာဓုခေါ်ဆို မှတ်ချက်ပေးနိုင်ပါသည်။
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto smooth-scroll-container pr-1">
                        {postComments.map((comment) => (
                          <div
                            key={comment.id}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF6EE]/80"
                          >
                            {comment.authorPhoto ? (
                              <img
                                src={comment.authorPhoto}
                                alt={comment.authorName}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#D4AF37]/40"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#3D140F] text-[#F3E5AB] flex items-center justify-center text-xs font-semibold shrink-0">
                                {comment.authorName.slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-semibold text-[#3D140F] truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[11px] text-[#8E746C] shrink-0">
                                    {formatCommentDate(comment.createdAtMs)}
                                  </span>
                                </div>
                                {((user && user.uid === comment.authorId) || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => void onDeleteComment(comment.id)}
                                    aria-label="မှတ်ချက်ဖျက်ရန်"
                                    className="p-1.5 text-[#8E746C] hover:text-[#A33030] transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-[#2A1815] mt-1 leading-relaxed break-words">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
