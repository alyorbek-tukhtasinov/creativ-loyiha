'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────
const STATE = {
  cat: null, catData: null, catMeta: null,
  questions: [], currentQ: 0,
  params: {}, isPreview: false,
  muted: false,
  wrongAttempts: 0,
  totalWrongAttempts: 0,
  streak: 0,
  stars: [],
  ghostShown: false,
  speedMultiplier: 1,
  isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
  audioCtx: null,
  bgMusic: null,
  musicStarted: false,
  musicSourceReady: false,
};

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function getAudioCtx() {
  if (!STATE.audioCtx) STATE.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return STATE.audioCtx;
}

function playTone(freq, type, duration, vol = 0.3, delay = 0) {
  if (STATE.muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch(e) {}
}

function playCorrect() {
  [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]].forEach(([f, d]) =>
    playTone(f, 'sine', 0.3, 0.25, d));
}

function playWrong() {
  playTone(300, 'sawtooth', 0.15, 0.2);
  playTone(200, 'sawtooth', 0.15, 0.2, 0.1);
}

function playHover() {
  playTone(800, 'sine', 0.02, 0.05);
}

function playFinale() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
  notes.forEach((f, i) => playTone(f, 'sine', 0.25, 0.2, i * 0.1));
  setTimeout(() => {
    [523, 659, 784].forEach((f, i) => playTone(f, 'triangle', 0.5, 0.15, i * 0.08));
  }, notes.length * 100 + 200);
}

function initBackgroundMusic() {
  STATE.bgMusic = document.getElementById('bgMusic');
  if (!STATE.bgMusic) return;

  STATE.bgMusic.volume = 0.32;
  ensureRomanticLoopSource();

  ['pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, startBackgroundMusic, { once: true, passive: true });
  });
}

function ensureRomanticLoopSource() {
  if (!STATE.bgMusic || STATE.musicSourceReady) return;
  STATE.bgMusic.src = createRomanticLoopDataUri();
  STATE.musicSourceReady = true;
}

async function startBackgroundMusic() {
  if (!STATE.bgMusic || STATE.muted) return;

  ensureRomanticLoopSource();
  try {
    STATE.bgMusic.volume = 0.32;
    await STATE.bgMusic.play();
    STATE.musicStarted = true;
  } catch(e) {
    STATE.musicStarted = false;
  }
}

function createRomanticLoopDataUri() {
  const sampleRate = 22050;
  const seconds = 16;
  const totalSamples = sampleRate * seconds;
  const channels = 1;
  const bytesPerSample = 2;
  const dataSize = totalSamples * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const chords = [
    [261.63, 329.63, 392.00, 523.25],
    [220.00, 261.63, 329.63, 440.00],
    [174.61, 261.63, 349.23, 440.00],
    [196.00, 246.94, 329.63, 392.00]
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chord = chords[Math.floor(t / 4) % chords.length];
    const local = t % 4;
    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (seconds - t) / 1.2);
    const chordFade = Math.min(1, local / 0.45, (4 - local) / 0.45);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut, chordFade));
    const shimmer = Math.sin(2 * Math.PI * 880 * t) * 0.015 * Math.sin(Math.PI * local / 4);
    let sample = shimmer;

    chord.forEach((freq, idx) => {
      const detune = 1 + (idx - 1.5) * 0.0015;
      sample += Math.sin(2 * Math.PI * freq * detune * t) * (0.075 / (idx + 1));
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * (0.018 / (idx + 1));
    });

    sample *= envelope;
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

// ─── URL PARAMS ──────────────────────────────────────────────────────────────
function parseParams() {
  const p = new URLSearchParams(window.location.search);
  STATE.params = {
    cat:     p.get('cat') || 'love',
    from:    p.get('from') || 'Kimdir',
    to:      p.get('to') || 'Siz',
    msg:     p.get('msg')     ? safeB64Decode(p.get('msg'))     : '',
    loc:     p.get('loc')     ? safeB64Decode(p.get('loc'))     : '',
    dt:      p.get('dt')      ? safeB64Decode(p.get('dt'))      : '',
    special: p.get('special') ? safeB64Decode(p.get('special')) : '',
    preview: p.get('preview') === 'true',
  };
  STATE.isPreview = STATE.params.preview;
  STATE.cat = STATE.params.cat;
}

function safeB64Decode(str) {
  try { return decodeURIComponent(atob(str)); } catch(e) { return str; }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  parseParams();
  createBgParticles();
  loadMuteState();
  initBackgroundMusic();

  if (STATE.isPreview) {
    document.getElementById('previewBadge').classList.remove('hidden');
  }

  document.getElementById('muteBtn').addEventListener('click', toggleMute);

  try {
    await loadCategoryData();
    setTimeout(() => showIntro(), 1200);
  } catch(e) {
    document.getElementById('screenLoading').innerHTML =
      `<div style="text-align:center;padding:40px;color:#FF6B9D">
        <div style="font-size:48px">😢</div>
        <p style="font-size:18px;margin-top:16px">O'yin yuklanmadi.<br>URL to'g'rimi? Kategoriya: <b>${STATE.cat}</b></p>
        <a href="/admin/" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#FF6B9D;color:white;border-radius:50px;text-decoration:none;font-weight:700">Admin panelga qaytish</a>
       </div>`;
  }
});

async function loadCategoryData() {
  const [catRes, metaRes] = await Promise.all([
    fetch(`../content/cat-${STATE.cat}.json`),
    fetch(`../content/categories.json`)
  ]);
  if (!catRes.ok) throw new Error('Category not found: ' + STATE.cat);
  STATE.catData = await catRes.json();
  const allMeta = await metaRes.json();
  STATE.catMeta = allMeta.find(c => c.id === STATE.cat) || allMeta[0];
  STATE.questions = STATE.catData.questions;
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ─── INTRO ────────────────────────────────────────────────────────────────────
function showIntro() {
  const { from, to, msg } = STATE.params;
  const cd = STATE.catData;
  const cm = STATE.catMeta;

  const senderName = from || cd.senderName;

  const senderEl = document.getElementById('introSender');
  senderEl.textContent = '';
  const fullText = `💌 ${senderName}dan sizga`;
  typewriterEffect(senderEl, fullText, 55);

  document.getElementById('introCategoryEmoji').textContent = cm.emoji;
  document.getElementById('introTitle').textContent = cm.title;

  const receiverName = to || cd.receiverName;
  const message = msg || cd.customMessage || `Bu o'yin ${senderName}dan siz uchun! 💕`;
  document.getElementById('introMessage').textContent = message;
  document.getElementById('introReceiver').textContent = `🌸 ${receiverName} 🌸`;

  document.getElementById('btnStart').addEventListener('click', startGame, { once: true });
  showScreen('screenIntro');
}

function typewriterEffect(el, text, speed = 55) {
  el.textContent = '';
  el.classList.add('typewriter');
  let i = 0;
  const interval = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) {
      clearInterval(interval);
      el.classList.remove('typewriter');
    }
  }, speed);
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
function startGame() {
  startBackgroundMusic();
  STATE.currentQ = 0;
  STATE.streak = 0;
  STATE.stars = [];
  STATE.wrongAttempts = 0;
  STATE.totalWrongAttempts = 0;
  STATE.ghostShown = false;
  STATE.speedMultiplier = 1;

  updateProgress();
  showScreen('screenGame');
  setTimeout(() => renderQuestion(), 200);
}

function updateProgress() {
  const total = STATE.questions.length;
  const done = STATE.currentQ;
  const heartsEl = document.getElementById('progressHearts');
  heartsEl.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const span = document.createElement('span');
    span.className = `progress-heart ${i < done ? 'filled' : 'empty'}`;
    span.textContent = i < done ? '❤️' : '🤍';
    heartsEl.appendChild(span);
  }

  document.getElementById('questionCounter').textContent =
    `Savol ${done + 1}/${total}`;
}

function renderQuestion() {
  // MUHIM: oldingi savolda qochib ketgan tugmalarni tozalash
  cleanupFleeingButtons();

  if (STATE.currentQ >= STATE.questions.length) {
    showReward(); return;
  }

  const q = STATE.questions[STATE.currentQ];
  STATE.wrongAttempts = 0;

  const card = document.getElementById('questionCard');
  card.className = `question-card glass-card ${q.theme ? 'theme-' + q.theme : ''}`;
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = '';
  card.classList.add('slide-in');

  const emojiEl = document.getElementById('questionEmoji');
  emojiEl.textContent = '';
  setTimeout(() => { emojiEl.textContent = q.emoji; }, 50);

  const textEl = document.getElementById('questionText');
  textEl.textContent = '';
  setTimeout(() => typewriterEffect(textEl, q.text, 30), 200);

  renderOptions(q);

  document.getElementById('feedbackMsg').className = 'feedback-msg hidden';
  document.getElementById('hintBubble').classList.add('hidden');
  setTimeout(() => document.getElementById('streakBadge').classList.add('hidden'), 1500);
}

function renderOptions(q) {
  const grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';

  q.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optText;
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(12px)';

    setTimeout(() => {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    }, 300 + idx * 100);

    const isCorrect = idx === q.correctIndex;

    if (isCorrect) {
      btn.addEventListener('mouseenter', () => {
        document.getElementById('heartbeatIndicator').classList.add('fast');
        playHover();
      });
      btn.addEventListener('mouseleave', () => {
        document.getElementById('heartbeatIndicator').classList.remove('fast');
      });
      btn.addEventListener('click', () => handleCorrect(btn, q));
    } else {
      // ── FLEE MEXANIKASI ──
      // Noto'g'ri javoblar yaqinlashganda ham, bosilganda ham qochadi.
      if (!STATE.isPreview) {
        btn.addEventListener('pointerenter', (e) => {
          if (btn.classList.contains('disabled')) return;
          handleWrongInteraction(btn, e.clientX, e.clientY, q);
        });
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (btn.classList.contains('disabled')) return;
          handleWrongInteraction(btn, e.clientX, e.clientY, q);
        });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (btn.classList.contains('disabled')) return;
          handleWrongInteraction(btn, e.clientX, e.clientY, q);
        });
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (btn.classList.contains('disabled')) return;
          const t = e.touches[0] || { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
          handleWrongInteraction(btn, t.clientX, t.clientY, q);
        }, { passive: false });
        btn.addEventListener('focus', () => {
          if (btn.classList.contains('disabled')) return;
          const rect = btn.getBoundingClientRect();
          handleWrongInteraction(btn, rect.left + rect.width / 2, rect.top + rect.height / 2, q);
        });
      } else {
        // Preview rejimida: qochmaydi, faqat xabar ko'rsatadi
        btn.addEventListener('click', () => {
          if (btn.classList.contains('disabled')) return;
          onWrongAttempt(btn, q);
          playWrong();
        });
      }
    }

    grid.appendChild(btn);
  });
}

// ─── FLEE MEXANIKASI ─────────────────────────────────────────────────────────

// Noto'g'ri tugma bosilganda: feedback + tovush + qochish
function handleWrongInteraction(btn, clientX, clientY, q) {
  const now = performance.now();
  if (btn._lastFleeAt && now - btn._lastFleeAt < 140) return;
  btn._lastFleeAt = now;

  onWrongAttempt(btn, q);
  playWrong();
  spawnReactionEmoji(clientX, clientY);
  fleeButton(btn, clientX, clientY);
}

// Tugmani qochirish — birinchi bosilishda placeholder yaratib, keyingilarida yangi pozitsiyaga o'tkazadi
function fleeButton(btn, clientX, clientY) {
  const isMob = STATE.isMobile;

  if (!btn._originalRect) {
    // BIRINCHI bosilish: hozirgi joylashuvni yodlab qol, placeholder qo'y
    const rect = btn.getBoundingClientRect();
    btn._originalRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

    // Griдda joy saqlab qolish uchun ko'rinmas placeholder
    const ph = document.createElement('div');
    ph.className = 'flee-placeholder';
    ph.style.cssText = `width:${rect.width}px;height:${rect.height}px;min-width:${rect.width}px;min-height:${rect.height}px;visibility:hidden;flex-shrink:0;border-radius:50px;pointer-events:none;`;
    btn.parentNode.insertBefore(ph, btn);
    btn._placeholder = ph;

    // Tugmani body ga o'tkazib, fixed pozitsiyada dastlabki o'rnida joylashtir (vizual sakrash yo'q)
    document.body.appendChild(btn);
    btn.style.position = 'fixed';
    btn.style.left = rect.left + 'px';
    btn.style.top = rect.top + 'px';
    btn.style.width = rect.width + 'px';
    btn.style.margin = '0';
    btn.style.zIndex = '100';
    btn.classList.add('fleeing');
  }

  // Joriy joylashuv (trail uchun)
  const curLeft = parseFloat(btn.style.left) || 0;
  const curTop  = parseFloat(btn.style.top)  || 0;
  const w = btn._originalRect.width;
  const h = btn._originalRect.height;
  spawnTrail({ left: curLeft, top: curTop, width: w, height: h });

  // Mobil: puff efekti qo'shimcha
  if (isMob) spawnPuff(curLeft + w / 2, curTop + h / 2);

  // Ekran ichidan kursor/touch nuqtasidan uzoqroq xavfsiz joy tanlaymiz.
  const pad = STATE.isMobile ? 14 : 24;
  const minTop = 64;
  const maxX = Math.max(pad, window.innerWidth - w - pad);
  const maxY = Math.max(minTop, window.innerHeight - h - pad);
  const dangerX = Number.isFinite(clientX) ? clientX : curLeft + w / 2;
  const dangerY = Number.isFinite(clientY) ? clientY : curTop + h / 2;
  let best = { x: curLeft, y: curTop, score: -1 };

  for (let i = 0; i < 18; i++) {
    const candidateX = pad + Math.random() * Math.max(1, maxX - pad);
    const candidateY = minTop + Math.random() * Math.max(1, maxY - minTop);
    const centerX = candidateX + w / 2;
    const centerY = candidateY + h / 2;
    const score = Math.hypot(centerX - dangerX, centerY - dangerY);
    if (score > best.score) best = { x: candidateX, y: candidateY, score };
  }

  const nx = Math.max(pad, Math.min(maxX, best.x));
  const ny = Math.max(minTop, Math.min(maxY, best.y));

  btn.style.transition = 'left 0.28s cubic-bezier(0.16,1,0.3,1), top 0.28s cubic-bezier(0.16,1,0.3,1), transform 0.28s cubic-bezier(0.16,1,0.3,1)';
  btn.style.transform = `rotate(${(Math.random() * 10 - 5).toFixed(2)}deg)`;
  btn.style.left = nx + 'px';
  btn.style.top  = ny + 'px';
}

// Qochib ketgan barcha tugmalarni tozalash (savol o'zgarishida)
function cleanupFleeingButtons() {
  document.querySelectorAll('.option-btn.fleeing').forEach(btn => {
    if (btn._placeholder) { btn._placeholder.remove(); btn._placeholder = null; }
    btn._originalRect = null;
    btn.remove();
  });
  // Placeholder lar qolgan bo'lsa ularni ham tozala
  document.querySelectorAll('.flee-placeholder').forEach(ph => ph.remove());
}

function spawnTrail(rect) {
  const trail = document.createElement('div');
  trail.className = 'ghost-trail';
  trail.style.left   = rect.left   + 'px';
  trail.style.top    = rect.top    + 'px';
  trail.style.width  = rect.width  + 'px';
  trail.style.height = (rect.height || 46) + 'px';
  document.body.appendChild(trail);
  setTimeout(() => trail.remove(), 400);
}

function spawnPuff(x, y) {
  const puff = document.createElement('div');
  puff.className = 'puff-smoke';
  puff.textContent = '💨';
  puff.style.left = (x - 16) + 'px';
  puff.style.top  = (y - 16) + 'px';
  document.body.appendChild(puff);
  setTimeout(() => puff.remove(), 500);
}

function spawnReactionEmoji(x, y) {
  const reactions = ['😝', '🙈', '😈', '🏃', '😜', '👋', '✌️'];
  const el = document.createElement('div');
  el.className = 'reaction-emoji';
  el.textContent = reactions[Math.floor(Math.random() * reactions.length)];
  el.style.left = (x - 16) + 'px';
  el.style.top  = (y - 30) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function onWrongAttempt(btn, q) {
  STATE.wrongAttempts++;
  STATE.totalWrongAttempts++;
  STATE.streak = 0;
  STATE.speedMultiplier = Math.min(3, 1 + STATE.wrongAttempts * 0.4);

  showFeedback(q.wrongMessage || 'Yo\'q-yo\'q! 😄', 'error');

  if (STATE.wrongAttempts >= 5) {
    document.getElementById('hintBubble').classList.remove('hidden');
  }

  if (STATE.totalWrongAttempts >= 10 && !STATE.ghostShown) {
    STATE.ghostShown = true;
    showGhostButton();
  }
}

function showGhostButton() {
  const ghost = document.getElementById('ghostBtn');
  ghost.classList.remove('hidden');
  ghost.style.left = '20px';
  ghost.style.top  = (100 + Math.random() * (window.innerHeight - 200)) + 'px';

  setTimeout(() => {
    ghost.style.transition = 'all 3s ease-in-out';
    ghost.style.left    = '-300px';
    ghost.style.opacity = '0';
    setTimeout(() => ghost.classList.add('hidden'), 3000);
  }, 2500);
}

// ─── TO'G'RI JAVOB ───────────────────────────────────────────────────────────
function handleCorrect(btn, q) {
  // Barcha tugmalarni bloklash
  document.querySelectorAll('.option-btn').forEach(b => {
    b.classList.add('disabled');
    b.style.cursor = 'default';
    b.style.pointerEvents = 'none';
  });

  // To'g'ri tugmani bezash (agar qochib ketgan bo'lsa, qaytarib ko'rsatish)
  btn.classList.add('correct');
  if (btn.classList.contains('fleeing')) {
    btn.classList.remove('fleeing');
    btn.style.transition = 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    // Markazga qaytarish
    const card = document.getElementById('questionCard');
    const cr = card.getBoundingClientRect();
    btn.style.left = (cr.left + cr.width / 2 - btn._originalRect.width / 2) + 'px';
    btn.style.top  = (cr.top  + cr.height / 2) + 'px';
  }

  document.getElementById('heartbeatIndicator').classList.remove('fast');

  const stars = STATE.wrongAttempts === 0 ? 3 : STATE.wrongAttempts <= 2 ? 2 : 1;
  STATE.stars.push(stars);

  STATE.streak++;
  if (STATE.streak >= 3) showStreakBadge();

  showFeedback(q.correctMessage || 'To\'g\'ri! 🎉', 'success');
  playCorrect();
  burstConfetti(45);

  setTimeout(() => {
    STATE.currentQ++;
    updateProgress();
    const wrapper = document.getElementById('questionWrapper');
    wrapper.style.animation = 'slideOutLeft 0.3s ease forwards';
    setTimeout(() => {
      wrapper.style.animation = '';
      renderQuestion();
    }, 300);
  }, 1900);
}

function showStreakBadge() {
  const badge = document.getElementById('streakBadge');
  badge.textContent = `🔥 ${STATE.streak} ta ketma-ket!`;
  badge.classList.remove('hidden');
}

function showFeedback(msg, type) {
  const el = document.getElementById('feedbackMsg');
  el.textContent = msg;
  el.className = `feedback-msg ${type}`;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx2d = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiRAF = null;

function resizeCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function burstConfetti(count = 60) {
  const colors = ['#FF6B9D','#6B9DFF','#FFD700','#2ecc71','#FF8C69','#B5EAD7','#FFB3CC'];
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 180,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: -7 - Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      gravity: 0.35,
      life: 1,
    });
  }
  if (!confettiRAF) animateConfetti();
}

function animateConfetti() {
  ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.life > 0);

  confettiParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += p.gravity;
    p.rotation += p.rotSpeed;
    p.life -= 0.012;

    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, p.life);
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rotation * Math.PI / 180);
    ctx2d.fillStyle = p.color;
    ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx2d.restore();
  });

  if (confettiParticles.length > 0) {
    confettiRAF = requestAnimationFrame(animateConfetti);
  } else {
    confettiRAF = null;
    ctx2d.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function megaConfetti() {
  const colors = ['#FF6B9D','#6B9DFF','#FFD700','#2ecc71','#FF8C69','#B5EAD7','#FFB3CC','#C9A96E'];
  for (let i = 0; i < 160; i++) {
    confettiParticles.push({
      x: Math.random() * window.innerWidth,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 7 + Math.random() * 10,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.1,
      life: 1.2,
    });
  }
  ['💕','💗','❤️','💖','🌸','⭐','✨'].forEach((sym, i) => {
    setTimeout(() => spawnFloatingHeart(sym), i * 200);
  });
  if (!confettiRAF) animateConfetti();
}

function spawnFloatingHeart(sym) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;z-index:998;pointer-events:none;
    font-size:${20 + Math.random() * 20}px;
    left:${10 + Math.random() * 80}%;
    bottom:-40px;
    animation:heartRise ${3 + Math.random() * 3}s ease-in forwards;
  `;
  el.textContent = sym;
  document.body.appendChild(el);

  if (!document.getElementById('heartRiseStyle')) {
    const s = document.createElement('style');
    s.id = 'heartRiseStyle';
    s.textContent = `
      @keyframes heartRise {
        0% { transform:translateY(0) scale(1); opacity:1; }
        100% { transform:translateY(-110vh) scale(1.3); opacity:0; }
      }`;
    document.head.appendChild(s);
  }
  setTimeout(() => el.remove(), 6000);
}

// ─── FIREWORKS ────────────────────────────────────────────────────────────────
function spawnFireworks() {
  const symbols = ['🎆','🎇','✨','🌟','💫','⭐'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const fw = document.createElement('div');
      fw.className = 'firework';
      fw.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      fw.style.left = (5 + Math.random() * 90) + '%';
      fw.style.top  = (5 + Math.random() * 70) + '%';
      document.body.appendChild(fw);
      setTimeout(() => fw.remove(), 1200);
    }, i * 150);
  }
}

// ─── REWARD ───────────────────────────────────────────────────────────────────
function showReward() {
  cleanupFleeingButtons();
  playFinale();
  megaConfetti();

  const cm   = STATE.catMeta;
  const cd   = STATE.catData;
  const { from, to, loc, dt, special } = STATE.params;
  const senderName   = from || cd.senderName;
  const receiverName = to   || cd.receiverName;
  const reward     = cd.finalReward;
  const rewardType = cm.endReward.type;

  const container = document.getElementById('rewardContainer');
  container.innerHTML = '';

  switch(rewardType) {
    case 'letter':
      renderLetterReward(container, reward, senderName, receiverName, special);
      break;
    case 'ticket':
      renderTicketReward(container, reward, senderName, receiverName, loc, dt);
      break;
    case 'gift':
      renderGiftReward(container, reward, senderName, receiverName);
      break;
    case 'countdown':
      renderCountdownReward(container, reward, senderName, receiverName, cm);
      spawnFireworks();
      break;
    default:
      renderLetterReward(container, reward, senderName, receiverName, special);
  }

  renderStars();
  showScreen('screenReward');

  document.getElementById('btnShareResult').addEventListener('click', shareResult, { once: true });
  document.getElementById('btnScreenshot').addEventListener('click', saveScreenshot, { once: true });
}

// URL parametrlaridan kelgan FROM/TO bilan JSON dagi [FROM]/[TO] ni almashtiradi
function rn(text, from, to) {
  if (!text) return '';
  return String(text).replace(/\[FROM\]/g, from).replace(/\[TO\]/g, to);
}

function renderLetterReward(container, reward, from, to, special) {
  const body     = rn(special || reward.body, from, to);
  const headline = rn(reward.headline, from, to);
  const signoff  = rn(reward.signoff  || `${from}dan 💕`, from, to);
  const bonus    = reward.bonusReveal ? rn(reward.bonusReveal, from, to) : '';
  container.innerHTML = `
    <div class="reward-letter glass-card">
      <span class="wax-seal">💌</span>
      <div class="letter-headline">${escapeHtml(headline)}</div>
      <div class="letter-body">${escapeHtml(body)}</div>
      <div class="letter-signoff">${escapeHtml(signoff)}</div>
      ${bonus ? `<div class="letter-bonus">${escapeHtml(bonus)}</div>` : ''}
    </div>
  `;
}

function renderTicketReward(container, reward, from, to, loc, dt) {
  const location = loc || 'Toshkent, Cinema';
  const date     = dt  || 'Yaqin orada';
  container.innerHTML = `
    <div class="reward-ticket">
      <div class="ticket-top">
        <div class="ticket-logo">🎬</div>
        <div class="ticket-event">${escapeHtml(reward.title || 'Kino Chiptasi')}</div>
        <div class="ticket-sub">HeartQuest tomonidan taqdim etildi</div>
      </div>
      <div class="ticket-divider">
        <div class="ticket-hole"></div><div class="ticket-hole"></div>
      </div>
      <div class="ticket-bottom">
        <div class="ticket-field">
          <div class="ticket-label">Kimdan</div>
          <div class="ticket-value">${escapeHtml(from)}</div>
        </div>
        <div class="ticket-field">
          <div class="ticket-label">Kimga</div>
          <div class="ticket-value">${escapeHtml(to)}</div>
        </div>
        <div class="ticket-field">
          <div class="ticket-label">📍 Joy</div>
          <div class="ticket-value">${escapeHtml(location)}</div>
        </div>
        <div class="ticket-field">
          <div class="ticket-label">📅 Sana</div>
          <div class="ticket-value">${escapeHtml(date)}</div>
        </div>
        <div class="ticket-field">
          <div class="ticket-label">🎟️ O'rinlar</div>
          <div class="ticket-value">2 × VIP</div>
        </div>
        <div class="ticket-field">
          <div class="ticket-label">✅ Holati</div>
          <div class="ticket-value" style="color:#2ecc71">Tasdiqlangan</div>
        </div>
        <div class="ticket-qr-decor">▓▓▓▓▓▓ HEARTQUEST ▓▓▓▓▓▓</div>
      </div>
    </div>
  `;
}

function renderGiftReward(container, reward, from, to) {
  const headline = rn(reward.headline, from, to);
  const body     = rn(reward.body,     from, to);
  const signoff  = rn(reward.signoff  || `${from}dan 🎁`, from, to);
  const bonus    = reward.bonusReveal ? rn(reward.bonusReveal, from, to) : '';
  container.innerHTML = `
    <div class="reward-gift glass-card">
      <div class="gift-box-wrapper">
        <div class="gift-box" id="giftBox">🎁</div>
      </div>
      <div class="gift-click-hint" id="giftHint">👆 Sovg'ani ochish uchun bosing!</div>
      <div class="gift-content" id="giftContent" style="display:none">
        <div class="gift-headline">${escapeHtml(headline)}</div>
        <div class="gift-body">${escapeHtml(body)}</div>
        ${bonus ? `<div class="gift-bonus">${escapeHtml(bonus)}</div>` : ''}
        <div class="letter-signoff" style="margin-top:16px">${escapeHtml(signoff)}</div>
      </div>
    </div>
  `;

  document.getElementById('giftBox').addEventListener('click', () => {
    const box     = document.getElementById('giftBox');
    const content = document.getElementById('giftContent');
    const hint    = document.getElementById('giftHint');
    box.style.cssText += 'transform:scale(1.5) rotate(20deg);opacity:0;transition:all 0.5s ease;';
    burstConfetti(90);
    playFinale();
    setTimeout(() => {
      hint.style.display  = 'none';
      box.style.display   = 'none';
      content.style.display = 'block';
    }, 500);
  }, { once: true });
}

function renderCountdownReward(container, reward, from, to, catMeta) {
  reward = {
    ...reward,
    headline:    rn(reward.headline,    from, to),
    body:        rn(reward.body,        from, to),
    signoff:     rn(reward.signoff || `${from}dan 💍`, from, to),
    bonusReveal: rn(reward.bonusReveal, from, to),
  };
  const targetDate = new Date(catMeta.endReward.countdownDate || '2027-01-01');

  function getTimeParts() {
    const diff = Math.max(0, targetDate - new Date());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000)  / 60000),
      s: Math.floor((diff % 60000)    / 1000),
    };
  }

  const t = getTimeParts();
  container.innerHTML = `
    <div class="reward-countdown glass-card">
      <div class="countdown-headline">${escapeHtml(reward.headline || '')}</div>
      <div class="countdown-display">
        <div class="countdown-unit"><span class="countdown-num" id="cd-d">${t.d}</span><span class="countdown-label">Kun</span></div>
        <div class="countdown-unit"><span class="countdown-num" id="cd-h">${t.h}</span><span class="countdown-label">Soat</span></div>
        <div class="countdown-unit"><span class="countdown-num" id="cd-m">${t.m}</span><span class="countdown-label">Daqiqa</span></div>
        <div class="countdown-unit"><span class="countdown-num" id="cd-s">${t.s}</span><span class="countdown-label">Soniya</span></div>
      </div>
      <div class="countdown-body">${escapeHtml(reward.body)}</div>
      ${reward.bonusReveal ? `<div class="letter-bonus" style="margin-top:16px">${escapeHtml(reward.bonusReveal)}</div>` : ''}
      <div class="letter-signoff" style="margin-top:16px">${escapeHtml(reward.signoff || from + 'dan 💍')}</div>
    </div>
  `;

  setInterval(() => {
    const t2 = getTimeParts();
    const dEl = document.getElementById('cd-d');
    if (dEl) {
      dEl.textContent = t2.d;
      document.getElementById('cd-h').textContent = t2.h;
      document.getElementById('cd-m').textContent = t2.m;
      document.getElementById('cd-s').textContent = t2.s;
    }
  }, 1000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;')
    .replace(/\n/g,'<br>');
}

// ─── YULDUZLAR ────────────────────────────────────────────────────────────────
function renderStars() {
  const totalStars = STATE.stars.reduce((a, b) => a + b, 0);
  const maxStars   = STATE.questions.length * 3;
  const pct = totalStars / maxStars;
  const displayStars = pct >= 0.85 ? 3 : pct >= 0.55 ? 2 : 1;

  const el = document.getElementById('starsDisplay');
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.textContent = i < displayStars ? '⭐' : '☆';
    span.className   = i < displayStars ? 'star-filled' : 'star-empty';
    if (i < displayStars) span.style.animationDelay = `${0.9 + i * 0.15}s`;
    el.appendChild(span);
  }
}

// ─── ULASHISH ─────────────────────────────────────────────────────────────────
function shareResult() {
  const cm   = STATE.catMeta;
  const url  = window.location.href;
  const text = `Men HeartQuest o'yinidan o'tdim! ${cm.emoji} ${cm.title}`;
  if (navigator.share) {
    navigator.share({ title: 'HeartQuest 💕', text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      alert('Link nusxalandi! Do\'stlaringizga yuboring 💕');
    }).catch(() => {
      alert('Link: ' + url);
    });
  }
}

function saveScreenshot() {
  const os = /Mac/i.test(navigator.userAgent) ? 'Cmd+Shift+4' : 'Win+Shift+S';
  alert(`Ekran rasmini olish uchun: ${os} 💕`);
}

// ─── OVOZ ─────────────────────────────────────────────────────────────────────
function toggleMute() {
  STATE.muted = !STATE.muted;
  document.getElementById('muteBtn').textContent = STATE.muted ? '🔇' : '🔊';
  localStorage.setItem('hq_muted', STATE.muted ? '1' : '');

  if (STATE.bgMusic) {
    if (STATE.muted) {
      STATE.bgMusic.pause();
    } else {
      startBackgroundMusic();
    }
  }
}

function loadMuteState() {
  STATE.muted = !!localStorage.getItem('hq_muted');
  document.getElementById('muteBtn').textContent = STATE.muted ? '🔇' : '🔊';
}

// ─── FON ZARRACHALARI ─────────────────────────────────────────────────────────
function createBgParticles() {
  const container = document.getElementById('bgParticles');
  const symbols   = ['💕','✨','🌸','⭐','💫','🌹','💗','🎀','🌟','💖'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'bp';
    el.textContent = symbols[i % symbols.length];
    el.style.left             = `${Math.random() * 100}%`;
    el.style.fontSize         = `${10 + Math.random() * 14}px`;
    el.style.animationDuration = `${10 + Math.random() * 15}s`;
    el.style.animationDelay   = `${-Math.random() * 15}s`;
    el.style.opacity          = (0.06 + Math.random() * 0.08).toString();
    container.appendChild(el);
  }
}

// ─── RESIZE ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  resizeCanvas();
  // Qochib ketgan tugmalar ekrandan chiqib ketmasligi uchun
  document.querySelectorAll('.option-btn.fleeing').forEach(btn => {
    const w   = parseFloat(btn.style.width) || 120;
    const h   = btn.offsetHeight || 46;
    let left  = parseFloat(btn.style.left) || 0;
    let top   = parseFloat(btn.style.top)  || 0;
    left = Math.max(8, Math.min(window.innerWidth  - w - 8, left));
    top  = Math.max(64, Math.min(window.innerHeight - h - 8, top));
    btn.style.left = left + 'px';
    btn.style.top  = top  + 'px';
  });
});
