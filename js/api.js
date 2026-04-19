(function () {
  async function fetchList() {
    const res = await fetch('/api/films');
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async function fetchFilm(id) {
    const res = await fetch(`/api/film/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  async function fetchBatch(ids) {
    if (!ids?.length) return { films: [] };
    const res = await fetch('/api/films/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  function starsToHTML(stars) {
    if (!stars) return '';
    return '★'.repeat(stars) + '<span style="color: var(--rule)">' + '★'.repeat(5 - stars) + '</span>';
  }

  function starsPlain(stars) {
    if (!stars) return '';
    return '★'.repeat(stars);
  }

  function proxyImage(url) {
    if (!url) return '';
    return `/api/image?url=${encodeURIComponent(url)}`;
  }

  function posterURL(title, year) {
    const q = new URLSearchParams({ title, year: year || '' });
    return `/api/poster?${q}`;
  }

  function backdropURL(title, year) {
    const q = new URLSearchParams({ title, year: year || '' });
    return `/api/backdrop?${q}`;
  }

  async function prefetchBackdrops(films) {
    try {
      await fetch('/api/prefetch-backdrops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ films }),
      });
    } catch {}
  }

  async function fetchAwards() {
    const res = await fetch('/api/awards');
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  window.FilmAPI = { fetchList, fetchFilm, fetchBatch, starsToHTML, starsPlain, proxyImage, posterURL, backdropURL, prefetchBackdrops, fetchAwards };
})();
