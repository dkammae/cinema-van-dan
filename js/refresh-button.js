// Injects a refresh button into the nav (works for both .masthead-nav and .detail-nav)
(function () {
  function injectButton() {
    const masthead = document.querySelector('.masthead-nav');
    const detailNav = document.querySelector('.detail-nav');
    const target = masthead || detailNav;
    if (!target) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'refresh-btn';
    btn.title = 'Cache verversen vanuit Tana';
    btn.innerHTML = '<span class="refresh-icon">↻</span><span class="refresh-label">Verversen</span>';

    btn.addEventListener('click', async () => {
      if (btn.classList.contains('loading')) return;
      btn.classList.add('loading');
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="refresh-icon spin">↻</span><span class="refresh-label">Verversen…</span>';
      try {
        const res = await fetch('/api/refresh?scope=all', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const publishStatus = data.published
          ? (data.published.push?.pushed
              ? `· gepusht naar mobiel`
              : data.published.push?.reason ? `· lokaal gebouwd (${data.published.push.reason})` : '')
          : '';
        btn.innerHTML = `<span class="refresh-icon">✓</span><span class="refresh-label">${data.films} films · ${data.ceremonies} awards ${publishStatus}</span>`;
        setTimeout(() => {
          btn.classList.remove('loading');
          btn.innerHTML = original;
          window.location.reload();
        }, 1800);
      } catch (e) {
        btn.innerHTML = `<span class="refresh-icon">✗</span><span class="refresh-label">${e.message}</span>`;
        setTimeout(() => {
          btn.classList.remove('loading');
          btn.innerHTML = original;
        }, 3000);
      }
    });

    target.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
