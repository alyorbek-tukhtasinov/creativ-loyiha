'use strict';

const BASE = window.location.origin;
let categories = [];
let selectedCategory = null;

async function init() {
  createParticles();
  await loadCategories();
  renderStats();
  bindEvents();
}

async function loadCategories() {
  try {
    const res = await fetch('../content/categories.json');
    categories = await res.json();
    renderCategories();
  } catch (e) {
    console.error('Failed to load categories:', e);
    document.getElementById('categoriesGrid').innerHTML =
      '<p style="color:#FF6B9D;padding:20px">Kategoriyalarni yuklashda xato. Lokal server ishga tushirilganmi?</p>';
  }
}

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = '';

  categories.forEach((cat, i) => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.style.setProperty('--cat-color', cat.color);
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <span class="cat-emoji">${cat.emoji}</span>
      <div class="cat-title">${cat.title}</div>
      <div class="cat-desc">${cat.description}</div>
      <div class="cat-count">📊 ${getLinkCount(cat.id)} ta link yaratildi</div>
      <div class="cat-check">✓</div>
    `;
    card.addEventListener('click', () => selectCategory(cat, card));
    grid.appendChild(card);
  });
}

function selectCategory(cat, cardEl) {
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  selectedCategory = cat;

  setTimeout(() => {
    document.getElementById('step-categories').classList.add('hidden');
    document.getElementById('step-customizer').classList.remove('hidden');
    renderSelectedCard(cat);
    showExtraFields(cat);
    document.getElementById('step-customizer').scrollIntoView({ behavior: 'smooth' });
  }, 300);
}

function renderSelectedCard(cat) {
  document.getElementById('selectedCategoryCard').innerHTML = `
    <span class="selected-cat-emoji">${cat.emoji}</span>
    <div class="selected-cat-title">${cat.title}</div>
    <div class="selected-cat-desc">${cat.description}</div>
    <div class="reward-preview" style="background:${cat.color}18; border: 1px solid ${cat.color}33; margin-top:16px; border-radius:12px; padding:12px;">
      <strong style="color:${cat.color}">🎁 Sovg'a:</strong><br>
      <span style="font-size:13px;color:#7B5C8A">${cat.endReward.title}</span>
    </div>
  `;
}

function showExtraFields(cat) {
  document.getElementById('locationFields').classList.add('hidden');
  document.getElementById('longDistanceFields').classList.add('hidden');

  if (cat.id === 'date') {
    document.getElementById('locationFields').classList.remove('hidden');
  } else if (cat.id === 'longdistance') {
    document.getElementById('longDistanceFields').classList.remove('hidden');
  }
}

function bindEvents() {
  document.getElementById('btnBack').addEventListener('click', () => {
    document.getElementById('step-customizer').classList.add('hidden');
    document.getElementById('step-categories').classList.remove('hidden');
    document.getElementById('step-result').classList.add('hidden');
  });

  document.getElementById('inputMsg').addEventListener('input', function () {
    document.getElementById('charCount').textContent = this.value.length;
  });

  document.getElementById('btnGenerate').addEventListener('click', generateLink);
  document.getElementById('btnCopy').addEventListener('click', copyLink);
  document.getElementById('btnPreview').addEventListener('click', openPreview);
  document.getElementById('btnShare').addEventListener('click', shareLink);
  document.getElementById('btnNew').addEventListener('click', () => {
    document.getElementById('step-result').classList.add('hidden');
    document.getElementById('step-categories').classList.remove('hidden');
    document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
    selectedCategory = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function generateLink() {
  const from = document.getElementById('inputFrom').value.trim();
  const to = document.getElementById('inputTo').value.trim();
  const msg = document.getElementById('inputMsg').value.trim();

  let hasError = false;
  if (!from) { shakeElement(document.getElementById('inputFrom')); hasError = true; }
  if (!to)   { shakeElement(document.getElementById('inputTo'));   hasError = true; }
  if (hasError) return;

  const params = new URLSearchParams();
  params.set('cat', selectedCategory.id);
  params.set('from', from);
  params.set('to', to);
  if (msg) params.set('msg', btoa(encodeURIComponent(msg)));

  if (selectedCategory.id === 'date') {
    const loc = document.getElementById('inputLocation').value.trim();
    const date = document.getElementById('inputDate').value.trim();
    if (loc) params.set('loc', btoa(encodeURIComponent(loc)));
    if (date) params.set('dt', btoa(encodeURIComponent(date)));
  }

  if (selectedCategory.id === 'longdistance') {
    const sm = document.getElementById('inputSpecialMsg').value.trim();
    if (sm) params.set('special', btoa(encodeURIComponent(sm)));
  }

  const link = `${BASE}/game/?${params.toString()}`;

  document.getElementById('generatedLink').value = link;

  incrementLinkCount(selectedCategory.id);
  renderStats();

  generateQR(link);

  document.getElementById('step-customizer').classList.add('hidden');
  document.getElementById('step-result').classList.remove('hidden');
  document.getElementById('step-result').scrollIntoView({ behavior: 'smooth' });
}

function generateQR(url) {
  const el = document.getElementById('qrcode');
  el.innerHTML = '';
  new QRCode(el, {
    text: url,
    width: 160,
    height: 160,
    colorDark: '#2D1B33',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function copyLink() {
  const input = document.getElementById('generatedLink');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    document.getElementById('copyIcon').textContent = '✅';
    document.getElementById('copySuccess').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('copyIcon').textContent = '📋';
      document.getElementById('copySuccess').classList.add('hidden');
    }, 2000);
  }).catch(() => {
    document.execCommand('copy');
  });
}

function openPreview() {
  const link = document.getElementById('generatedLink').value;
  const previewUrl = link + (link.includes('?') ? '&' : '?') + 'preview=true';
  window.open(previewUrl, '_blank');
}

function shareLink() {
  const link = document.getElementById('generatedLink').value;
  if (navigator.share) {
    navigator.share({
      title: 'HeartQuest — Sevgi o\'yini',
      text: `${selectedCategory.emoji} ${selectedCategory.title} o'yinini o'ynang!`,
      url: link
    });
  } else {
    copyLink();
  }
}

function getLinkCount(catId) {
  const stats = JSON.parse(localStorage.getItem('hq_stats') || '{}');
  return stats[catId] || 0;
}

function incrementLinkCount(catId) {
  const stats = JSON.parse(localStorage.getItem('hq_stats') || '{}');
  stats[catId] = (stats[catId] || 0) + 1;
  localStorage.setItem('hq_stats', JSON.stringify(stats));
}

function renderStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid || !categories.length) return;
  grid.innerHTML = '';

  categories.forEach(cat => {
    const count = getLinkCount(cat.id);
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `
      <span class="stat-emoji">${cat.emoji}</span>
      <div class="stat-info">
        <div class="stat-title">${cat.title}</div>
        <div class="stat-count">${count}</div>
      </div>
    `;
    grid.appendChild(item);
  });
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.style.borderColor = '#FF4B8B';
  el.style.boxShadow = '0 0 0 3px rgba(255,75,139,0.3)';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.style.animation = '';
  }, 500);
}

function createParticles() {
  const container = document.getElementById('particles');
  const symbols = ['💕', '✨', '🌹', '⭐', '💫', '🌸', '💗', '🎀'];
  const count = 24;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = symbols[i % symbols.length];
    p.style.left = `${Math.random() * 100}%`;
    p.style.fontSize = `${12 + Math.random() * 12}px`;
    p.style.animationDuration = `${8 + Math.random() * 12}s`;
    p.style.animationDelay = `${Math.random() * 10}s`;
    container.appendChild(p);
  }
}

const shakeCSS = document.createElement('style');
shakeCSS.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}`;
document.head.appendChild(shakeCSS);

document.addEventListener('DOMContentLoaded', init);
