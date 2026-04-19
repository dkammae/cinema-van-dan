(async function () {
  const { fetchFilm, starsPlain, proxyImage, backdropURL } = window.FilmAPI;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const loading = document.querySelector('#loading');
  const root = document.querySelector('#detail');

  if (!id) {
    loading.textContent = 'Geen film geselecteerd.';
    return;
  }

  let film;
  try {
    film = await fetchFilm(id);
  } catch (e) {
    loading.textContent = `Kon film niet laden: ${e.message}`;
    return;
  }

  document.title = `${film.title || film.name} — Cinema van Dan`;

  loading.hidden = true;
  root.hidden = false;

  const title = film.title || film.name || '';
  const year = film.year || '';
  const imdbLink = film.imdb && /^https?:/.test(film.imdb)
    ? film.imdb
    : `https://www.imdb.com/find/?q=${encodeURIComponent(`${title} ${year}`.trim())}`;
  const trailerLink = film.trailerId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(film.trailerId)}`
    : film.trailerUrl && /^https?:/.test(film.trailerUrl)
      ? film.trailerUrl
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year} trailer`.trim())}`;

  root.innerHTML = `
    <div class="detail-banner" style="background-image:url('${backdropURL(title, year)}')"></div>
    <div class="detail-content">
      <div class="detail-meta">
        ${year ? `<span>${year}</span>` : ''}
        ${film.genres?.length ? `<span class="dot">·</span><span>${film.genres.map(escapeHTML).join(' · ')}</span>` : ''}
        ${film.imdb && /^\d+(\.\d+)?$/.test(String(film.imdb).trim()) ? `<span class="dot">·</span><span>IMDB ${escapeHTML(film.imdb)}</span>` : ''}
      </div>
      <h1>${escapeHTML(title)}</h1>
      ${film.description ? `<p class="detail-subtitle">${escapeHTML(film.description)}</p>` : ''}
      ${film.stars ? `<div class="detail-stars">${starsPlain(film.stars)}</div>` : ''}
      ${film.directors?.length ? `
        <div class="director-block">
          ${film.directors.map(d => `
            <a class="director-chip" href="regisseur.html?name=${encodeURIComponent(d)}" data-name="${escapeAttr(d)}">
              <span class="director-chip-photo"><span class="director-chip-initials">${escapeHTML(initials(d))}</span></span>
              <span class="director-chip-text">
                <span class="director-chip-label">Regie</span>
                <span class="director-chip-name">${escapeHTML(d)}</span>
              </span>
            </a>
          `).join('')}
        </div>` : ''}

      <div class="detail-actions">
        <a class="detail-action primary" href="${imdbLink}" target="_blank" rel="noopener">
          <span class="icon" aria-hidden="true">IMDb</span>
          <span>Bekijk op IMDb</span>
        </a>
        <a class="detail-action" href="${trailerLink}" target="_blank" rel="noopener">
          <span class="icon" aria-hidden="true">▶</span>
          <span>Trailer op YouTube</span>
        </a>
      </div>

      ${film.awards?.length ? renderAwardsSection(film.awards) : ''}

      <section class="detail-section" id="detail-trivia">
        <h3>Nieuwtjes en weetjes</h3>
        <div class="trivia-content"><p class="trivia-loading">Weetjes ophalen…</p></div>
        <div class="trivia-add">
          <button type="button" class="trivia-add-toggle">+ eigen weetje toevoegen</button>
          <form class="trivia-add-form" hidden>
            <textarea class="trivia-add-input" rows="2" maxlength="500" placeholder="Schrijf een weetje (max 500 tekens)…"></textarea>
            <div class="trivia-add-actions">
              <button type="button" class="trivia-add-cancel">annuleer</button>
              <button type="submit" class="trivia-add-save">opslaan</button>
            </div>
          </form>
        </div>
      </section>

      ${film.review ? `
        <section class="detail-section">
          <h3>De recensie</h3>
          <p class="detail-review">${escapeHTML(film.review)}</p>
        </section>` : ''}

      ${film.synopsis ? `
        <section class="detail-section">
          <h3>Synopsis</h3>
          <p class="detail-synopsis">${escapeHTML(film.synopsis)}</p>
        </section>` : ''}

      ${film.cast?.length ? `
        <section class="detail-section">
          <h3>Cast</h3>
          <ul class="cast-grid">${film.cast.map(c => {
            const castInfo = (film.castAwards || []).find(ca => ca.name === c);
            const castMarker = castInfo?.awards?.length ? renderCastMarker(castInfo.awards) : '';
            return `
            <li class="cast-card" data-name="${escapeAttr(c)}">
              <div class="cast-photo">
                <span class="cast-photo-placeholder">${escapeHTML(initials(c))}</span>
                ${castMarker}
              </div>
              <span class="cast-name">${escapeHTML(c)}</span>
            </li>
          `;}).join('')}</ul>
        </section>` : ''}

      ${film.trailerId ? `
        <section class="detail-section">
          <h3>Trailer</h3>
          <div class="detail-trailer">
            <iframe src="https://www.youtube.com/embed/${encodeURIComponent(film.trailerId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </section>` : ''}
    </div>
  `;

  loadTrivia(id);
  setupTriviaAdd(id);
  loadCastPhotos();
  loadDirectorPhotos();

  async function loadDirectorPhotos() {
    const chips = document.querySelectorAll('.director-chip');
    await Promise.all([...chips].map(async chip => {
      const name = chip.dataset.name;
      try {
        const res = await fetch(`/api/actor-photo?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.url) {
          const photo = chip.querySelector('.director-chip-photo');
          photo.style.backgroundImage = `url('${data.url}')`;
          photo.classList.add('has-photo');
        }
      } catch {}
    }));
  }

  async function loadCastPhotos() {
    const cards = document.querySelectorAll('.cast-card');
    await Promise.all([...cards].map(async card => {
      const name = card.dataset.name;
      try {
        const res = await fetch(`/api/actor-photo?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.url) {
          const photo = card.querySelector('.cast-photo');
          photo.style.backgroundImage = `url('${data.url}')`;
          photo.classList.add('has-photo');
        }
      } catch {}
    }));
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
  function escapeAttr(str = '') { return escapeHTML(str).replace(/\s+/g, ' '); }

  async function loadTrivia(filmId) {
    const content = document.querySelector('#detail-trivia .trivia-content');
    if (!content) return;
    try {
      const res = await fetch(`/api/trivia/${encodeURIComponent(filmId)}`);
      const payload = await res.json();
      renderTrivia(payload, filmId);
    } catch (err) {
      content.innerHTML = `<p class="trivia-empty">Fout: ${escapeHTML(err.message || 'onbekend')}</p>`;
    }
  }

  function renderTrivia(payload, filmId) {
    const content = document.querySelector('#detail-trivia .trivia-content');
    if (!content) return;
    const items = payload.trivia || [];
    const userItems = payload.userTrivia || [];
    if (!items.length && !userItems.length) {
      content.innerHTML = '<p class="trivia-empty">Geen weetjes gevonden.</p>';
      return;
    }
    const generated = items.map(t => `<li>${escapeHTML(t)}</li>`).join('');
    const userHTML = userItems.map((u, i) => `
      <li class="trivia-user">
        <span class="trivia-user-tag">eigen</span>
        ${escapeHTML(typeof u === 'string' ? u : u.text)}
        <button type="button" class="trivia-user-delete" data-index="${i}" aria-label="verwijder">×</button>
      </li>
    `).join('');
    content.innerHTML = `<ul class="trivia-list">${generated}${userHTML}</ul>`;

    content.querySelectorAll('.trivia-user-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Dit weetje verwijderen?')) return;
        const idx = btn.dataset.index;
        const res = await fetch(`/api/trivia/${encodeURIComponent(filmId)}/user/${idx}`, { method: 'DELETE' });
        if (res.ok) renderTrivia(await res.json(), filmId);
      });
    });
  }

  function setupTriviaAdd(filmId) {
    const wrap = document.querySelector('#detail-trivia .trivia-add');
    if (!wrap) return;
    const toggle = wrap.querySelector('.trivia-add-toggle');
    const form = wrap.querySelector('.trivia-add-form');
    const input = wrap.querySelector('.trivia-add-input');
    const cancel = wrap.querySelector('.trivia-add-cancel');

    toggle.addEventListener('click', () => {
      form.hidden = false;
      toggle.hidden = true;
      input.focus();
    });
    cancel.addEventListener('click', () => {
      form.hidden = true;
      toggle.hidden = false;
      input.value = '';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const res = await fetch(`/api/trivia/${encodeURIComponent(filmId)}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        renderTrivia(await res.json(), filmId);
        input.value = '';
        form.hidden = true;
        toggle.hidden = false;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Kon niet opslaan: ${err.error || res.status}`);
      }
    });
  }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function renderAwardsSection(awards) {
    // Group by ${ceremony} ${year}
    const groups = new Map();
    for (const a of awards) {
      const key = `${a.ceremony}|${a.year}`;
      if (!groups.has(key)) groups.set(key, { ceremony: a.ceremony, year: a.year, items: [] });
      groups.get(key).items.push(a);
    }
    const groupList = [...groups.values()];
    return `
      <section class="detail-section detail-awards">
        <h3>Bekroningen</h3>
        <ul class="award-rows">
          ${groupList.map(g => `
            <li class="award-row">
              <div class="award-mark">
                <span class="award-icon">${getAwardIcon(g.ceremony)}</span>
                <span class="award-name">${escapeHTML(g.ceremony)} ${escapeHTML(g.year)}</span>
              </div>
              <ul class="award-cats">
                ${g.items.map(a => `
                  <li class="award-entry ${a.status === 'win' ? 'win' : 'nom'}" title="${a.status === 'win' ? 'Gewonnen' : 'Genomineerd'}">
                    <span class="award-badge-inline">${a.status === 'win' ? '🏆' : '✦'}</span>
                    <span class="award-cat">${escapeHTML(a.category)}</span>
                    ${a.entityType === 'regisseur' ? `<span class="award-recipient"> · <a href="regisseur.html?name=${encodeURIComponent(a.name)}">${escapeHTML(a.name)}</a></span>` : a.entityType !== 'film' ? `<span class="award-recipient"> · ${escapeHTML(a.name)}</span>` : ''}
                  </li>
                `).join('')}
              </ul>
            </li>
          `).join('')}
        </ul>
      </section>
    `;
  }

  function renderCastMarker(awards) {
    const win = awards.find(a => a.status === 'win');
    const tooltip = awards.map(a => `${a.status === 'win' ? '🏆 won' : '✦ nom'} — ${a.category} (${a.ceremony} ${a.year})`).join('\n');
    return `<span class="cast-award-marker ${win ? 'win' : 'nom'}" title="${escapeAttr(tooltip)}">${win ? '🏆' : '✦'}</span>`;
  }
})();
