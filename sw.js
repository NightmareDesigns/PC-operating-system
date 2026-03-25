/**
 * NightmareOS Service Worker — Proxy & Cache
 * ──────────────────────────────────────────────────────────────────────
 * Handles two roles:
 *
 *   1. PROXY  — /nmproxy?url=<encoded-url>
 *      Fetches the target URL, strips X-Frame-Options and
 *      frame-ancestors CSP directives, injects a tiny anti-frame-bust
 *      patch, then returns the rewritten response.
 *      Works for any site that does NOT enforce CORS (same-origin) policy
 *      from a server side AND does not use JS-level frame detection.
 *      Note: Amazon Midway uses JS-level detection — the proxy can strip
 *      the headers but cannot override browser same-origin restrictions
 *      that Midway's own JS enforces.
 *
 *   2. CACHE  — caches NightmareOS app shell for offline use.
 */

'use strict';

const CACHE_NAME  = 'nightmareos-v5';
const PROXY_PATH  = '/nmproxy';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable-512.svg',
  '/css/desktop.css',
  '/css/apps.css',
  '/js/desktop.js',
  '/js/windowmanager.js',
  '/js/boot.js',
  '/js/sync.js',
  '/js/apps/filemanager.js',
  '/js/apps/texteditor.js',
  '/js/apps/calculator.js',
  '/js/apps/terminal.js',
  '/js/apps/webbrowser.js',
  '/js/apps/settings.js',
  '/js/apps/imagegallery.js',
  '/js/apps/clock.js',
  '/js/apps/matrix.js',
  '/js/apps/paint.js',
  '/js/apps/snake.js',
  '/js/apps/musicplayer.js',
  '/js/apps/stickynotes.js',
  '/js/apps/calendar.js',
  '/js/apps/sysmonitor.js',
  '/js/apps/videoplayer.js',
  '/js/apps/adminpanel.js',
  '/js/apps/appstore.js',
  '/js/apps/firefox.js',
  '/js/apps/scriptmanager.js',
  '/js/apps/todolist.js',
  '/js/apps/stopwatch.js',
  '/js/apps/colorpicker.js',
  '/js/apps/markdown.js',
  '/js/apps/pomodoro.js',
  '/js/apps/weather.js',
  '/js/apps/passwordgen.js',
  '/js/apps/unitconverter.js',
  '/js/apps/habittracker.js',
  '/js/apps/systeminfo.js',
];

/* ── Install: cache app shell ──────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ──────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Route: proxy */
  if (url.pathname === PROXY_PATH || url.pathname.startsWith(PROXY_PATH + '?')) {
    event.respondWith(handleProxy(event.request, url));
    return;
  }

  /* Route: app shell — serve from cache, fallback to network */
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

/* ── Proxy handler ──────────────────────────────────────────────────── */
async function handleProxy(request, proxyUrl) {
  const targetRaw = proxyUrl.searchParams.get('url');
  if (!targetRaw) return textResponse(400, 'Missing url parameter');

  let targetUrl;
  try { targetUrl = new URL(decodeURIComponent(targetRaw)); }
  catch (_) { return textResponse(400, 'Invalid URL'); }

  // Only allow http/https
  if (!/^https?:$/.test(targetUrl.protocol)) return textResponse(400, 'Only http/https allowed');

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method:  request.method,
      headers: buildForwardHeaders(request.headers),
      body:    request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
      credentials: 'omit',   // can't forward cookies cross-origin
    });

    /* Strip headers that block iframe embedding */
    const outHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (lower === 'x-frame-options') return;
      if (lower === 'content-security-policy') {
        // Rewrite CSP: drop frame-ancestors directive only
        const csp = value.replace(/frame-ancestors[^;]*(;|$)/gi, '').trim();
        if (csp) outHeaders.set(name, csp);
        return;
      }
      if (lower === 'content-security-policy-report-only') return;
      outHeaders.set(name, value);
    });

    const contentType = upstream.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const html  = await upstream.text();
      const patch = buildPatch(targetUrl.toString(), proxyUrl.origin);
      const rewritten = injectPatch(html, patch);
      outHeaders.set('content-type', 'text/html; charset=utf-8');
      return new Response(rewritten, { status: upstream.status, headers: outHeaders });
    }

    /* Pass other content types through */
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });

  } catch (err) {
    return textResponse(502, `Proxy error: ${err.message}`);
  }
}

/* ── Build forwarding headers ───────────────────────────────────────── */
function buildForwardHeaders(incoming) {
  const out = {};
  const allow = ['accept', 'accept-language', 'content-type', 'range'];
  incoming.forEach((v, k) => { if (allow.includes(k.toLowerCase())) out[k] = v; });
  return out;
}

/* ── Anti-frame-bust patch injected into proxied HTML ────────────────
 *
 *  This patch runs before page scripts and attempts to neutralise
 *  common frame-busting techniques:
 *    • Overrides window.top / window.parent to return `window` itself.
 *    • Prevents location-based redirects out of the frame.
 *
 *  Limitations: browsers protect window.top as non-configurable in some
 *  contexts; Amazon Midway's redirect is done before this script can run
 *  because it is triggered by the server-side 302 redirect, not JS.
 * ───────────────────────────────────────────────────────────────────── */
function buildPatch(originalUrl, proxyOrigin) {
  const escaped = JSON.stringify(originalUrl);
  const proxy   = JSON.stringify(proxyOrigin + '/nmproxy?url=');
  return `<script data-nightmareos-proxy-patch="1">
(function(){
  'use strict';
  var _self = window;
  try { Object.defineProperty(window,'top',{get:function(){return _self;},configurable:true}); } catch(e){}
  try { Object.defineProperty(window,'parent',{get:function(){return _self;},configurable:true}); } catch(e){}

  /* Intercept in-page navigation and route through proxy */
  var _origAssign   = location.assign.bind(location);
  var _origReplace  = location.replace.bind(location);
  function proxyUrl(u){
    try{ return ${proxy}+encodeURIComponent(new URL(u,${escaped}).href); }
    catch(e){ console.warn('[nmproxy] Could not rewrite URL:', u, e); return u; }
  }
  try {
    location.assign  = function(u){ _origAssign(proxyUrl(u)); };
    location.replace = function(u){ _origReplace(proxyUrl(u)); };
  } catch(e){}

  /* Tell parent the page loaded successfully */
  try { window.parent.postMessage({type:'nmproxy-loaded',url:${escaped}},'*'); } catch(e){}
})();
</script>`;
}

function injectPatch(html, patch) {
  if (html.includes('<head>'))  return html.replace('<head>',  '<head>'  + patch);
  if (html.includes('<HEAD>'))  return html.replace('<HEAD>',  '<HEAD>'  + patch);
  if (html.includes('<html>'))  return html.replace('<html>',  '<html>'  + patch);
  if (html.includes('<HTML>'))  return html.replace('<HTML>',  '<HTML>'  + patch);
  return patch + html;
}

function textResponse(status, body) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}
