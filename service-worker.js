const CACHE_NAME = "fridge-app-v10"; // ← 更新時は必ず変更

// 最初にキャッシュするファイル
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png"
];

// インストール
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// 有効化
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

// フェッチ処理（ここが超重要）
self.addEventListener("fetch", (event) => {

  // ❗ GET以外は絶対触らない（Firebase対策）
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // ❗ Firebaseや外部APIはキャッシュしない
  if (
    url.origin.includes("firebase") ||
    url.origin.includes("googleapis")
  ) {
    return;
  }

  // 🟢 HTMLは常に最新を取りに行く（重要）
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 🟡 画像・CSS・JSはキャッシュ優先（高速）
  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      return (
        cacheRes ||
        fetch(event.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
      );
    })
  );
});
