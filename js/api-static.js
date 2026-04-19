// Static-mode adapter: when running on the published GitHub Pages snapshot,
// rewrite all /api/* fetches to read from data/*.json files in the same site.
// Detect static mode via <meta name="cinema-static" content="true"> in the HTML.
(function () {
  const isStatic = !!document.querySelector('meta[name="cinema-static"][content="true"]');
  if (!isStatic) return;

  document.body && document.body.setAttribute('data-static', 'true');
  document.addEventListener('DOMContentLoaded', () => document.body.setAttribute('data-static', 'true'));

  // Slugify mirrors server.js slugify()
  function slugify(str) {
    return String(str || '').toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);
  }
  function normalizeName(name) {
    return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, '-').slice(0, 80);
  }
  function readQuery(s) {
    const o = {};
    const idx = s.indexOf('?');
    if (idx === -1) return o;
    for (const part of s.slice(idx + 1).split('&')) {
      const [k, v = ''] = part.split('=');
      o[decodeURIComponent(k)] = decodeURIComponent(v);
    }
    return o;
  }

  // In-memory caches for the meta map and actor photo map
  let metaMapPromise = null;
  function loadMetaMap() {
    if (!metaMapPromise) metaMapPromise = fetch('data/films-meta.json').then(r => r.json()).catch(() => ({}));
    return metaMapPromise;
  }
  let actorMapPromise = null;
  function loadActorMap() {
    if (!actorMapPromise) actorMapPromise = fetch('data/actor-photos.json').then(r => r.json()).catch(() => ({}));
    return actorMapPromise;
  }

  function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  }
  function notSupportedResponse() {
    return jsonResponse({ error: 'Schrijven kan alleen vanaf de laptop. Mobiele versie is read-only.' }, 405);
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init?.method || (typeof input === 'object' ? input.method : 'GET') || 'GET').toUpperCase();

    if (!url.startsWith('/api/') && !url.startsWith('http://localhost') && !url.startsWith('/api')) {
      return origFetch(input, init);
    }

    // Block writes
    if (method !== 'GET') {
      if (url.includes('/api/trivia/') || url.includes('/api/refresh') || url.includes('/api/publish') || url.includes('/api/awards/refresh') || url.includes('/api/prefetch')) {
        return notSupportedResponse();
      }
      if (url.includes('/api/films/meta')) {
        // POST films meta — convert to lookup from static map
        const ids = (init?.body ? JSON.parse(init.body).ids : []) || [];
        const map = await loadMetaMap();
        const meta = {};
        for (const id of ids) if (map[id]) meta[id] = map[id];
        return jsonResponse({ meta });
      }
    }

    // GET routes
    if (url === '/api/films') return origFetch('data/films.json');
    if (url.startsWith('/api/film/')) {
      const id = url.split('/api/film/')[1].split('?')[0];
      return origFetch(`data/film/${encodeURIComponent(id)}.json`);
    }
    if (url === '/api/awards') return origFetch('data/awards.json');
    if (url.startsWith('/api/director/')) {
      const name = decodeURIComponent(url.split('/api/director/')[1].split('?')[0]);
      return origFetch(`data/director/${normalizeName(name)}.json`);
    }
    if (url.startsWith('/api/trivia/')) {
      const id = url.split('/api/trivia/')[1].split('?')[0].split('/')[0];
      return origFetch(`data/trivia/${encodeURIComponent(id)}.json`).catch(() => jsonResponse({ trivia: [], userTrivia: [] }));
    }
    if (url.startsWith('/api/actor-photo')) {
      const q = readQuery(url);
      const map = await loadActorMap();
      const u = map[q.name?.toLowerCase()] || null;
      return jsonResponse({ name: q.name, url: u });
    }
    if (url.startsWith('/api/poster')) {
      const q = readQuery(url);
      const slug = `${slugify(q.title)}${q.year ? '-' + q.year : ''}`;
      return origFetch(`images/posters/${slug}.jpg`);
    }
    if (url.startsWith('/api/backdrop')) {
      const q = readQuery(url);
      const slug = `${slugify(q.title)}${q.year ? '-' + q.year : ''}-backdrop`;
      return origFetch(`images/backdrops/${slug}.jpg`);
    }
    if (url.startsWith('/api/image')) {
      // Pass-through to the original URL (image is hosted externally e.g. firebase)
      const q = readQuery(url);
      return origFetch(q.url);
    }
    if (url.startsWith('/api/cache-status')) {
      return origFetch('data/manifest.json');
    }
    if (url.startsWith('/api/films/batch')) {
      // Not used on read paths; return empty
      return jsonResponse({ films: [] });
    }

    // Default: try fall-through (the live server might handle it; on static this 404s)
    return origFetch(input, init);
  };
})();
