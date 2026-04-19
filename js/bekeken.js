(async function () {
  const { fetchList, starsPlain, backdropURL, prefetchBackdrops } = window.FilmAPI;
  const $ = sel => document.querySelector(sel);

  let state = {
    watched: [],
    filters: { minStars: 0, sort: 'rating', search: '' },
    genreFilters: new Set(),
    awardOnly: false,
  };

  const loading = $('#loading');

  try {
    const list = await fetchList();
    state.watched = list.watched;
    $('#film-count').textContent = `${list.watched.length} beoordeelde films in de collectie.`;
  } catch (e) {
    loading.textContent = `Kon films niet laden: ${e.message}`;
    return;
  }

  loading.hidden = true;
  $('#bekeken').hidden = false;

  renderGenrePills();
  renderWatched();
  bindFilters();
  bindGenrePillClicks();

  prefetchBackdrops(state.watched.map(f => ({ title: f.title, year: f.year })));

  // Async: enrich watched with genres in background, then re-render pills + grid
  (async () => {
    try {
      const ids = state.watched.map(f => f.id);
      const res = await fetch('/api/films/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return;
      const { meta } = await res.json();
      for (const f of state.watched) {
        const m = meta[f.id];
        if (m) {
          f.genres = m.genres || [];
          f.imdb = m.imdb || null;
        }
      }
      renderGenrePills();
      renderWatched();
    } catch (e) {
      console.error('genre enrichment failed:', e.message);
    }
  })();

  function renderWatched() {
    const { minStars, sort, search } = state.filters;
    let list = state.watched.filter(f => (f.stars || 0) >= minStars);
    if (search) list = list.filter(f => (f.title || '').toLowerCase().includes(search.toLowerCase()));
    if (state.genreFilters.size) {
      list = list.filter(f => (f.genres || []).some(g => state.genreFilters.has(g)));
    }
    if (state.awardOnly) {
      list = list.filter(f => (f.awardSummary?.wins || 0) + (f.awardSummary?.nominations || 0) > 0);
    }
    list.sort((a, b) => {
      if (sort === 'rating') return (b.stars || 0) - (a.stars || 0) || (a.title || '').localeCompare(b.title || '');
      if (sort === 'year-desc') return parseInt(b.year || 0) - parseInt(a.year || 0) || (a.title || '').localeCompare(b.title || '');
      if (sort === 'year-asc') return parseInt(a.year || 0) - parseInt(b.year || 0) || (a.title || '').localeCompare(b.title || '');
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    const container = $('#watched-grid');
    const sectioned = sort === 'year-desc' || sort === 'year-asc' || sort === 'rating';

    if (!sectioned) {
      container.innerHTML = renderGrid(list);
    } else {
      const groups = groupFilms(list, sort);
      container.innerHTML = groups.map(g => `
        <section class="bekeken-section">
          <header class="bekeken-section-head">
            <h3>${g.label}</h3>
            <span class="bekeken-section-count">${g.films.length} ${g.films.length === 1 ? 'film' : 'films'}</span>
          </header>
          ${renderGrid(g.films)}
        </section>
      `).join('');
    }
    $('#watched-count').textContent = `${list.length} films getoond.`;
  }

  function groupFilms(list, sort) {
    const groups = new Map();
    for (const f of list) {
      let key;
      if (sort === 'rating') key = f.stars || 0;
      else key = f.year || 'Onbekend jaar';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    const entries = Array.from(groups.entries());
    if (sort === 'rating') {
      entries.sort((a, b) => b[0] - a[0]);
      return entries.map(([k, films]) => ({
        label: k ? `${starsPlain(k)} — ${k} ${k === 1 ? 'ster' : 'sterren'}` : 'Zonder beoordeling',
        films,
      }));
    }
    if (sort === 'year-desc') entries.sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
    if (sort === 'year-asc') entries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    return entries.map(([k, films]) => ({ label: String(k), films }));
  }

  function renderGrid(list) {
    return `<div class="watchlist-row">${list.map(f => {
      const pills = (f.genres || []).slice(0, 3).map(g =>
        `<button type="button" class="genre-pill ${state.genreFilters.has(g) ? 'active' : ''}" data-genre="${escapeAttr(g)}" data-filter-source="card">${escapeHTML(g)}</button>`
      ).join('');
      return `
        <article class="watchlist-card" data-id="${escapeAttr(f.id)}">
          <a class="watchlist-card-link" href="film.html?id=${encodeURIComponent(f.id)}">
            <div class="watchlist-card-image" style="background-image:url('${backdropURL(f.title, f.year)}')">
              ${f.imdb && /^\d+(\.\d+)?$/.test(String(f.imdb).trim()) ? `<span class="imdb-badge">IMDb ${escapeHTML(f.imdb)}</span>` : ''}
              ${awardBadgeHTML(f.awardSummary)}
            </div>
            <div class="watchlist-card-body">
              <div class="watchlist-card-meta">
                <span class="year">${f.year || ''}</span>
                ${f.stars ? `<span class="stars">${starsPlain(f.stars)}</span>` : ''}
              </div>
              <h4>${escapeHTML(f.title || f.name)}</h4>
              ${f.description ? `<p>${escapeHTML(truncate(f.description, 120))}</p>` : ''}
            </div>
          </a>
          ${pills ? `<div class="watchlist-card-pills">${pills}</div>` : ''}
        </article>
      `;
    }).join('')}</div>`;
  }

  function truncate(str = '', n) {
    if (!str || str.length <= n) return str || '';
    return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }

  function awardBadgeHTML(summary) {
    if (!summary) return '';
    if (summary.wins) return `<span class="award-badge wins" title="${summary.wins} gewonnen">🏆 ${summary.wins}</span>`;
    if (summary.nominations) return `<span class="award-badge noms" title="${summary.nominations} nominatie${summary.nominations === 1 ? '' : 's'}">✦ ${summary.nominations}</span>`;
    return '';
  }

  function bindFilters() {
    $('#filter-stars').addEventListener('change', e => { state.filters.minStars = parseInt(e.target.value); renderWatched(); });
    $('#filter-sort').addEventListener('change', e => { state.filters.sort = e.target.value; renderWatched(); });
    $('#filter-search').addEventListener('input', e => { state.filters.search = e.target.value; renderWatched(); });
  }

  function bindGenrePillClicks() {
    document.addEventListener('click', e => {
      const pill = e.target.closest('.genre-pill');
      if (!pill) return;
      // Only handle pills in the bekeken page contexts (top filter row + cards)
      if (!pill.closest('#watched-genres') && !pill.closest('.watchlist-card-pills')) return;
      e.preventDefault();
      e.stopPropagation();
      if (pill.dataset.filter === 'awards') {
        state.awardOnly = !state.awardOnly;
      } else {
        const genre = pill.dataset.genre || '';
        if (!genre) {
          state.genreFilters.clear();
          state.awardOnly = false;
        } else if (state.genreFilters.has(genre)) {
          state.genreFilters.delete(genre);
        } else {
          state.genreFilters.add(genre);
        }
      }
      renderGenrePills();
      renderWatched();
      window.scrollTo({ top: document.querySelector('#watched-genres')?.offsetTop - 100 || 0, behavior: 'smooth' });
    });
  }

  function renderGenrePills() {
    const host = $('#watched-genres');
    if (!host) return;
    const counts = new Map();
    for (const f of state.watched) {
      for (const g of f.genres || []) counts.set(g, (counts.get(g) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) { host.innerHTML = ''; return; }
    const awardCount = state.watched.filter(f => (f.awardSummary?.wins || 0) + (f.awardSummary?.nominations || 0) > 0).length;
    host.innerHTML = `
      <button type="button" class="genre-pill ${!state.genreFilters.size && !state.awardOnly ? 'active' : ''}" data-genre="">Alle</button>
      ${awardCount ? `<button type="button" class="genre-pill award-filter ${state.awardOnly ? 'active' : ''}" data-filter="awards">🏆 Bekroond <span class="count">${awardCount}</span></button>` : ''}
      ${sorted.map(([g, n]) => `
        <button type="button" class="genre-pill ${state.genreFilters.has(g) ? 'active' : ''}" data-genre="${escapeAttr(g)}">
          ${escapeHTML(g)} <span class="count">${n}</span>
        </button>
      `).join('')}
    `;
  }

  function escapeAttr(str = '') { return escapeHTML(str).replace(/\s+/g, ' '); }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }
})();
