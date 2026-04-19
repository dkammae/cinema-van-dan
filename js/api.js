(function () {
  const isStatic = !!document.querySelector('meta[name="cinema-static"][content="true"]');

  function staticSlug(str) {
    return String(str || '').toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);
  }

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
    if (isStatic) return url; // direct fetch on static — bypass server proxy
    return `/api/image?url=${encodeURIComponent(url)}`;
  }

  function posterURL(title, year) {
    if (isStatic) {
      const slug = `${staticSlug(title)}${year ? '-' + year : ''}`;
      return `images/posters/${slug}.jpg`;
    }
    const q = new URLSearchParams({ title, year: year || '' });
    return `/api/poster?${q}`;
  }

  function backdropURL(title, year) {
    if (isStatic) {
      const slug = `${staticSlug(title)}${year ? '-' + year : ''}-backdrop`;
      return `images/backdrops/${slug}.jpg`;
    }
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
