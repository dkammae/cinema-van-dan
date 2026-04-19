// SVG monogram icons per ceremony — minimal, monochrome (use currentColor)
window.AwardIcons = {
  'The Oscars': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 2c-2.2 0-4 1.8-4 4 0 1.9 1.4 3.5 3.2 3.9V14H9c-.6 0-1 .4-1 1s.4 1 1 1h2v3H8c-.6 0-1 .4-1 1s.4 1 1 1h8c.6 0 1-.4 1-1s-.4-1-1-1h-3v-3h2c.6 0 1-.4 1-1s-.4-1-1-1h-2V9.9c1.8-.4 3.2-2 3.2-3.9 0-2.2-1.8-4-4-4z"/>
  </svg>`,
  'Golden Globe': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M6 9h12M12 3c2.5 3 2.5 9 0 12M12 3c-2.5 3-2.5 9 0 12" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <path d="M9 15v3M15 15v3M7 21h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
  "The Bafta's": `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 2L8 6v4c0 4 2 7 4 9 2-2 4-5 4-9V6l-4-4z" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="10" cy="9" r="1"/>
    <circle cx="14" cy="9" r="1"/>
  </svg>`,
  'Critics choice': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.6 6.4 6.9.5-5.3 4.5 1.7 6.7L12 16.7 6.1 20l1.7-6.7L2.5 8.9l6.9-.5z"/>
  </svg>`,
  'SAG': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <text x="12" y="15" text-anchor="middle" font-size="8" font-weight="700" font-family="Georgia, serif" fill="currentColor">SAG</text>
  </svg>`,
  'DGA': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <rect x="4" y="6" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="7" cy="9" r="1.2"/>
    <circle cx="15" cy="9" r="1.2"/>
    <path d="M18 11l3-2v6l-3-2z" fill="currentColor"/>
  </svg>`,
  'Emmys': `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M12 3l1.5 4 4-1-2 3.5 3 2.5-4 1 1 4-3.5-2.5L8.5 17l1-4-4-1 3-2.5L7 6l4 1z"/>
    <path d="M9 18l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,
};

window.getAwardIcon = function (ceremony) {
  return window.AwardIcons[ceremony] || `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`;
};
