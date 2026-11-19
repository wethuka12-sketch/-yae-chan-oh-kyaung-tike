import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { type Request, type Response } from 'express';

const ADMIN_EMAIL = 'ashinzargara08@gmail.com';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB per media file
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface FirebaseClientConfig {
  apiKey?: string;
}

function getFirebaseApiKey(): string {
  try {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), 'firebase-applet-config.json'),
      'utf8'
    );
    const parsed = JSON.parse(raw) as FirebaseClientConfig;
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

function inferExtension(
  filenameParam: string,
  contentType: string,
  kind: 'audio' | 'video'
): string | null {
  const ext = path.extname(filenameParam).toLowerCase();
  if (kind === 'audio' && AUDIO_EXTS.has(ext)) return ext;
  if (kind === 'video' && VIDEO_EXTS.has(ext)) return ext;

  const lowerMime = contentType.toLowerCase();
  if (kind === 'audio') {
    if (lowerMime.includes('mpeg') || lowerMime.includes('mp3')) return '.mp3';
    if (lowerMime.includes('mp4') || lowerMime.includes('m4a')) return '.m4a';
    if (lowerMime.includes('wav')) return '.wav';
    if (lowerMime.includes('ogg')) return '.ogg';
    if (lowerMime.includes('aac')) return '.aac';
    if (lowerMime.startsWith('audio/')) return '.mp3';
  }
  if (kind === 'video') {
    if (lowerMime.includes('mp4')) return '.mp4';
    if (lowerMime.includes('webm')) return '.webm';
    if (lowerMime.includes('quicktime')) return '.mov';
    if (lowerMime.startsWith('video/')) return '.mp4';
  }
  return null;
}

async function verifyAdminIdToken(idToken: string): Promise<boolean> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey || !idToken) return false;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return false;
    const data = (await resp.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user || !user.email || !user.emailVerified) return false;
    return user.email.trim().toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();

  app.post('/api/media/upload', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const isAdmin = await verifyAdminIdToken(token);
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin permission required.' });
      return;
    }

    const kindParam = String(req.query.kind || '').toLowerCase();
    const kind: 'audio' | 'video' = kindParam === 'video' ? 'video' : 'audio';
    const rawFilename = String(req.query.filename || (kind === 'video' ? 'video.mp4' : 'audio.mp3'));
    const contentType = String(req.headers['content-type'] || '');

    const ext = inferExtension(rawFilename, contentType, kind);
    if (!ext) {
      res.status(400).json({
        error:
          kind === 'video'
            ? 'MP4 / WebM / MOV ဗီဒီယိုဖိုင်ကိုသာ ရွေးချယ်ပေးပါ။'
            : 'MP3 / M4A / WAV / AAC အသံဖိုင်ကိုသာ ရွေးချယ်ပေးပါ။',
      });
      return;
    }

    const contentLenHeader = Number(req.headers['content-length'] || 0);
    if (contentLenHeader > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'ဖိုင်အရွယ်အစား 100MB ထက် မကျော်လွန်ရပါ။' });
      return;
    }

    const safeId = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const savedFilename = `${safeId}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, savedFilename);

    let bytesWritten = 0;
    let aborted = false;
    const writeStream = fs.createWriteStream(targetPath);

    const cleanup = () => {
      try {
        writeStream.destroy();
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      } catch {
        // ignore cleanup errors
      }
    };

    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_UPLOAD_BYTES) {
        aborted = true;
        cleanup();
        if (!res.headersSent) {
          res.status(413).json({ error: 'ဖိုင်အရွယ်အစား 100MB ထက် မကျော်လွန်ရပါ။' });
        }
        req.destroy();
        return;
      }
      if (!writeStream.write(chunk)) {
        req.pause();
      }
    });

    writeStream.on('drain', () => {
      if (!aborted) req.resume();
    });

    req.on('end', () => {
      if (aborted) return;
      if (bytesWritten === 0) {
        cleanup();
        if (!res.headersSent) {
          res.status(400).json({ error: 'ဖိုင်ဒေတာ မပါရှိပါ။' });
        }
        return;
      }
      writeStream.end(() => {
        if (!res.headersSent) {
          res.status(201).json({
            url: `/api/media/${savedFilename}`,
            filename: savedFilename,
            originalName: rawFilename,
            size: bytesWritten,
            mimeType: MIME_MAP[ext] || 'application/octet-stream',
          });
        }
      });
    });

    req.on('error', () => {
      aborted = true;
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'ဖိုင်တင်ရာတွင် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်။' });
      }
    });

    writeStream.on('error', () => {
      aborted = true;
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'ဖိုင်သိမ်းဆည်းရာတွင် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်။' });
      }
    });
  });

  app.get('/api/media/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename || '');
    if (!/^[a-zA-Z0-9_-]+\.(mp3|m4a|wav|ogg|aac|mp4|webm|mov|m4v)$/.test(filename)) {
      res.status(404).end();
      return;
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
    const rangeHeader = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(chunkSize));
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(total));
    fs.createReadStream(filePath).pipe(res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
