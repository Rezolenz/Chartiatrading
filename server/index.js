/**
 * CHARTIA backend (Node built-ins only — no npm install required)
 * - Serves static site
 * - GET /api/latest-video → latest public upload from @chartiatrading
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const HANDLE = (process.env.YT_HANDLE || 'chartiatrading').replace(/^@/, '');
const FALLBACK_VIDEO_ID = process.env.FALLBACK_VIDEO_ID || 'QsHCpkEbg-I';
const CACHE_MS = Number(process.env.VIDEO_CACHE_MS || 15 * 60 * 1000);
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let cache = { at: 0, payload: null };

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChartiaBot/1.0)',
          Accept: '*/*',
          ...headers,
        },
        timeout: 12000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(fetchText(res.headers.location, headers));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function extractVideoIdFromEntry(entryXml) {
  const ytId = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
  if (ytId) return ytId[1].trim();
  const link = entryXml.match(
    /<link[^>]+href="https?:\/\/www\.youtube\.com\/watch\?v=([^"&]+)"/i
  );
  if (link) return link[1].trim();
  return null;
}

function parseRssLatest(xml) {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry = entryMatch[1];
  const videoId = extractVideoIdFromEntry(entry);
  if (!videoId) return null;
  const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const publishedMatch = entry.match(/<published>([^<]+)<\/published>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim()
    : 'CHARTIA latest video';
  return {
    videoId,
    title,
    publishedAt: publishedMatch ? publishedMatch[1].trim() : null,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    channel: `@${HANDLE}`,
    channelUrl: `https://www.youtube.com/@${HANDLE}`,
    source: 'rss',
  };
}

async function resolveChannelId(handle) {
  const html = await fetchText(`https://www.youtube.com/@${handle}`);
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /channel_id=(UC[\w-]{20,})/,
    /\/channel\/(UC[\w-]{20,})/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  throw new Error('Could not resolve channel ID');
}

async function getLatestVideo() {
  const now = Date.now();
  if (cache.payload && now - cache.at < CACHE_MS) {
    return { ...cache.payload, cached: true };
  }

  let payload = null;
  try {
    const channelId = await resolveChannelId(HANDLE);
    const xml = await fetchText(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { Accept: 'application/atom+xml,application/xml,text/xml' }
    );
    payload = parseRssLatest(xml);
  } catch (err) {
    console.warn('[latest-video]', err.message);
  }

  if (!payload) {
    payload = {
      videoId: FALLBACK_VIDEO_ID,
      title: 'CHARTIA latest video',
      publishedAt: null,
      embedUrl: `https://www.youtube.com/embed/${FALLBACK_VIDEO_ID}`,
      watchUrl: `https://www.youtube.com/watch?v=${FALLBACK_VIDEO_ID}`,
      channel: `@${HANDLE}`,
      channelUrl: `https://www.youtube.com/@${HANDLE}`,
      source: 'fallback',
    };
  }

  cache = { at: now, payload };
  return { ...payload, cached: false };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function serveStatic(req, res) {
  let reqPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = safeJoin(ROOT, reqPath);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // extensionless HTML
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlTry = filePath + '.html';
    if (fs.existsSync(htmlTry)) filePath = htmlTry;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'chartia', handle: `@${HANDLE}` });
  }

  if (url.pathname === '/api/latest-video') {
    try {
      const data = await getLatestVideo();
      return sendJson(res, 200, data);
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, {
        error: 'Failed to resolve latest video',
        videoId: FALLBACK_VIDEO_ID,
        embedUrl: `https://www.youtube.com/embed/${FALLBACK_VIDEO_ID}`,
        source: 'fallback',
      });
    }
  }

  
  if (url.pathname === '/api/leads' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const leadsFile = path.join(ROOT, 'data', 'leads.json');
        fs.mkdirSync(path.dirname(leadsFile), { recursive: true });
        let list = [];
        try { list = JSON.parse(fs.readFileSync(leadsFile, 'utf8')); } catch (_) {}
        list.push({ ...data, receivedAt: new Date().toISOString() });
        fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2));
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`CHARTIA → http://localhost:${PORT}`);
  console.log(`API      → http://localhost:${PORT}/api/latest-video`);
  console.log(`Channel → @${HANDLE}`);
});
