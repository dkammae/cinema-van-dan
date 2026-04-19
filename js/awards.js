(async function () {
  const { fetchAwards, fetchList, backdropURL } = window.FilmAPI;
  const $ = sel => document.querySelector(sel);

  const loading = $('#loading');
  const page = $('#awards-page');

  let data;
  let films = [];
  try {
    [data, films] = await Promise.all([
      fetchAwards(),
      fetchList().then(d => [...(d.watched || []), ...(d.watchlist || [])]),
    ]);
  } catch (e) {
    loading.textContent = `Kon awards niet laden: ${e.message}`;
    return;
  }

  loading.hidden = true;
  page.hidden = false;

  // Build a quick film lookup by id and by normalized title for the poster grid
  const filmById = new Map(films.map(f => [f.id, f]));

  const ceremonies = data.ceremonies || [];
  const years = [...new Set(ceremonies.map(c => c.year))].sort((a, b) => Number(b) - Number(a));
  if (!years.length) {
    page.innerHTML = '<p style="text-align:center; padding: 60px; color: var(--text-muted);">Geen awards data gevonden in Tana.</p>';
    return;
  }

  const PRESTIGE = ['The Oscars', 'Golden Globe', "The Bafta's", 'Critics choice', 'SAG', 'DGA', 'Emmys'];

  let activeYear = years[0];
  renderTabs();
  renderYear(activeYear);

  $('#year-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.year-tab');
    if (!btn) return;
    activeYear = btn.dataset.year;
    renderTabs();
    renderYear(activeYear);
  });

  function renderTabs() {
    $('#year-tabs').innerHTML = years.map(y =>
      `<button type="button" class="year-tab ${y === activeYear ? 'active' : ''}" data-year="${y}">${y}</button>`
    ).join('');
  }

  function renderYear(year) {
    const inYear = ceremonies.filter(c => c.year === year);
    // Group: per ceremony, merge nominations + awards into one card
    const byCeremony = new Map();
    for (const c of inYear) {
      if (!byCeremony.has(c.award)) byCeremony.set(c.award, { award: c.award, year, nominations: null, winners: null });
      const slot = byCeremony.get(c.award);
      if (c.status === 'win') slot.winners = c;
      else slot.nominations = c;
    }
    const sorted = [...byCeremony.values()].sort((a, b) => {
      const ai = PRESTIGE.indexOf(a.award), bi = PRESTIGE.indexOf(b.award);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    $('#ceremony-grid').innerHTML = sorted.map(renderCeremonyCard).join('');
  }

  function renderCeremonyCard(slot) {
    const winners = slot.winners?.categories || {};
    const noms = slot.nominations?.categories || {};
    const allCats = new Set([...Object.keys(winners), ...Object.keys(noms)]);

    // Best Picture combo
    const bestPicCat = ['best picture drama', 'best picture musical comedy'].filter(k => allCats.has(k));
    const otherCats = [...allCats].filter(k => !bestPicCat.includes(k));

    const bestPicHTML = bestPicCat.map(catKey => {
      const winFilms = dedupeByName(winners[catKey]?.entries || []);
      const winnerKeys = new Set(winFilms.map(f => normalize(f.name)));
      const nomFilms = dedupeByName(noms[catKey]?.entries || []).filter(f => !winnerKeys.has(normalize(f.name)));
      if (!winFilms.length && !nomFilms.length) return '';
      const label = winners[catKey]?.label || noms[catKey]?.label;
      const renderPoster = (f, isWinner) => {
        const film = f.refId ? filmById.get(f.refId) : findFilmByName(f.name);
        const cleanName = parseTitleYear(f.name).title;
        const yearLabel = parseTitleYear(f.name).year || '';
        const link = film ? `film.html?id=${encodeURIComponent(film.id)}` : '#';
        const bg = backdropURL(cleanName, yearLabel);
        return `
          <a class="poster-card ${isWinner ? 'winner' : ''} ${film ? '' : 'no-link'}" href="${link}">
            <div class="poster-image" style="background-image:url('${bg}')">
              ${isWinner ? '<span class="winner-badge">🏆</span>' : ''}
            </div>
            <span class="poster-title">${escapeHTML(cleanName)}</span>
            ${yearLabel ? `<span class="poster-year">${yearLabel}</span>` : ''}
          </a>`;
      };
      return `
        <div class="ceremony-section">
          <h4 class="ceremony-section-title">${escapeHTML(label)}</h4>
          ${winFilms.length ? `
            <div class="ceremony-subsection">
              <span class="ceremony-subsection-label win">🏆 Winnaar${winFilms.length > 1 ? 's' : ''}</span>
              <div class="poster-grid">${winFilms.map(f => renderPoster(f, true)).join('')}</div>
            </div>` : ''}
          ${nomFilms.length ? `
            <div class="ceremony-subsection">
              <span class="ceremony-subsection-label nom">✦ Genomineerd</span>
              <div class="poster-grid">${nomFilms.map(f => renderPoster(f, false)).join('')}</div>
            </div>` : ''}
        </div>
      `;
    }).join('');

    // Other categories: compact list with winner first then nominees
    const otherHTML = otherCats.map(catKey => {
      const winEntries = dedupeByName(winners[catKey]?.entries || []);
      const winnerKeys = new Set(winEntries.map(e => normalize(e.name)));
      const nomEntries = dedupeByName(noms[catKey]?.entries || []).filter(e => !winnerKeys.has(normalize(e.name)));
      const label = winners[catKey]?.label || noms[catKey]?.label;
      const entityType = winners[catKey]?.entityType || noms[catKey]?.entityType;
      const formatEntry = (e, isWinner) => {
        const display = entityType === 'film' ? parseTitleYear(e.name).title : cleanName(e.name);
        return `<li class="${isWinner ? 'is-winner' : ''}">${isWinner ? '🏆 ' : '✦ '}${escapeHTML(display)}</li>`;
      };
      return `
        <li class="other-cat">
          <span class="other-cat-label">${escapeHTML(label)}</span>
          <ul class="other-cat-entries">
            ${winEntries.map(e => formatEntry(e, true)).join('')}
            ${nomEntries.map(e => formatEntry(e, false)).join('')}
          </ul>
        </li>
      `;
    }).join('');

    return `
      <article class="ceremony-card">
        <header class="ceremony-card-head">
          <span class="ceremony-card-icon">${getAwardIcon(slot.award)}</span>
          <div>
            <h3>${escapeHTML(slot.award)} ${escapeHTML(slot.year)}</h3>
            <p class="ceremony-card-sub">${slot.winners ? 'Winnaars + ' : ''}${slot.nominations ? 'Nominaties' : ''}${!slot.winners && !slot.nominations ? '—' : ''}</p>
          </div>
        </header>
        ${bestPicHTML || ''}
        ${otherHTML ? `
          <details class="other-cats-wrap">
            <summary>Overige categorieën (${otherCats.length})</summary>
            <ul class="other-cats-list">${otherHTML}</ul>
          </details>` : ''}
      </article>
    `;
  }

  function dedupeByName(entries) {
    const seen = new Map();
    for (const e of entries) {
      const k = normalize(e.name);
      if (!seen.has(k)) seen.set(k, e);
    }
    return [...seen.values()];
  }

  function findFilmByName(name) {
    const t = parseTitleYear(name).title.toLowerCase();
    return films.find(f => (f.title || '').toLowerCase() === t);
  }

  function parseTitleYear(name) {
    const m = (name || '').match(/^(.+?)\s*\((\d{4})\)/);
    if (m) return { title: m[1].trim(), year: m[2] };
    return { title: cleanName(name), year: null };
  }

  function cleanName(s) {
    return (s || '').replace(/\s+#[\w-]+/g, '').replace(/\s+[MV]\b/g, '').replace(/\s+⭐+/g, '').replace(/\s+🌈+/g, '').trim();
  }

  function normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(the|a|an)\s+/, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
})();
