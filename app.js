const REFRESH_MS = 20_000;

const cardsEl = document.getElementById('cards');
const rowsEl = document.getElementById('marketRows');
const statusText = document.getElementById('statusText');
const updatedText = document.getElementById('updatedText');
const refreshMeter = document.getElementById('refreshMeter');

let refreshStartedAt = Date.now();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(2)}%`;
}

function formatExposure(value) {
  if (!Number.isFinite(value)) return '∞x';
  if (value >= 1_000) {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}x`;
  }
  return `${value.toFixed(value >= 100 ? 1 : 2)}x`;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function iconMarkup(row, sizeClass = '') {
  const symbol = escapeHtml(row.symbol || '?');
  return `<img class='icon ${sizeClass}' data-symbol='${symbol}' src='${escapeHtml(row.iconUrl)}' alt=''>`;
}

function installFallbacks(root) {
  root.querySelectorAll('img.icon[data-symbol]').forEach((img) => {
    img.onerror = () => {
      const fallback = document.createElement('span');
      fallback.className = img.className.replace('icon', 'icon fallback-icon');
      fallback.textContent = (img.dataset.symbol || '?').slice(0, 1).toUpperCase();
      img.replaceWith(fallback);
    };
  });
}

function renderCards(cards) {
  cardsEl.innerHTML = cards
    .map(
      (row) => `
        <article class='farm-card tone-${escapeHtml(row.tone || 'green')}'>
          <div class='card-top'>
            <div>
              <div class='boost'>${escapeHtml(row.boost || row.maturityLabel || '')}</div>
              <div class='asset-line'>
                ${iconMarkup(row)}
                <div>
                  <div class='asset-name'>${escapeHtml(row.symbol)}</div>
                  <div class='asset-protocol'>${escapeHtml(row.protocol)}</div>
                </div>
              </div>
            </div>
            <div class='card-apy'>
              <strong>${formatPercent(row.impliedApy)}</strong>
              <span>${escapeHtml(row.tokenCode)} Implied APY</span>
            </div>
          </div>
          <div class='card-details'>
            <div class='detail-row'>
              <span>${escapeHtml(row.symbol)} APY (Underlying)</span>
              <strong>${formatPercent(row.underlyingApy)}</strong>
            </div>
            <div class='detail-row'>
              <span>Market Liquidity</span>
              <strong class='green'>${formatMoney(row.liquidityUsd)}</strong>
            </div>
            <div class='detail-row'>
              <span>Effective Exposure</span>
              <strong>${formatExposure(row.effectiveExposure)}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join('');

  installFallbacks(cardsEl);
}

function renderRows(rows) {
  if (!rows.length) {
    rowsEl.innerHTML = `<div class='empty'>No active farm markets above the liquidity filter.</div>`;
    return;
  }

  rowsEl.innerHTML = rows
    .map(
      (row) => `
        <a class='market-row' href='${escapeHtml(row.url)}' target='_blank' rel='noreferrer'>
          <div class='market-main'>
            ${iconMarkup(row)}
            <span class='market-symbol'>${escapeHtml(row.symbol)}</span>
            <span class='market-protocol'>${escapeHtml(row.protocol)}</span>
            <span class='token-code'>${escapeHtml(row.tokenCode)}</span>
          </div>
          <span class='metric'>${formatExposure(row.effectiveExposure)}</span>
          <span class='metric'>${formatMoney(row.liquidityUsd)}</span>
          <span class='metric'>${formatPercent(row.underlyingApy)}</span>
          <span class='metric'>${formatPercent(row.impliedApy)}</span>
          <span class='chevron'>›</span>
        </a>
      `
    )
    .join('');

  installFallbacks(rowsEl);
}

function tickMeter() {
  const elapsed = Date.now() - refreshStartedAt;
  const progress = Math.min(100, (elapsed / REFRESH_MS) * 100);
  refreshMeter.style.width = `${progress}%`;
}

async function loadDashboard() {
  statusText.textContent = 'Refreshing';
  refreshStartedAt = Date.now();

  try {
    const response = await fetch(`/api/farm?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Refresh failed with ${response.status}`);

    const data = await response.json();

    renderCards(data.cards || []);
    renderRows(data.rows || []);

    const generated = new Date(data.generatedAt);
    updatedText.textContent = `Last updated ${generated.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;
    statusText.textContent = `${data.rowCount || 0} live markets`;
  } catch (error) {
    rowsEl.innerHTML = `<div class='error'>${escapeHtml(error.message || 'Refresh failed')}</div>`;
    statusText.textContent = 'Refresh error';
  }
}

loadDashboard();
setInterval(loadDashboard, REFRESH_MS);
setInterval(tickMeter, 250);
