const MAX_RULES = 50;
const MAX_VOWS = 30;

// State
let selectedAuthor = 'ko';
let selectedVowAuthor = 'ko';
let editingIndex = null;
let state = loadState();

function getDefaultState() {
  return {
    customRules: [],
    customVows: [],
    vowIndex: 0,
    pledgeSigned: false,
    lastActive: new Date().toISOString()
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem('loveRulesState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.customRules) parsed.customRules = [];
      if (!parsed.customVows) parsed.customVows = [];
      return parsed;
    }
  } catch (e) {}
  return getDefaultState();
}

function saveState() {
  state.lastActive = new Date().toISOString();
  localStorage.setItem('loveRulesState', JSON.stringify(state));
}

// ─── RULES ───────────────────────────────────────────────

function renderCustomRules() {
  const container = document.getElementById('customRulesList');
  if (!container) return;

  if (state.customRules.length === 0) {
    container.innerHTML = '<p class="empty-state">No rules yet. Add your first rule together!</p>';
    return;
  }

  container.innerHTML = state.customRules.map((rule, i) => `
    <div class="rule-card ${rule.completed ? 'completed' : ''}" data-author="${rule.author}" onclick="toggleCustomRule(${i})">
      <div class="rule-icon">${rule.author === 'ko' ? '\u{1F468}' : '\u{1F469}'}</div>
      <div class="rule-text">
        <h3>${escapeHtml(rule.title)}</h3>
        <p>${escapeHtml(rule.desc)}</p>
        <span class="author-badge ${rule.author}">${rule.author === 'ko' ? 'Ko' : 'Thet Htar'}</span>
      </div>
      <div class="rule-actions">
        <button class="rule-action-btn edit-btn" onclick="event.stopPropagation(); editCustomRule(${i})" aria-label="Edit rule">&#9998;</button>
        <button class="rule-action-btn delete-btn" onclick="event.stopPropagation(); deleteCustomRule(${i})" aria-label="Delete rule">&times;</button>
      </div>
    </div>
  `).join('');
}

function toggleCustomRule(index) {
  state.customRules[index].completed = !state.customRules[index].completed;
  saveState();
  renderCustomRules();
  updateStats();
  if (state.customRules[index].completed) {
    showToast(`\u2705 "${truncate(state.customRules[index].title)}" done!`);
    if (getCompletedCount() === state.customRules.length) {
      showToast('\u{1F389} All rules completed! You two are amazing!');
    }
  }
}

function deleteCustomRule(index) {
  const rule = state.customRules[index];
  state.customRules.splice(index, 1);
  if (editingIndex === index) cancelEdit();
  else if (editingIndex > index) editingIndex--;
  saveState();
  renderCustomRules();
  updateProgress();
  updateStats();
  showToast(`Deleted "${truncate(rule.title)}"`);
}

function editCustomRule(index) {
  const rule = state.customRules[index];
  editingIndex = index;

  document.getElementById('ruleTitleInput').value = rule.title;
  document.getElementById('ruleDescInput').value = rule.desc;
  selectAuthor(rule.author);

  document.getElementById('ruleFormHeading').textContent = '\u270E Edit Rule';
  const btn = document.getElementById('ruleSubmitBtn');
  btn.textContent = '\u{1F504} Update';
  btn.classList.add('edit-mode');
  document.getElementById('ruleCancelBtn').style.display = 'block';
  document.getElementById('ruleTitleInput').focus();
  document.getElementById('addRuleForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEdit() {
  editingIndex = null;
  document.getElementById('ruleTitleInput').value = '';
  document.getElementById('ruleDescInput').value = '';
  resetRuleForm();
}

function resetRuleForm() {
  document.getElementById('ruleFormHeading').textContent = '\u2726 Add a Rule \u2726';
  const btn = document.getElementById('ruleSubmitBtn');
  btn.textContent = '+ Add Rule';
  btn.classList.remove('edit-mode');
  document.getElementById('ruleCancelBtn').style.display = 'none';
}

function addCustomRule() {
  const titleEl = document.getElementById('ruleTitleInput');
  const descEl = document.getElementById('ruleDescInput');
  const title = titleEl.value.trim();
  const desc = descEl.value.trim();

  if (!title) {
    showToast('Please enter a title');
    titleEl.focus();
    return;
  }

  if (editingIndex !== null) {
    state.customRules[editingIndex] = {
      ...state.customRules[editingIndex],
      title,
      desc: desc || 'A rule we made together.',
      author: selectedAuthor
    };
    saveState();
    titleEl.value = '';
    descEl.value = '';
    resetRuleForm();
    editingIndex = null;
    renderCustomRules();
    updateProgress();
    updateStats();
    showToast('\u{1F504} Rule updated!');
    return;
  }

  if (state.customRules.length >= MAX_RULES) {
    showToast(`Max ${MAX_RULES} rules reached`);
    return;
  }

  state.customRules.push({
    title,
    desc: desc || 'A rule we made together.',
    author: selectedAuthor,
    completed: false
  });
  saveState();

  titleEl.value = '';
  descEl.value = '';
  titleEl.focus();

  renderCustomRules();
  updateProgress();
  updateStats();
  showToast(`\u2764 Rule added by ${selectedAuthor === 'ko' ? 'Ko' : 'Thet Htar'}!`);
}

function selectAuthor(author) {
  selectedAuthor = author;
  document.getElementById('authorKoBtn').classList.toggle('active', author === 'ko');
  document.getElementById('authorThetBtn').classList.toggle('active', author === 'thet');
}

// ─── VOWS ────────────────────────────────────────────────

function renderVows() {
  const area = document.getElementById('vowsArea');
  const carousel = document.getElementById('vowCarousel');
  const controls = document.getElementById('vowControls');
  const empty = document.getElementById('emptyVows');
  const text = document.getElementById('vowText');
  const counter = document.getElementById('vowCounter');

  if (state.customVows.length === 0) {
    carousel.style.display = 'none';
    controls.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  carousel.style.display = 'block';
  controls.style.display = 'flex';

  showVow(state.vowIndex);
}

function showVow(index) {
  const text = document.getElementById('vowText');
  const counter = document.getElementById('vowCounter');
  if (!text || !counter) return;

  state.vowIndex = ((index % state.customVows.length) + state.customVows.length) % state.customVows.length;
  saveState();

  const vow = state.customVows[state.vowIndex];
  const authorLabel = vow.author === 'ko' ? 'Ko' : 'Thet Htar';

  text.style.opacity = '0';
  text.style.transform = 'translateY(12px)';

  setTimeout(() => {
    text.innerHTML = `${escapeHtml(vow.text)} <span class="vow-author">\u2014 ${authorLabel}</span>`;
    text.style.opacity = '1';
    text.style.transform = 'translateY(0)';
  }, 200);

  counter.textContent = `${state.vowIndex + 1} / ${state.customVows.length}`;
}

function nextVow() {
  if (state.customVows.length === 0) return;
  showVow(state.vowIndex + 1);
}

function prevVow() {
  if (state.customVows.length === 0) return;
  showVow(state.vowIndex - 1);
}

function selectVowAuthor(author) {
  selectedVowAuthor = author;
  document.getElementById('vowAuthorKoBtn').classList.toggle('active', author === 'ko');
  document.getElementById('vowAuthorThetBtn').classList.toggle('active', author === 'thet');
}

function addVow() {
  const input = document.getElementById('vowInput');
  const text = input.value.trim();

  if (!text) {
    showToast('Please write a vow');
    input.focus();
    return;
  }

  if (state.customVows.length >= MAX_VOWS) {
    showToast(`Max ${MAX_VOWS} vows reached`);
    return;
  }

  state.customVows.push({
    text,
    author: selectedVowAuthor
  });
  saveState();

  input.value = '';
  input.focus();
  renderVows();
  updateStats();
  showToast(`\u2764 Vow added by ${selectedVowAuthor === 'ko' ? 'Ko' : 'Thet Htar'}!`);
}

// ─── PROGRESS / STATS ────────────────────────────────────

function getCompletedCount() {
  return state.customRules.filter(r => r.completed).length;
}

function updateProgress() {
  const total = state.customRules.length;
  const done = getCompletedCount();
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (fill) fill.style.width = total > 0 ? `${(done / total) * 100}%` : '0%';
  if (text) text.textContent = total > 0 ? `${done} / ${total}` : '0 / 0';
}

function updateStats() {
  document.getElementById('rulesCount').textContent = state.customRules.length;
  document.getElementById('vowsCount').textContent = state.customVows.length;
  const lastEl = document.getElementById('lastActive');
  if (lastEl) {
    const d = new Date(state.lastActive);
    lastEl.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// ─── PLEDGE ──────────────────────────────────────────────

function togglePledge() {
  state.pledgeSigned = !state.pledgeSigned;
  saveState();

  const btn = document.querySelector('.pledge-btn');
  const status = document.getElementById('pledgeStatus');

  if (state.pledgeSigned) {
    btn.textContent = '\u{1F389} We agreed to our rules';
    btn.classList.add('signed');
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    status.textContent = `\u2764 Signed by Ko & Thet Htar on ${d}`;
    status.classList.add('signed');
    showToast('\u{1F48D} Forever agreed!');
  } else {
    btn.textContent = '\u270D We agree to our rules';
    btn.classList.remove('signed');
    status.textContent = '';
    status.classList.remove('signed');
  }
}

// ─── ANNIVERSARY COUNTDOWN ──────────────────────────────

const ANNIVERSARY = new Date(2025, 1, 2);

function updateCountdown() {
  const now = new Date();
  let diff = now - ANNIVERSARY;

  if (diff < 0) {
    document.getElementById('cdYears').textContent = '0';
    document.getElementById('cdMonths').textContent = '0';
    document.getElementById('cdDays').textContent = '0';
    document.getElementById('cdHours').textContent = '0';
    document.getElementById('cdMinutes').textContent = '0';
    document.getElementById('cdSeconds').textContent = '0';
    return;
  }

  let years = now.getFullYear() - ANNIVERSARY.getFullYear();
  let months = now.getMonth() - ANNIVERSARY.getMonth();
  let days = now.getDate() - ANNIVERSARY.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  document.getElementById('cdYears').textContent = years;
  document.getElementById('cdMonths').textContent = months;
  document.getElementById('cdDays').textContent = days;
  document.getElementById('cdHours').textContent = String(hours).padStart(2, '0');
  document.getElementById('cdMinutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('cdSeconds').textContent = String(seconds).padStart(2, '0');
}

// ─── MONTHLY REMINDER (every 2nd) ───────────────────────

function checkMonthlyReminder() {
  const now = new Date();
  const todayDate = now.getDate();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  if (todayDate !== 2) return;

  const lastReminder = localStorage.getItem('lastReminderMonth');
  const reminderKey = `${thisYear}-${thisMonth}`;

  if (lastReminder === reminderKey) return;

  localStorage.setItem('lastReminderMonth', reminderKey);

  const banner = document.getElementById('reminderBanner');
  if (banner) {
    banner.style.display = 'flex';
    setTimeout(() => banner.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
  }

  showToast('\u{1F389} Happy Monthly Anniversary, Ko & Thet Htar! \u2764');

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('\u2764 Our Monthly Anniversary!', {
      body: 'Happy 2nd, Ko & Thet Htar! Another month of love together.',
      icon: ''
    });
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;

  const handler = () => {
    Notification.requestPermission();
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
}

// ─── RESET ───────────────────────────────────────────────

function resetAll() {
  const pass = prompt('Enter passcode to reset everything:');
  if (pass !== '8120') {
    if (pass !== null) showToast('Incorrect passcode');
    return;
  }
  state = getDefaultState();
  editingIndex = null;
  saveState();
  resetRuleForm();
  renderCustomRules();
  renderVows();
  updateProgress();
  updateStats();

  const btn = document.querySelector('.pledge-btn');
  const status = document.getElementById('pledgeStatus');
  btn.textContent = '\u270D We agree to our rules';
  btn.classList.remove('signed');
  status.textContent = '';
  status.classList.remove('signed');

  showToast('Reset complete. Start fresh!');
}

// ─── FLOATING HEARTS ─────────────────────────────────────

function createFloatingHearts() {
  const container = document.getElementById('heartsContainer');
  const isMobile = window.innerWidth < 480;
  const symbols = ['\u2764', '\u{1F49C}', '\u{1F49B}', '\u{1F49A}', '\u{1F5A4}'];
  const count = isMobile ? 8 : 16;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'heart-float';
    el.textContent = symbols[i % symbols.length];
    el.style.left = (Math.random() * 100) + '%';
    el.style.fontSize = (12 + Math.random() * 14) + 'px';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay = (Math.random() * 25) + 's';
    container.appendChild(el);
  }
}

// ─── TOAST ───────────────────────────────────────────────

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── SWIPE ───────────────────────────────────────────────

function setupSwipe() {
  const carousel = document.getElementById('vowCarousel');
  if (!carousel) return;
  let startX = 0;

  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextVow();
      else prevVow();
    }
  }, { passive: true });
}

// ─── HELPERS ─────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, len = 30) {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

function setDate() {
  const el = document.getElementById('dateDisplay');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

// ─── INIT ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const vowText = document.getElementById('vowText');
  if (vowText) vowText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  renderCustomRules();
  renderVows();
  updateProgress();
  updateStats();
  updateCountdown();
  setInterval(updateCountdown, 1000);

  if (state.pledgeSigned) {
    const btn = document.querySelector('.pledge-btn');
    const status = document.getElementById('pledgeStatus');
    btn.textContent = '\u{1F389} We agreed to our rules';
    btn.classList.add('signed');
    const d = new Date(state.lastActive).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    status.textContent = `\u2764 Signed by Ko & Thet Htar on ${d}`;
    status.classList.add('signed');
  }

  createFloatingHearts();
  setDate();
  setupSwipe();
  requestNotificationPermission();
  checkMonthlyReminder();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
});
