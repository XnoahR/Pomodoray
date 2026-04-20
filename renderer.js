// ===================================================================
// Pomodoray — Renderer
// ===================================================================

// ───── Settings & State ─────
const DEFAULTS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsPerCycle: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  notifications: true,
  theme: 'default',
};

let settings = loadJSON('pomodoray-settings', DEFAULTS);
let stats = loadJSON('pomodoray-stats', {
  todaySessions: 0,
  todayMinutes: 0,
  totalSessions: 0,
  streak: 0,
  lastDate: null,
  week: [0, 0, 0, 0, 0, 0, 0],
});

const MODES = {
  pomodoro: () => ({ duration: settings.focusDuration * 60, label: 'FOCUS TIME' }),
  shortBreak: () => ({ duration: settings.shortBreakDuration * 60, label: 'SHORT BREAK' }),
  longBreak: () => ({ duration: settings.longBreakDuration * 60, label: 'LONG BREAK' }),
};

let currentMode = 'pomodoro';
let timeRemaining = MODES.pomodoro().duration;
let totalTime = MODES.pomodoro().duration;
let isRunning = false;
let timerInterval = null;
let completedSessions = 0;
let isPinned = false;

// ───── Motivational Quotes ─────
const QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Focus on being productive instead of busy." — Tim Ferriss',
  '"It\'s not about time, it\'s about choices." — Beverly Adamo',
  '"Until we can manage time, we can manage nothing else." — Peter Drucker',
  '"Concentrate all your thoughts upon the work at hand." — Alexander Graham Bell',
  '"Don\'t watch the clock; do what it does. Keep going." — Sam Levenson',
  '"The way to get started is to quit talking and begin doing." — Walt Disney',
  '"You don\'t have to see the whole staircase, just take the first step." — MLK Jr.',
  '"Action is the foundational key to all success." — Pablo Picasso',
  '"Start where you are. Use what you have. Do what you can." — Arthur Ashe',
  '"Small daily improvements are the key to staggering long-term results."',
  '"Deep work is the ability to focus without distraction on a demanding task."',
  '"Energy, not time, is the fundamental currency of high performance."',
  '"Your mind is for having ideas, not holding them." — David Allen',
  '"Productivity is never an accident. It\'s the result of commitment to excellence."',
];

// ───── DOM Elements ─────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const timerText = $('#timerText');
const timerLabel = $('#timerLabel');
const timerProgress = $('#timerProgress');
const timerWrapper = $('#timerWrapper');
const startBtn = $('#startBtn');
const resetBtn = $('#resetBtn');
const skipBtn = $('#skipBtn');
const playIcon = startBtn.querySelector('.play-icon');
const pauseIcon = startBtn.querySelector('.pause-icon');
const modeButtons = $$('.mode-btn');
const modeIndicator = $('#modeIndicator');
const sessionDotsContainer = $('#sessionDots');
const sessionLabel = $('#sessionLabel');
const pinBtn = $('#pinBtn');
const minimizeBtn = $('#minimizeBtn');
const closeBtn = $('#closeBtn');
const folderListEl = $('#folderList');
const addFolderBtn = $('#addFolderBtn');
const taskEmpty = $('#taskEmpty');
const quoteText = $('#quoteText');

const CIRCUMFERENCE = 2 * Math.PI * 108;
timerProgress.style.strokeDasharray = CIRCUMFERENCE;

// ───── Timer Core ─────
function updateTimerDisplay() {
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  timerText.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.title = isRunning ? `${timerText.textContent} — Pomodoray` : 'Pomodoray';
}

function updateProgress() {
  const pct = timeRemaining / totalTime;
  timerProgress.style.strokeDashoffset = CIRCUMFERENCE - CIRCUMFERENCE * pct;
}

function startTimer() {
  isRunning = true;
  playIcon.classList.add('hidden');
  pauseIcon.classList.remove('hidden');
  document.body.classList.add('running');
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    updateProgress();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  document.body.classList.remove('running');
  updateTimerDisplay();
}

function resetTimer() {
  pauseTimer();
  const mode = MODES[currentMode]();
  timeRemaining = mode.duration;
  totalTime = mode.duration;
  updateTimerDisplay();
  updateProgress();
}

function onTimerComplete() {
  pauseTimer();

  // Pulse
  timerWrapper.classList.add('timer-pulse');
  setTimeout(() => timerWrapper.classList.remove('timer-pulse'), 2000);

  // Notification
  if (settings.notifications && Notification.permission === 'granted') {
    const msg = currentMode === 'pomodoro'
      ? 'Great work! Time for a break 🎉'
      : "Break's over! Let's focus 💪";
    new Notification('Pomodoray', { body: msg });
  }

  // Play notification sound
  playNotificationSound();

  // Update stats on focus completion
  if (currentMode === 'pomodoro') {
    completedSessions++;
    recordSession();
    updateSessionDots();
    rotateQuote();

    if (completedSessions >= settings.sessionsPerCycle) {
      completedSessions = 0;
      switchMode('longBreak');
      if (settings.autoStartBreak) startTimer();
    } else {
      switchMode('shortBreak');
      if (settings.autoStartBreak) startTimer();
    }
  } else {
    switchMode('pomodoro');
    if (settings.autoStartFocus) startTimer();
  }
}

function switchMode(mode) {
  currentMode = mode;
  const m = MODES[mode]();
  timeRemaining = m.duration;
  totalTime = m.duration;

  // Mode class (for CSS variable overrides)
  document.body.classList.remove('mode-shortBreak', 'mode-longBreak');
  if (mode !== 'pomodoro') document.body.classList.add(`mode-${mode}`);

  // Active button
  modeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));
  timerLabel.textContent = m.label;

  updateTimerDisplay();
  updateProgress();
  updateModeIndicator();
  updateSessionDots();
}

// ───── Mode Indicator ─────
function updateModeIndicator() {
  const activeBtn = $(`.mode-btn[data-mode="${currentMode}"]`);
  if (!activeBtn) return;
  const parent = activeBtn.parentElement;
  const pr = parent.getBoundingClientRect();
  const br = activeBtn.getBoundingClientRect();
  modeIndicator.style.width = `${br.width}px`;
  modeIndicator.style.transform = `translateX(${br.left - pr.left - 4}px)`;
}

function renderSessionDots() {
  sessionDotsContainer.innerHTML = '';
  for (let i = 0; i < settings.sessionsPerCycle; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    dot.dataset.index = i;
    sessionDotsContainer.appendChild(dot);
  }
}

function updateSessionDots() {
  const dots = sessionDotsContainer.querySelectorAll('.session-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('completed', 'active');
    if (i < completedSessions) dot.classList.add('completed');
    else if (i === completedSessions && currentMode === 'pomodoro') dot.classList.add('active');
  });
  sessionLabel.textContent = `Session ${Math.min(completedSessions + 1, settings.sessionsPerCycle)} of ${settings.sessionsPerCycle}`;
}

// ───── Quotes ─────
let quoteIndex = Math.floor(Math.random() * QUOTES.length);
function rotateQuote() {
  quoteIndex = (quoteIndex + 1) % QUOTES.length;
  quoteText.style.opacity = '0';
  setTimeout(() => {
    quoteText.textContent = QUOTES[quoteIndex];
    quoteText.style.opacity = '1';
  }, 300);
}
quoteText.textContent = QUOTES[quoteIndex];

// ───── Tab Management ─────
const tabBtns = $$('.tab-btn');
const tabPanels = $$('.tab-panel');

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
    tabPanels.forEach((p) => {
      p.classList.toggle('hidden', p.id !== `panel-${tab}`);
    });
    if (tab === 'stats') renderStats();
  });
});

// ───── Task / Folder Management ─────
const FOLDER_ICONS = ['📁', '💼', '🎯', '📚', '🔬', '🎨', '🏠', '⭐'];

function loadFolders() {
  try {
    const raw = localStorage.getItem('pomodoray-folders');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  // Migrate old flat tasks if they exist
  try {
    const oldTasks = localStorage.getItem('pomodoray-tasks');
    if (oldTasks) {
      const parsed = JSON.parse(oldTasks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = [{ id: Date.now(), name: 'General', icon: '📁', expanded: true, tasks: parsed }];
        localStorage.removeItem('pomodoray-tasks');
        saveFolders(migrated);
        return migrated;
      }
    }
  } catch (e) {}
  return [];
}

function saveFolders(folders) {
  localStorage.setItem('pomodoray-folders', JSON.stringify(folders));
}

let folders = loadFolders();

function addFolder(name = 'New Folder') {
  const icon = FOLDER_ICONS[folders.length % FOLDER_ICONS.length];
  folders.push({ id: Date.now(), name, icon, expanded: true, tasks: [] });
  saveFolders(folders);
  renderFolders();
}

function deleteFolder(folderId) {
  folders = folders.filter((f) => f.id !== folderId);
  saveFolders(folders);
  renderFolders();
}

function toggleFolderExpand(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) { folder.expanded = !folder.expanded; saveFolders(folders); renderFolders(); }
}

function renameFolder(folderId, name) {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) { folder.name = name.trim() || 'Untitled'; saveFolders(folders); }
}

function addTask(folderId, text) {
  const folder = folders.find((f) => f.id === folderId);
  if (folder && text.trim()) {
    folder.tasks.push({ id: Date.now(), text: text.trim(), completed: false });
    saveFolders(folders);
    renderFolders();
  }
}

function toggleTask(folderId, taskId) {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) {
    const task = folder.tasks.find((t) => t.id === taskId);
    if (task) { task.completed = !task.completed; saveFolders(folders); renderFolders(); }
  }
}

function deleteTask(folderId, taskId) {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) {
    folder.tasks = folder.tasks.filter((t) => t.id !== taskId);
    saveFolders(folders);
    renderFolders();
  }
}

function renderFolders() {
  folderListEl.innerHTML = '';
  taskEmpty.style.display = folders.length === 0 ? 'block' : 'none';

  folders.forEach((folder) => {
    const group = document.createElement('div');
    group.className = `folder-group${folder.expanded ? '' : ' collapsed'}`;

    // Header
    const header = document.createElement('div');
    header.className = 'folder-header';

    const chevron = document.createElement('div');
    chevron.className = 'folder-chevron';
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
    chevron.addEventListener('click', (e) => { e.stopPropagation(); toggleFolderExpand(folder.id); });

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.textContent = folder.icon || '📁';

    const nameInput = document.createElement('input');
    nameInput.className = 'folder-name';
    nameInput.value = folder.name;
    nameInput.readOnly = true;
    nameInput.addEventListener('dblclick', () => { nameInput.readOnly = false; nameInput.focus(); nameInput.select(); });
    nameInput.addEventListener('blur', () => { nameInput.readOnly = true; renameFolder(folder.id, nameInput.value); });
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

    const done = folder.tasks.filter((t) => t.completed).length;
    const total = folder.tasks.length;
    const count = document.createElement('span');
    count.className = 'folder-count';
    count.textContent = total > 0 ? `${done}/${total}` : '0';

    const del = document.createElement('button');
    del.className = 'folder-delete';
    del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteFolder(folder.id); });

    header.addEventListener('click', () => toggleFolderExpand(folder.id));
    header.append(chevron, icon, nameInput, count, del);

    // Body
    const body = document.createElement('div');
    body.className = 'folder-body';

    folder.tasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = `task-item${task.completed ? ' completed' : ''}`;

      const cb = document.createElement('div');
      cb.className = `task-checkbox${task.completed ? ' checked' : ''}`;
      cb.addEventListener('click', () => toggleTask(folder.id, task.id));

      const txt = document.createElement('span');
      txt.className = 'task-text';
      txt.textContent = task.text;

      const tdel = document.createElement('button');
      tdel.className = 'task-delete';
      tdel.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      tdel.addEventListener('click', () => deleteTask(folder.id, task.id));

      item.append(cb, txt, tdel);
      body.appendChild(item);
    });

    // Task input
    const input = document.createElement('input');
    input.className = 'folder-task-input';
    input.type = 'text';
    input.placeholder = '+ Add task...';
    input.maxLength = 80;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        addTask(folder.id, input.value);
        // Re-focus on new input after render
        setTimeout(() => {
          const inputs = folderListEl.querySelectorAll('.folder-task-input');
          const idx = folders.findIndex((f) => f.id === folder.id);
          if (inputs[idx]) inputs[idx].focus();
        }, 50);
      }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    body.appendChild(input);

    group.append(header, body);
    folderListEl.appendChild(group);
  });
}

addFolderBtn.addEventListener('click', () => addFolder());

// ───── Ambient Sound Engine (Web Audio API) ─────
let audioCtx = null;
const activeSounds = {};

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Create noise buffer
function createNoiseBuffer(ctx, type = 'white', duration = 4) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lastOut = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'brown') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      } else if (type === 'pink') {
        // Simplified pink noise
        lastOut = 0.99886 * lastOut + white * 0.0555179;
        data[i] = lastOut + white * 0.5362;
        data[i] *= 0.11;
      } else {
        data[i] = white;
      }
    }
  }
  return buffer;
}

function createSoundNodes(ctx, type) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  if (type === 'rain') {
    // Brown noise + bandpass for rain
    const buf = createNoiseBuffer(ctx, 'brown', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.5;
    src.connect(bp);
    bp.connect(gain);
    src.start();
    // High-frequency layer for rain drops
    const buf2 = createNoiseBuffer(ctx, 'white', 4);
    const src2 = ctx.createBufferSource();
    src2.buffer = buf2;
    src2.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    const g2 = ctx.createGain();
    g2.gain.value = 0.08;
    src2.connect(hp);
    hp.connect(g2);
    g2.connect(gain);
    src2.start();
    return { gain, sources: [src, src2] };
  }

  if (type === 'cafe') {
    // Pink noise for ambient chatter
    const buf = createNoiseBuffer(ctx, 'pink', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    src.connect(lp);
    lp.connect(gain);
    src.start();
    return { gain, sources: [src] };
  }

  if (type === 'fire') {
    // Crackle: filtered white noise with modulation
    const buf = createNoiseBuffer(ctx, 'white', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 2;
    // LFO for crackle effect
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    // Brown noise base
    const buf2 = createNoiseBuffer(ctx, 'brown', 4);
    const src2 = ctx.createBufferSource();
    src2.buffer = buf2;
    src2.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const g2 = ctx.createGain();
    g2.gain.value = 0.7;
    src2.connect(lp);
    lp.connect(g2);
    g2.connect(gain);
    src.connect(bp);
    bp.connect(gain);
    src.start();
    src2.start();
    return { gain, sources: [src, src2, lfo] };
  }

  if (type === 'wind') {
    // Modulated brown noise
    const buf = createNoiseBuffer(ctx, 'brown', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.3;
    // Slow LFO for wind gusts
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();
    src.connect(bp);
    bp.connect(gain);
    src.start();
    return { gain, sources: [src, lfo] };
  }

  if (type === 'waves') {
    // Ocean waves: brown noise with slow volume modulation
    const buf = createNoiseBuffer(ctx, 'brown', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    // LFO for wave motion
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    src.connect(lp);
    lp.connect(gain);
    src.start();
    return { gain, sources: [src, lfo] };
  }

  if (type === 'lofi') {
    // Lo-fi: filtered pink noise + low sine hum
    const buf = createNoiseBuffer(ctx, 'pink', 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    const g1 = ctx.createGain();
    g1.gain.value = 0.4;
    src.connect(lp);
    lp.connect(g1);
    g1.connect(gain);
    // Soft chord tones
    const chordFreqs = [130.81, 164.81, 196.0, 246.94]; // C3 chord
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.06;
    oscGain.connect(gain);
    const oscs = chordFreqs.map((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(oscGain);
      osc.start();
      return osc;
    });
    src.start();
    return { gain, sources: [src, ...oscs] };
  }

  // Fallback: white noise
  const buf = createNoiseBuffer(ctx, 'white', 4);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain);
  src.start();
  return { gain, sources: [src] };
}

function toggleSound(type, volume01) {
  const ctx = getAudioContext();

  if (activeSounds[type]) {
    // Stop
    const s = activeSounds[type];
    s.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => {
      s.sources.forEach((src) => {
        try { src.stop(); } catch (e) {}
        try { src.disconnect(); } catch (e) {}
      });
      s.gain.disconnect();
    }, 600);
    delete activeSounds[type];
    return false;
  } else {
    // Start
    const nodes = createSoundNodes(ctx, type);
    nodes.gain.gain.linearRampToValueAtTime(volume01, ctx.currentTime + 0.5);
    activeSounds[type] = nodes;
    return true;
  }
}

function setSoundVolume(type, volume01) {
  if (activeSounds[type]) {
    const ctx = getAudioContext();
    activeSounds[type].gain.gain.linearRampToValueAtTime(volume01, ctx.currentTime + 0.1);
  }
}

// Wire up sound cards
$$('.sound-card').forEach((card) => {
  const type = card.dataset.sound;
  const slider = card.querySelector('.sound-slider');
  const toggle = card.querySelector('.sound-toggle');

  card.addEventListener('click', (e) => {
    if (e.target === slider) return; // Don't toggle when sliding
    const vol = slider.value / 100;
    const isActive = toggleSound(type, vol);
    card.classList.toggle('active', isActive);
    toggle.textContent = isActive ? 'ON' : 'OFF';
    toggle.dataset.active = isActive;
  });

  slider.addEventListener('input', (e) => {
    e.stopPropagation();
    setSoundVolume(type, slider.value / 100);
  });
});

// ───── Notification Sound ─────
function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Pleasant two-tone chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i * 0.2);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.2 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.8);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 1);
    });
  } catch (e) {}
}

// ───── Settings ─────
function applySettings() {
  $('#focusDuration').textContent = settings.focusDuration;
  $('#shortBreakDuration').textContent = settings.shortBreakDuration;
  $('#longBreakDuration').textContent = settings.longBreakDuration;
  $('#sessionsPerCycle').textContent = settings.sessionsPerCycle;
  $('#autoStartBreak').dataset.on = settings.autoStartBreak;
  $('#autoStartFocus').dataset.on = settings.autoStartFocus;
  $('#notificationsToggle').dataset.on = settings.notifications;
  applyTheme(settings.theme);
}

// Stepper buttons
$$('.step-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    const dir = parseInt(btn.dataset.dir);
    let max, min;
    if (target === 'focusDuration') { min = 1; max = 90; }
    else if (target === 'sessionsPerCycle') { min = 1; max = 8; }
    else { min = 1; max = 30; }
    settings[target] = Math.max(min, Math.min(max, settings[target] + dir));

    saveJSON('pomodoray-settings', settings);
    applySettings();

    // If not running, update timer to new duration
    if (!isRunning) {
      const mode = MODES[currentMode]();
      timeRemaining = mode.duration;
      totalTime = mode.duration;
      updateTimerDisplay();
      updateProgress();
    }

    // Re-render session dots if count changed
    if (target === 'sessionsPerCycle') {
      if (completedSessions >= settings.sessionsPerCycle) completedSessions = 0;
      renderSessionDots();
      updateSessionDots();
    }
  });
});

// Toggle switches
$$('.toggle-switch').forEach((sw) => {
  sw.addEventListener('click', () => {
    const isOn = sw.dataset.on === 'true';
    sw.dataset.on = (!isOn).toString();

    if (sw.id === 'autoStartBreak') settings.autoStartBreak = !isOn;
    else if (sw.id === 'autoStartFocus') settings.autoStartFocus = !isOn;
    else if (sw.id === 'notificationsToggle') settings.notifications = !isOn;

    saveJSON('pomodoray-settings', settings);
  });
});

// ───── Stats ─────
function recordSession() {
  const today = new Date().toDateString();

  if (stats.lastDate !== today) {
    // New day
    if (stats.lastDate) {
      const last = new Date(stats.lastDate);
      const now = new Date();
      const diffDays = Math.floor((now - last) / 86400000);
      if (diffDays === 1) stats.streak++;
      else if (diffDays > 1) stats.streak = 1;
    } else {
      stats.streak = 1;
    }
    stats.todaySessions = 0;
    stats.todayMinutes = 0;
    stats.lastDate = today;
  }

  stats.todaySessions++;
  stats.todayMinutes += settings.focusDuration;
  stats.totalSessions++;

  // Update weekly chart
  const dayOfWeek = (new Date().getDay() + 6) % 7; // Mon=0
  stats.week[dayOfWeek] = stats.todaySessions;

  saveJSON('pomodoray-stats', stats);
  renderStats();
}

function renderStats() {
  // Check if new day
  const today = new Date().toDateString();
  if (stats.lastDate !== today && stats.lastDate !== null) {
    stats.todaySessions = 0;
    stats.todayMinutes = 0;
  }

  $('#statTodaySessions').textContent = stats.todaySessions;
  $('#statTodayMinutes').textContent = stats.todayMinutes;
  $('#statTotalSessions').textContent = stats.totalSessions;
  $('#statStreak').textContent = stats.streak;

  // Weekly chart
  const weekChart = $('#weekChart');
  weekChart.innerHTML = '';
  const maxVal = Math.max(...stats.week, 1);
  const todayIdx = (new Date().getDay() + 6) % 7;

  stats.week.forEach((val, i) => {
    const bar = document.createElement('div');
    bar.className = `week-bar${i === todayIdx ? ' today' : ''}`;
    bar.style.height = `${Math.max((val / maxVal) * 100, 5)}%`;
    weekChart.appendChild(bar);
  });
}

$('#resetStatsBtn')?.addEventListener('click', () => {
  stats = { todaySessions: 0, todayMinutes: 0, totalSessions: 0, streak: 0, lastDate: null, week: [0, 0, 0, 0, 0, 0, 0] };
  saveJSON('pomodoray-stats', stats);
  renderStats();
});

// ───── Event Listeners ─────
startBtn.addEventListener('click', () => (isRunning ? pauseTimer() : startTimer()));
resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', () => { pauseTimer(); onTimerComplete(); });

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (isRunning) pauseTimer();
    switchMode(btn.dataset.mode);
  });
});

pinBtn.addEventListener('click', () => {
  isPinned = !isPinned;
  pinBtn.classList.toggle('active', isPinned);
  window.electronAPI?.setAlwaysOnTop(isPinned);
});

minimizeBtn.addEventListener('click', () => window.electronAPI?.minimize());
closeBtn.addEventListener('click', () => window.electronAPI?.close());

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.code === 'Space') { e.preventDefault(); isRunning ? pauseTimer() : startTimer(); }
  else if (e.code === 'KeyR') resetTimer();
  else if (e.code === 'KeyS') { pauseTimer(); onTimerComplete(); }
  else if (e.ctrlKey && e.code === 'KeyT') {
    isPinned = !isPinned;
    pinBtn.classList.toggle('active', isPinned);
    window.electronAPI?.setAlwaysOnTop(isPinned);
  }
});

window.addEventListener('resize', updateModeIndicator);

// Notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// ───── Theme Picker ─────
const THEME_NAMES = { default: 'Default', noir: 'Noir', retro: 'Retro', sakura: 'Sakura', lavender: 'Lavender' };

function applyTheme(themeId) {
  if (themeId === 'default') {
    document.body.removeAttribute('data-theme');
  } else {
    document.body.setAttribute('data-theme', themeId);
  }

  // Update picker active state
  $$('.theme-option').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.themeId === themeId);
  });
  const nameEl = $('#themeName');
  if (nameEl) nameEl.textContent = THEME_NAMES[themeId] || themeId;
}

$$('.theme-option').forEach((opt) => {
  opt.addEventListener('click', () => {
    settings.theme = opt.dataset.themeId;
    saveJSON('pomodoray-settings', settings);
    applyTheme(settings.theme);
  });
});

// ───── Helpers ─────
function loadJSON(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return Array.isArray(fallback) ? [...fallback] : { ...fallback };
    const parsed = JSON.parse(data);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : [...fallback];
    return { ...fallback, ...parsed };
  } catch { return Array.isArray(fallback) ? [...fallback] : { ...fallback }; }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ───── Init ─────
function init() {
  updateTimerDisplay();
  updateProgress();
  applySettings();
  renderSessionDots();
  updateSessionDots();
  renderFolders();
  renderStats();
  setTimeout(updateModeIndicator, 50);
}

init();
