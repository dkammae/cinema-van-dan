(async function () {
  const { fetchList, fetchBatch, starsPlain, proxyImage, posterURL, backdropURL } = window.FilmAPI;
  const $ = sel => document.querySelector(sel);

  const dateEl = $('#issue-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  let state = {
    watched: [],
    watchlist: [],
    enriched: new Map(),
    watchlistGroup: 'disc',
    watchlistSort: 'release',
    genreFilters: new Set(),
    awardOnly: false,
  };

  const loading = $('#loading');

  try {
    const list = await fetchList();
    state.watched = list.watched;
    state.watchlist = list.watchlist;
    $('#film-count').textContent = `${list.count} films geïndexeerd.`;
  } catch (e) {
    loading.textContent = `Kon films niet laden: ${e.message}`;
    return;
  }

  loading.hidden = true;
  $('#hero').hidden = false;
  $('#recensies').hidden = false;
  $('#watchlist').hidden = false;

  renderWatchlistHero();
  renderWatchlist();
  $('#watchlist-group')?.addEventListener('change', e => {
    state.watchlistGroup = e.target.value;
    renderWatchlist();
  });
  $('#watchlist-sort')?.addEventListener('change', e => {
    state.watchlistSort = e.target.value;
    renderWatchlist();
  });
  document.addEventListener('click', e => {
    const pill = e.target.closest('.genre-pill');
    if (pill) {
      e.preventDefault();
      if (pill.dataset.filter === 'awards') {
        state.awardOnly = !state.awardOnly;
        renderWatchlist();
        return;
      }
      const genre = pill.dataset.genre || '';
      if (!genre) {
        // "Alle" — leeg de selectie
        state.genreFilters.clear();
        state.awardOnly = false;
      } else if (state.genreFilters.has(genre)) {
        state.genreFilters.delete(genre);
      } else {
        state.genreFilters.add(genre);
      }
      renderWatchlist();
      return;
    }
    const toggle = e.target.closest('.watchlist-card-toggle');
    if (toggle) {
      e.preventDefault();
      const card = toggle.closest('.watchlist-card');
      toggleTrivia(card);
    }
  });

  const triviaCache = new Map();
  async function toggleTrivia(card) {
    const panel = card.querySelector('.watchlist-card-trivia');
    const content = panel.querySelector('.trivia-content');
    const toggleBtn = card.querySelector('.watchlist-card-toggle');
    const id = card.dataset.id;
    const isOpen = !panel.hidden;
    if (isOpen) {
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    panel.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (!content.dataset.loaded) {
      content.innerHTML = '<p class="trivia-loading">Weetjes ophalen…</p>';
      try {
        let payload = triviaCache.get(id);
        if (!payload) {
          const res = await fetch(`/api/trivia/${encodeURIComponent(id)}`);
          payload = await res.json();
          triviaCache.set(id, payload);
        }
        const items = payload.trivia || [];
        const userItems = payload.userTrivia || [];
        if (!items.length && !userItems.length) {
          content.innerHTML = '<p class="trivia-empty">Geen weetjes gevonden.</p>';
        } else {
          const generated = items.map(t => `<li>${escapeHTML(t)}</li>`).join('');
          const userHTML = userItems.map(u => `
            <li class="trivia-user">
              <span class="trivia-user-tag">eigen</span>
              ${escapeHTML(typeof u === 'string' ? u : u.text)}
            </li>
          `).join('');
          content.innerHTML = `<ul class="trivia-list">${generated}${userHTML}</ul>`;
        }
        content.dataset.loaded = '1';
      } catch (err) {
        content.innerHTML = `<p class="trivia-empty">Fout: ${escapeHTML(err.message || 'onbekend')}</p>`;
      }
    }
  }

  const reviewSeed = pickReviewCandidates();
  enrichAndRenderReviews(reviewSeed);

  async function enrichAndRenderReviews(ids) {
    if (!ids.length) return;
    const { films } = await fetchBatch(ids);
    for (const f of films) if (f?.id) state.enriched.set(f.id, f);
    const withReview = films.filter(f => f?.review && f.review.trim().length > 30);
    if (withReview.length) {
      renderReviews(withReview.slice(0, 6));
    } else {
      renderReviews(films.filter(f => f?.stars >= 4 && f?.banner).slice(0, 4));
    }
  }

  function pickReviewCandidates() {
    const fiveStars = state.watched.filter(f => f.stars === 5).map(f => f.id);
    const fourStars = state.watched.filter(f => f.stars === 4).map(f => f.id);
    return [...fiveStars, ...fourStars].slice(0, 24);
  }

  function renderWatchlistHero() {
    const hero = $('#hero');
    const pool = state.watchlist.filter(f => f.title);
    if (!pool.length) { hero.hidden = true; return; }
    const withDesc = pool.filter(f => f.description);
    const source = withDesc.length ? withDesc : pool;
    const candidate = source[Math.floor(Math.random() * source.length)];
    const backdropSrc = backdropURL(candidate.title, candidate.year);
    hero.innerHTML = `
      <div class="hero-image" style="background-image:url('${backdropSrc}')" data-id="${candidate.id}"></div>
      <div class="hero-body">
        <span class="hero-kicker">Uitgelicht uit je watchlist</span>
        <h2 class="hero-title">${escapeHTML(candidate.title)}</h2>
        <p class="hero-year-dir">${candidate.year || ''}</p>
        ${candidate.description ? `<p class="hero-quote">${escapeHTML(candidate.description)}</p>` : ''}
        <a class="hero-cta" href="film.html?id=${encodeURIComponent(candidate.id)}">Bekijk details →</a>
      </div>
    `;
  }

  function renderReviews(films) {
    const container = $('#review-grid');
    if (!films.length) {
      $('#recensies').hidden = true;
      return;
    }
    container.innerHTML = films.map(f => `
      <article class="review-card">
        ${f.banner ? `<div class="review-card-image" style="background-image:url('${proxyImage(f.banner)}')"></div>` : ''}
        <div class="review-card-meta">
          <span>${f.year || ''}</span>
          <span class="stars">${starsPlain(f.stars) || ''}</span>
        </div>
        <h3><a href="film.html?id=${encodeURIComponent(f.id)}">${escapeHTML(f.title || f.name)}</a></h3>
        <p>${escapeHTML(truncate(f.review || f.synopsis || f.description || '', 220))}</p>
      </article>
    `).join('');
  }

  function renderWatchlist() {
    const container = $('#watchlist-strip');
    if (!state.watchlist.length) {
      $('#watchlist').hidden = true;
      return;
    }

    renderGenrePills();
    let filtered = state.genreFilters.size
      ? state.watchlist.filter(f => (f.genres || []).some(g => state.genreFilters.has(g)))
      : state.watchlist;
    if (state.awardOnly) {
      filtered = filtered.filter(f => (f.awardSummary?.wins || 0) + (f.awardSummary?.nominations || 0) > 0);
    }
    const sorted = sortWatchlist(filtered, state.watchlistSort);
    const grouped = groupWatchlist(sorted, state.watchlistGroup);
    if (grouped.length === 1 && !grouped[0].label) {
      container.innerHTML = `<div class="watchlist-row">${grouped[0].films.map(cardHTML).join('')}</div>`;
    } else {
      container.innerHTML = grouped.map(g => `
        <section class="watchlist-group">
          <header class="watchlist-group-head">
            <h3>${escapeHTML(g.label)}</h3>
            <span class="watchlist-group-count">${g.films.length} ${g.films.length === 1 ? 'film' : 'films'}</span>
          </header>
          <div class="watchlist-row">${g.films.map(cardHTML).join('')}</div>
        </section>
      `).join('');
    }
    prefetchBackdropsFromAPI();
  }

  function cardHTML(f) {
    const pills = (f.genres || []).slice(0, 3).map(g =>
      `<button type="button" class="genre-pill ${state.genreFilters.has(g) ? 'active' : ''}" data-genre="${escapeAttr(g)}">${escapeHTML(g)}</button>`
    ).join('');
    return `
      <article class="watchlist-card${f.onDisc ? ' on-disc' : ''}" data-id="${escapeAttr(f.id)}">
        <button type="button" class="watchlist-card-toggle" aria-expanded="false">
          <div class="watchlist-card-image" style="background-image:url('${backdropURL(f.title, f.year)}')">
            ${f.onDisc ? '<span class="disc-badge">op disc</span>' : ''}
            ${f.imdb && /^\d+(\.\d+)?$/.test(String(f.imdb).trim()) ? `<span class="imdb-badge">IMDb ${escapeHTML(f.imdb)}</span>` : ''}
            ${awardBadgeHTML(f.awardSummary)}
          </div>
          <div class="watchlist-card-body">
            <div class="watchlist-card-meta">
              <span class="year">${f.year || ''}</span>
            </div>
            <h4>${escapeHTML(f.title || f.name)}</h4>
            ${f.description ? `<p>${escapeHTML(truncate(f.description, 120))}</p>` : ''}
          </div>
        </button>
        ${pills ? `<div class="watchlist-card-pills">${pills}</div>` : ''}
        <div class="watchlist-card-trivia" hidden>
          <div class="trivia-content"></div>
          <a class="trivia-detail-link" href="film.html?id=${encodeURIComponent(f.id)}">Volledige filmpagina →</a>
        </div>
      </article>
    `;
  }

  function renderGenrePills() {
    const host = $('#watchlist-genres');
    if (!host) return;
    const counts = new Map();
    for (const f of state.watchlist) {
      for (const g of f.genres || []) counts.set(g, (counts.get(g) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) { host.innerHTML = ''; return; }
    const awardCount = state.watchlist.filter(f => (f.awardSummary?.wins || 0) + (f.awardSummary?.nominations || 0) > 0).length;
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

  function awardBadgeHTML(summary) {
    if (!summary) return '';
    if (summary.wins) return `<span class="award-badge wins" title="${summary.wins} gewonnen">🏆 ${summary.wins}</span>`;
    if (summary.nominations) return `<span class="award-badge noms" title="${summary.nominations} nominatie${summary.nominations === 1 ? '' : 's'}">✦ ${summary.nominations}</span>`;
    return '';
  }

  function sortWatchlist(films, mode) {
    const list = [...films];
    const titleCmp = (a, b) => (a.title || '').localeCompare(b.title || '');
    const yearOf = f => parseInt(f.year || 0, 10) || 0;
    if (mode === 'year-asc') list.sort((a, b) => yearOf(a) - yearOf(b) || titleCmp(a, b));
    else if (mode === 'year-desc') list.sort((a, b) => yearOf(b) - yearOf(a) || titleCmp(a, b));
    else if (mode === 'disc') list.sort((a, b) => (b.onDisc ? 1 : 0) - (a.onDisc ? 1 : 0) || (a.releaseDate || '').localeCompare(b.releaseDate || ''));
    else if (mode === 'title') list.sort(titleCmp);
    else list.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
    return list;
  }

  function groupWatchlist(films, mode) {
    if (mode === 'disc') {
      const onDisc = films.filter(f => f.onDisc);
      const notYet = films.filter(f => !f.onDisc);
      const groups = [];
      if (onDisc.length) groups.push({ label: 'Op disc', films: onDisc });
      if (notYet.length) groups.push({ label: 'Nog niet op disc', films: notYet });
      return groups;
    }
    if (mode === 'genre') {
      const map = new Map();
      for (const f of films) {
        const keys = f.genres?.length ? f.genres : ['Overig'];
        for (const k of keys) {
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(f);
        }
      }
      return [...map.entries()].sort((a, b) => b[1].length - a[1].length).map(([label, films]) => ({ label, films }));
    }
    return [{ label: null, films }];
  }

  async function prefetchBackdropsFromAPI() {
    const { prefetchBackdrops } = window.FilmAPI;
    if (prefetchBackdrops) prefetchBackdrops(state.watchlist.map(f => ({ title: f.title, year: f.year })));
  }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }
  function truncate(str = '', n) {
    if (str.length <= n) return str;
    return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }
})();
