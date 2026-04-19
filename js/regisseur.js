(async function () {
  const { starsPlain, backdropURL } = window.FilmAPI;
  const params = new URLSearchParams(location.search);
  const name = params.get('name');
  const loading = document.querySelector('#loading');
  const root = document.querySelector('#director');

  if (!name) {
    loading.textContent = 'Geen regisseur opgegeven.';
    return;
  }

  let data;
  try {
    const res = await fetch(`/api/director/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    data = await res.json();
  } catch (e) {
    loading.textContent = `Kon regisseur niet laden: ${e.message}`;
    return;
  }

  document.title = `${data.name} — Cinema van Dan`;
  loading.hidden = true;
  root.hidden = false;

  const initials = data.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const summary = data.awardSummary || { wins: 0, nominations: 0 };
  const summaryText = summary.wins || summary.nominations
    ? `${summary.wins ? `${summary.wins} 🏆` : ''}${summary.wins && summary.nominations ? ' · ' : ''}${summary.nominations ? `${summary.nominations} ✦` : ''}`
    : '';

  root.innerHTML = `
    <div class="director-hero">
      <div class="director-photo ${data.photo ? 'has-photo' : ''}" ${data.photo ? `style="background-image:url('${data.photo}')"` : ''}>
        ${!data.photo ? `<span class="director-photo-placeholder">${escapeHTML(initials)}</span>` : ''}
      </div>
      <div class="director-hero-body">
        <span class="section-kicker">Regisseur</span>
        <h1>${escapeHTML(data.name)}</h1>
        ${summaryText ? `<p class="director-award-summary">${summaryText}</p>` : ''}
        ${data.bio ? `<p class="director-bio">${escapeHTML(data.bio)}</p>` : ''}
      </div>
    </div>

    ${data.awards?.length ? renderAwardsSection(data.awards) : ''}

    <section class="detail-section">
      <h3>Filmografie ${data.films?.length ? `<span class="section-count">(${data.films.length})</span>` : ''}</h3>
      ${data.films?.length ? `
        <div class="director-films-grid">
          ${data.films.map(f => `
            <a class="director-film-card" href="film.html?id=${encodeURIComponent(f.id)}">
              <div class="director-film-image" style="background-image:url('${backdropURL(f.title, f.year)}')">
                ${awardBadgeHTML(f.awardSummary)}
              </div>
              <div class="director-film-body">
                <h4>${escapeHTML(f.title)}</h4>
                <div class="meta">
                  <span>${f.year || ''}</span>
                  ${f.stars ? `<span class="stars">${starsPlain(f.stars)}</span>` : ''}
                </div>
                ${f.description ? `<p>${escapeHTML(truncate(f.description, 100))}</p>` : ''}
                ${f.awards?.length ? `<ul class="film-card-awards">${f.awards.slice(0, 4).map(a => `<li class="${a.status==='win'?'win':'nom'}">${a.status==='win'?'🏆':'✦'} ${escapeHTML(a.category)} <span class="award-meta">— ${escapeHTML(a.ceremony)} ${escapeHTML(a.year)}</span></li>`).join('')}${f.awards.length > 4 ? `<li class="more">+${f.awards.length - 4} meer</li>` : ''}</ul>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      ` : '<p class="empty">Geen films van deze regisseur in je collectie.</p>'}
    </section>
  `;

  function renderAwardsSection(awards) {
    const groups = new Map();
    for (const a of awards) {
      const key = `${a.ceremony}|${a.year}`;
      if (!groups.has(key)) groups.set(key, { ceremony: a.ceremony, year: a.year, items: [] });
      groups.get(key).items.push(a);
    }
    return `
      <section class="detail-section detail-awards">
        <h3>Bekroningen</h3>
        <ul class="award-rows">
          ${[...groups.values()].map(g => `
            <li class="award-row">
              <div class="award-mark">
                <span class="award-icon">${getAwardIcon(g.ceremony)}</span>
                <span class="award-name">${escapeHTML(g.ceremony)} ${escapeHTML(g.year)}</span>
              </div>
              <ul class="award-cats">
                ${g.items.map(a => `
                  <li class="award-entry ${a.status === 'win' ? 'win' : 'nom'}">
                    <span class="award-badge-inline">${a.status === 'win' ? '🏆' : '✦'}</span>
                    <span class="award-cat">${escapeHTML(a.category)}</span>
                  </li>
                `).join('')}
              </ul>
            </li>
          `).join('')}
        </ul>
      </section>
    `;
  }

  function awardBadgeHTML(summary) {
    if (!summary) return '';
    if (summary.wins) return `<span class="award-badge wins" title="${summary.wins} gewonnen">🏆 ${summary.wins}</span>`;
    if (summary.nominations) return `<span class="award-badge noms" title="${summary.nominations} nominatie${summary.nominations === 1 ? '' : 's'}">✦ ${summary.nominations}</span>`;
    return '';
  }

  function truncate(str = '', n) {
    if (str.length <= n) return str;
    return str.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
})();
