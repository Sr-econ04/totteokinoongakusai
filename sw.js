// ペンライト：オフライン用の保存処理
// 中身を更新したときは VERSION の数字を上げてください（古い保存分が入れ替わります）
const VERSION = 'penlight-v15';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
];

// 初回に全ファイルを保存
self.addEventListener('install', e => {
  // cache:'reload' … ブラウザの一時保存（数分間残る）を通さず、必ず最新のファイルを取りに行く
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

// 古い保存分を消す
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 保存してあるものをすぐ返し、電波があれば裏で新しいものに更新しておく
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    const update = fetch(req, { cache: 'no-cache' })
      .then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => undefined);
    if (hit) { e.waitUntil(update); return hit; }
    return (await update) || new Response('', { status: 504 });
  })());
});
