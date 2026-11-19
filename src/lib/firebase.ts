import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const ADMIN_EMAIL = 'ashinzargara08@gmail.com';

export function isAdminUser(user: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL;
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

let nativeSocialInitialized = false;

async function ensureNativeSocialLogin(): Promise<void> {
  if (nativeSocialInitialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId: firebaseConfig.oAuthClientId,
      mode: 'online',
      skipAuthOnlyAuthorizationAfterSignIn: true,
    },
  });
  nativeSocialInitialized = true;
}

export async function signInWithGooglePicker(): Promise<User> {
  if (Capacitor.isNativePlatform()) {
    await ensureNativeSocialLogin();
    const loginRes = await SocialLogin.login({
      provider: 'google',
      options: {
        style: 'standard',
        filterByAuthorizedAccounts: false,
      },
    });
    const idToken =
      loginRes.result.responseType === 'online' ? loginRes.result.idToken : null;
    if (!idToken) {
      throw new Error('Google ID Token မရရှိပါသဖြင့် ထပ်မံကြိုးစားပေးပါ။');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    if (result.user) {
      await syncUserProfile(result.user);
    }
    return result.user;
  }

  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await syncUserProfile(result.user);
  }
  return result.user;
}

export async function signOutUser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNativeSocialLogin();
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // Ignore native provider logout errors
    }
  }
  await firebaseSignOut(auth);
}

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  const isImageMime = file.type ? file.type.startsWith('image/') : false;
  const isImageExt = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name);
  if (!isImageMime && !isImageExt) {
    return 'ပုံဖိုင် (JPG, PNG, WebP, GIF) ကိုသာ ရွေးချယ်ပေးပါ။';
  }
  if (file.size <= 0) {
    return 'ရွေးချယ်ထားသော ပုံဖိုင်တွင် ဒေတာ မပါရှိပါ။';
  }
  if (file.size > MAX_THUMBNAIL_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `ပုံဖိုင်အရွယ်အစား 5MB ထက် မကျော်လွန်ရပါ (ရွေးချယ်ထားသောဖိုင် - ${mb} MB)။`;
  }
  return null;
}

export async function uploadThumbnailToStorage(
  file: File,
  folder: 'audio' | 'video' | 'posts' | 'books',
  onProgress?: (percent: number) => void
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  if (!auth.currentUser) {
    throw new Error('Admin အကောင့်ဖြင့် ဝင်ရောက်ပြီးမှ ပုံတင်နိုင်ပါသည်။');
  }

  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const rand = Math.random().toString(36).slice(2, 8);
  const objectPath = `thumbnails/${folder}/${Date.now()}_${rand}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const metadata = {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public, max-age=31536000',
  };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.min(
            99,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
          onProgress(pct);
        }
      },
      (err) => {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: unknown }).code)
            : '';
        if (code === 'storage/unauthorized') {
          reject(
            new Error(
              'Firebase Storage ခွင့်ပြုချက် မရှိပါ (သို့) Storage Rules မသတ်မှတ်ရသေးပါ။ Firebase Console → Storage → Rules တွင် Admin ခွင့်ပြုချက် ထည့်သွင်းပေးပါ။'
            )
          );
        } else if (
          code === 'storage/bucket-not-found' ||
          code === 'storage/project-not-found' ||
          code === 'storage/unknown'
        ) {
          reject(
            new Error(
              'Firebase Storage ကို မဖွင့်ရသေးပါ။ Firebase Console → Build → Storage → Get Started ကို နှိပ်၍ ဖွင့်ပေးပါ။'
            )
          );
        } else if (code === 'storage/retry-limit-exceeded') {
          reject(
            new Error(
              'အင်တာနက်ချိတ်ဆက်မှု နှေးကွေးနေပါသဖြင့် ပုံတင်၍မရပါ။ ထပ်မံကြိုးစားပေးပါ။'
            )
          );
        } else {
          reject(
            new Error(
              err instanceof Error
                ? `ပုံတင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်: ${err.message}`
                : 'ပုံတင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
            )
          );
        }
      },
      () => {
        void getDownloadURL(task.snapshot.ref)
          .then((downloadUrl) => {
            onProgress?.(100);
            resolve(downloadUrl);
          })
          .catch((urlErr) => {
            reject(
              new Error(
                urlErr instanceof Error
                  ? urlErr.message
                  : 'ပုံ Download URL ရယူရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
              )
            );
          });
      }
    );
  });
}

const MAX_MEDIA_BYTES = 100 * 1024 * 1024; // 100 MB

export async function uploadMediaToStorage(
  file: File,
  kind: 'audio' | 'video',
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Admin အကောင့်ဖြင့် ဝင်ရောက်ပြီးမှ ဖိုင်တင်နိုင်ပါသည်။');
  }
  if (file.size <= 0) {
    throw new Error('ရွေးချယ်ထားသော ဖိုင်တွင် ဒေတာ မပါရှိပါ။');
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error('ဖိုင်အရွယ်အစား 100MB ထက် မကျော်လွန်ရပါ။');
  }

  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : kind === 'video' ? 'mp4' : 'mp3';
  const rand = Math.random().toString(36).slice(2, 8);
  const objectPath = `media/${kind}/${Date.now()}_${rand}.${ext}`;
  const storageRef = ref(storage, objectPath);
  const metadata = {
    contentType: file.type || (kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
    cacheControl: 'public, max-age=31536000',
  };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.min(
            99,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
          onProgress(pct);
        }
      },
      (err) => {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: unknown }).code)
            : '';
        if (code === 'storage/unauthorized') {
          reject(
            new Error(
              'Firebase Storage ခွင့်ပြုချက် မရှိပါ။ Firebase Console → Storage → Rules တွင် storage.rules ကို Publish လုပ်ပေးပါ။'
            )
          );
        } else if (
          code === 'storage/bucket-not-found' ||
          code === 'storage/project-not-found' ||
          code === 'storage/unknown'
        ) {
          reject(
            new Error(
              'Firebase Storage ကို မဖွင့်ရသေးပါ။ Firebase Console → Build → Storage → Get Started ကို နှိပ်၍ ဖွင့်ပေးပါ။'
            )
          );
        } else {
          reject(
            new Error(
              err instanceof Error
                ? `ဖိုင်တင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်: ${err.message}`
                : 'ဖိုင်တင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
            )
          );
        }
      },
      () => {
        void getDownloadURL(task.snapshot.ref)
          .then((downloadUrl) => {
            onProgress?.(100);
            resolve(downloadUrl);
          })
          .catch((urlErr) => {
            reject(
              new Error(
                urlErr instanceof Error
                  ? urlErr.message
                  : 'ဖိုင် Download URL ရယူရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။'
              )
            );
          });
      }
    );
  });
}

const pendingProfileSyncs = new Map<string, Promise<void>>();

export function syncUserProfile(user: User): Promise<void> {
  const existingPromise = pendingProfileSyncs.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async () => {
    const path = `userProfiles/${user.uid}`;
    const ref = doc(db, 'userProfiles', user.uid);

    const safeName = (user.displayName || user.email?.split('@')[0] || 'Dhamma Devotee')
      .trim()
      .slice(0, 100);
    const safeEmail = (user.email || 'user@gmail.com').trim().slice(0, 160);
    const safePhoto = (user.photoURL || '').trim().slice(0, 500);

    try {
      const snap = await getDocFromServer(ref).catch(() => getDoc(ref));
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          displayName: safeName,
          email: safeEmail,
          photoURL: safePhoto,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const prev = snap.data();
        if (!prev?.createdAt || !prev?.uid) {
          await setDoc(ref, {
            uid: user.uid,
            displayName: safeName,
            email: safeEmail,
            photoURL: safePhoto,
            createdAt: prev?.createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(ref, {
            displayName: safeName,
            email: safeEmail,
            photoURL: safePhoto,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      pendingProfileSyncs.delete(user.uid);
    }
  })();

  pendingProfileSyncs.set(user.uid, run);
  return run;
}

export async function togglePostReaction(
  postId: string,
  reactionType: 'good' | 'love',
  userId: string,
  currentlyActive: boolean
): Promise<void> {
  const sanitizedPostId = postId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
  const reactionId = `${sanitizedPostId}_${reactionType}_${userId}`;
  const path = `reactions/${reactionId}`;
  const ref = doc(db, 'reactions', reactionId);

  try {
    if (currentlyActive) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        postId: sanitizedPostId,
        userId,
        reactionType,
        isPublic: true,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentlyActive ? OperationType.DELETE : OperationType.CREATE,
      path
    );
  }
}

export async function addPostComment(
  postId: string,
  user: User,
  rawText: string
): Promise<void> {
  const sanitizedPostId = postId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
  const text = rawText.trim().slice(0, 1000);
  if (!text) return;

  const authorName = (user.displayName || user.email?.split('@')[0] || 'Dhamma Devotee')
    .trim()
    .slice(0, 100);
  const authorPhoto = (user.photoURL || '').trim().slice(0, 500);
  const path = 'comments';

  try {
    await addDoc(collection(db, 'comments'), {
      postId: sanitizedPostId,
      authorId: user.uid,
      authorName,
      authorPhoto,
      text,
      isPublic: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deletePostComment(commentId: string): Promise<void> {
  const path = `comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function sanitizeId(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
  return clean || `item_${Date.now()}`;
}

export interface PostInput {
  category: string;
  dateMyanmar: string;
  author: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  imageAlt: string;
  audioUrl?: string;
  videoUrl?: string;
  initialGood: number;
  initialLove: number;
  isArchived?: boolean;
}

export async function saveAdminPost(
  input: PostInput,
  adminUid: string,
  targetId?: string
): Promise<void> {
  const id = sanitizeId(targetId || `post_${Date.now()}`);
  const path = `posts/${id}`;
  const ref = doc(db, 'posts', id);
  const payload = {
    category: input.category.trim().slice(0, 80) || 'ကျောင်းတိုက် သတင်းလွှာ',
    dateMyanmar: input.dateMyanmar.trim().slice(0, 80) || 'ယနေ့',
    author: input.author.trim().slice(0, 100) || 'ရေချမ်းအိုးကျောင်းတိုက်',
    title: input.title.trim().slice(0, 200),
    summary: input.summary.trim().slice(0, 500),
    body: input.body.trim().slice(0, 5000),
    image: input.image.trim().slice(0, 1000),
    imageAlt: input.imageAlt.trim().slice(0, 200) || input.title.trim().slice(0, 200),
    audioUrl: (input.audioUrl || '').trim().slice(0, 1000),
    videoUrl: (input.videoUrl || '').trim().slice(0, 1000),
    initialGood: Math.max(0, Math.floor(input.initialGood || 0)),
    initialLove: Math.max(0, Math.floor(input.initialLove || 0)),
    isPublic: true,
    isArchived: Boolean(input.isArchived),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminPost(
  postId: string,
  isDefaultItem: boolean,
  fallbackData: PostInput,
  adminUid: string
): Promise<void> {
  const id = sanitizeId(postId);
  const path = `posts/${id}`;
  try {
    if (isDefaultItem) {
      await saveAdminPost({ ...fallbackData, isArchived: true }, adminUid, id);
    } else {
      await deleteDoc(doc(db, 'posts', id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface AudioTalkInput {
  title: string;
  speaker: string;
  category: 'ဒေါက်တာဘဒ္ဒန္တဉာဏိကတရားတော်များ' | 'ပရိတ်တော်' | 'သုတ္တန်';
  durationSec: number;
  dateLabel: string;
  description: string;
  coverImage: string;
  audioUrl: string;
  isArchived?: boolean;
}

export async function saveAdminAudioTalk(
  input: AudioTalkInput,
  adminUid: string,
  targetId?: string
): Promise<void> {
  const id = sanitizeId(targetId || `audio_${Date.now()}`);
  const path = `audioTalks/${id}`;
  const ref = doc(db, 'audioTalks', id);
  const payload = {
    title: input.title.trim().slice(0, 200),
    speaker: input.speaker.trim().slice(0, 120) || 'ဒေါက်တာဘဒ္ဒန္တဉာဏိက',
    category: input.category,
    durationSec: Math.min(36000, Math.max(10, Math.floor(input.durationSec || 120))),
    dateLabel: input.dateLabel.trim().slice(0, 100) || 'ဓမ္မဒေသနာ',
    description: input.description.trim().slice(0, 1000),
    coverImage: input.coverImage.trim().slice(0, 1000),
    audioUrl: input.audioUrl.trim().slice(0, 1000),
    isPublic: true,
    isArchived: Boolean(input.isArchived),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminAudioTalk(
  talkId: string,
  isDefaultItem: boolean,
  fallbackData: AudioTalkInput,
  adminUid: string
): Promise<void> {
  const id = sanitizeId(talkId);
  const path = `audioTalks/${id}`;
  try {
    if (isDefaultItem) {
      await saveAdminAudioTalk({ ...fallbackData, isArchived: true }, adminUid, id);
    } else {
      await deleteDoc(doc(db, 'audioTalks', id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface VideoInput {
  title: string;
  speaker: string;
  category: string;
  durationSec: number;
  dateLabel: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  isArchived?: boolean;
}

export async function saveAdminVideo(
  input: VideoInput,
  adminUid: string,
  targetId?: string
): Promise<void> {
  const id = sanitizeId(targetId || `video_${Date.now()}`);
  const path = `videos/${id}`;
  const ref = doc(db, 'videos', id);
  const payload = {
    title: input.title.trim().slice(0, 200),
    speaker: input.speaker.trim().slice(0, 120) || 'ရေချမ်းအိုးကျောင်းတိုက် ဆရာတော်',
    category: input.category.trim().slice(0, 100) || 'ဓမ္မသဘင် ဗီဒီယို',
    durationSec: Math.min(36000, Math.max(10, Math.floor(input.durationSec || 60))),
    dateLabel: input.dateLabel.trim().slice(0, 100) || 'HD · ဓမ္မဒေသနာ',
    description: input.description.trim().slice(0, 1000),
    thumbnail: input.thumbnail.trim().slice(0, 1000),
    videoUrl: input.videoUrl.trim().slice(0, 1000),
    isPublic: true,
    isArchived: Boolean(input.isArchived),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminVideo(
  videoId: string,
  isDefaultItem: boolean,
  fallbackData: VideoInput,
  adminUid: string
): Promise<void> {
  const id = sanitizeId(videoId);
  const path = `videos/${id}`;
  try {
    if (isDefaultItem) {
      await saveAdminVideo({ ...fallbackData, isArchived: true }, adminUid, id);
    } else {
      await deleteDoc(doc(db, 'videos', id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  pagesLabel: string;
  coverImage: string;
  synopsis: string;
  content: string;
  pdfUrl: string;
  isArchived?: boolean;
}

export async function saveAdminBook(
  input: BookInput,
  adminUid: string,
  targetId?: string
): Promise<void> {
  const id = sanitizeId(targetId || `book_${Date.now()}`);
  const path = `books/${id}`;
  const ref = doc(db, 'books', id);
  const payload = {
    title: input.title.trim().slice(0, 200),
    author: input.author.trim().slice(0, 120) || 'ရေချမ်းအိုးကျောင်းတိုက် စာပေဌာန',
    category: input.category.trim().slice(0, 100) || 'သုတ္တန်ပိဋကတ်',
    pagesLabel: input.pagesLabel.trim().slice(0, 100) || 'ဓမ္မစာပေ',
    coverImage: input.coverImage.trim().slice(0, 1000),
    synopsis: input.synopsis.trim().slice(0, 1000),
    content: input.content.trim().slice(0, 50000) || input.synopsis.trim().slice(0, 1000),
    pdfUrl: input.pdfUrl.trim().slice(0, 1000),
    isPublic: true,
    isArchived: Boolean(input.isArchived),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminBook(
  bookId: string,
  isDefaultItem: boolean,
  fallbackData: BookInput,
  adminUid: string
): Promise<void> {
  const id = sanitizeId(bookId);
  const path = `books/${id}`;
  try {
    if (isDefaultItem) {
      await saveAdminBook({ ...fallbackData, isArchived: true }, adminUid, id);
    } else {
      await deleteDoc(doc(db, 'books', id));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
