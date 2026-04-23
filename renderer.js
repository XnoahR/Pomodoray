import { eventBus } from './js/core/EventBus.js';
import { Settings } from './js/services/Settings.js';
import { TaskModel } from './js/services/TaskModel.js';
import { NoteModel } from './js/services/NoteModel.js';
import { TimerEngine } from './js/services/TimerEngine.js';
import { LiveEditor } from './js/editor/LiveEditor.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

class PomodorayApp {
  constructor() {
    this.settings = new Settings();
    this.tasks = new TaskModel();
    this.notes = new NoteModel();
    this.timer = new TimerEngine(this.settings);

    this.applyTheme(this.settings.getTheme());
    this.initDOM();
    this.bindSidebar();
    this.bindTabs();
    this.bindWindowControls();
    this.bindTimerUI();
    this.bindTasksUI();
    this.bindNotesUI();
    this.bindSettingsUI();
    this.bindKeyboardShortcuts();

    // EventBus
    eventBus.on('TIMER_TICK', (d) => this.updateTimerDisplay(d));
    eventBus.on('MODE_CHANGED', (m) => this.switchModeUI(m));
    eventBus.on('TIMER_STARTED', () => this.toggleStartBtnUI(true));
    eventBus.on('TIMER_PAUSED', () => this.toggleStartBtnUI(false));
    eventBus.on('SESSION_COMPLETED', (d) => {
      this.updateSessionDotsUI(d.completed);
      this.rotateQuote();
      this.renderStatsUI();
    });
    eventBus.on('TASKS_UPDATED', () => this.renderTasksUI());
    eventBus.on('NOTES_UPDATED', () => this.renderNotesListUI());
    eventBus.on('SETTINGS_CHANGED', (e) => {
      if (e.key === 'pomodoroTheme') this.applyTheme(e.value);
    });
    eventBus.on('DURATION_CHANGED', () => {
      if (!this.timer.isRunning) {
        this.timer.timeRemaining = this.settings.getDuration(this.timer.currentMode);
        eventBus.emit('TIMER_TICK', {
          remaining: this.timer.timeRemaining,
          total: this.settings.getDuration(this.timer.currentMode)
        });
      }
    });

    // Initial renders
    this.timer.reset();
    this.renderTasksUI();
    this.notes.loadList();
    this.renderStatsUI();
    this.updateSessionDotsUI(0);
    this.rotateQuote();
    setTimeout(() => this.switchModeUI('pomodoro'), 50);
  }

  initDOM() {
    this.dom = {
      workspaceTabs: $$('.workspace-tab'),
      workspaces: $$('#workspacesContainer > div'),
      tabBtns: $$('.tab-btn'),
      tabPanels: $$('.tab-panel'),
      timerText: $('#timerText'),
      timerLabel: $('#timerLabel'),
      timerProgress: $('#timerProgress'),
      startBtn: $('#startBtn'),
      skipBtn: $('#skipBtn'),
      resetBtn: $('#resetBtn'),
      modeButtons: $$('.mode-btn'),
      modeIndicator: $('#modeIndicator'),
      sessionDotsContainer: $('#sessionDots'),
      sessionLabel: $('#sessionLabel'),
      quoteText: $('#quoteText'),
      folderListEl: $('#folderList'),
      addFolderBtn: $('#addFolderBtn'),
      taskEmpty: $('#taskEmpty'),
      notesListView: $('#notesListView'),
      notesEditView: $('#notesEditView'),
      notesListEl: $('#notesList'),
      notesEmpty: $('#notesEmpty'),
      addNoteBtn: $('#addNoteBtn'),
      notesBackBtn: $('#notesBackBtn'),
      noteTitleInput: $('#noteTitleInput'),
      toggleNotePreviewBtn: $('#toggleNotePreviewBtn'),
      deleteNoteBtn: $('#deleteNoteBtn'),
      editorContainer: $('#editorContainer'),
      noteStatus: $('#noteStatus'),
      noteWordCount: $('#noteWordCount'),
      noteFilename: $('#noteFilename'),
    };

    this.CIRCUMFERENCE = 2 * Math.PI * 108;
    this.dom.timerProgress.style.strokeDasharray = this.CIRCUMFERENCE;

    // Create LiveEditor instance
    this._saveTimer = null;
    this.liveEditor = new LiveEditor(this.dom.editorContainer, {
      onChange: (md) => {
        // Debounced auto-save
        clearTimeout(this._saveTimer);
        this.dom.noteStatus.textContent = 'Saving...';
        this.updateNoteStats();
        this._saveTimer = setTimeout(async () => {
          await this.notes.saveContent(md);
          this.dom.noteStatus.textContent = 'Saved';
        }, 500);
      },
      onSave: async (md) => {
        await this.notes.saveContent(md);
        this.dom.noteStatus.textContent = 'Saved ✓';
      }
    });

    // Connect toolbar buttons to LiveEditor
    $$('.md-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.liveEditor.insertFormatting(btn.dataset.md);
      });
    });
  }

  // ─── Sidebar ───
  bindSidebar() {
    this.dom.workspaceTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const wid = btn.dataset.workspace;
        this.dom.workspaceTabs.forEach(b => b.classList.toggle('active', b === btn));
        this.dom.workspaces.forEach(w => {
          if (w.id === `workspace-${wid}`) {
            w.classList.remove('hidden');
            w.style.display = 'flex';
          } else {
            w.classList.add('hidden');
            w.style.display = 'none';
          }
        });
      });
    });
  }

  // ─── Tabs ───
  bindTabs() {
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.dom.tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        this.dom.tabPanels.forEach(p => {
          p.id === `panel-${tab}` ? p.classList.remove('hidden') : p.classList.add('hidden');
        });
        if (tab === 'stats') this.renderStatsUI();
      });
    });
  }

  // ─── Window Controls ───
  bindWindowControls() {
    let isPinned = false;
    $('#pinBtn').addEventListener('click', () => {
      isPinned = !isPinned;
      $('#pinBtn').classList.toggle('active', isPinned);
      window.electronAPI?.setAlwaysOnTop(isPinned);
    });
    $('#minimizeBtn').addEventListener('click', () => window.electronAPI?.minimize());
    $('#closeBtn').addEventListener('click', () => window.electronAPI?.close());
  }

  // ─── Keyboard Shortcuts ───
  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const isEditor = document.activeElement?.closest('.live-editor');

      if (isEditor && e.ctrlKey) {
        if (e.key === 'b') { e.preventDefault(); this.liveEditor.insertFormatting('bold'); }
        else if (e.key === 'i') { e.preventDefault(); this.liveEditor.insertFormatting('italic'); }
        else if (e.key === 'h') { e.preventDefault(); this.liveEditor.insertFormatting('heading'); }
        return;
      }

      if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditor) return;
      if (e.code === 'Space') { e.preventDefault(); this.timer.toggle(); }
      else if (e.code === 'KeyR') this.timer.reset();
      else if (e.code === 'KeyS') this.timer.skip();
    });
  }

  // ─── Timer UI ───
  bindTimerUI() {
    this.dom.startBtn.addEventListener('click', () => this.timer.toggle());
    this.dom.resetBtn.addEventListener('click', () => this.timer.reset());
    this.dom.skipBtn.addEventListener('click', () => this.timer.skip());
    this.dom.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.timer.isRunning) return;
        this.timer.setMode(btn.dataset.mode);
      });
    });
  }

  switchModeUI(mode) {
    this.dom.modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const active = Array.from(this.dom.modeButtons).find(b => b.dataset.mode === mode);
    if (active) {
      this.dom.modeIndicator.style.width = active.offsetWidth + 'px';
      this.dom.modeIndicator.style.left = active.offsetLeft + 'px';
    }
    const labels = { pomodoro: 'FOCUS TIME', shortBreak: 'SHORT BREAK', longBreak: 'LONG BREAK' };
    this.dom.timerLabel.textContent = labels[mode] || mode;
  }

  updateTimerDisplay({ remaining, total }) {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    this.dom.timerText.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    document.title = this.timer.isRunning ? `${this.dom.timerText.textContent} — Pomodoray` : 'Pomodoray';
    const pct = remaining / total;
    this.dom.timerProgress.style.strokeDashoffset = this.CIRCUMFERENCE - this.CIRCUMFERENCE * pct;
  }

  toggleStartBtnUI(isRunning) {
    const play = this.dom.startBtn.querySelector('.play-icon');
    const pause = this.dom.startBtn.querySelector('.pause-icon');
    if (isRunning) { play.classList.add('hidden'); pause.classList.remove('hidden'); }
    else { play.classList.remove('hidden'); pause.classList.add('hidden'); }
  }

  updateSessionDotsUI(completed) {
    const perCycle = this.settings.get('sessionsPerCycle') || 4;
    this.dom.sessionDotsContainer.innerHTML = '';
    for (let i = 0; i < perCycle; i++) {
      const dot = document.createElement('div');
      dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${i < completed ? 'bg-white opacity-90 scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'bg-white/20'}`;
      this.dom.sessionDotsContainer.appendChild(dot);
    }
    this.dom.sessionLabel.textContent = `Session ${completed} of ${perCycle}`;
  }

  rotateQuote() {
    const quotes = [
      "The secret of getting ahead is getting started.",
      "Focus on being productive instead of busy.",
      "Done is better than perfect.",
      "Small disciplines repeated with consistency everyday lead to great achievements.",
      "Until we can manage time, we can manage nothing else.",
      "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",
      "Focus is a matter of deciding what things you're not going to do.",
      "There is no substitute for hard work.",
      "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
      "Action is the foundational key to all success."
    ];
    this.dom.quoteText.style.opacity = '0';
    setTimeout(() => {
      this.dom.quoteText.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
      this.dom.quoteText.style.opacity = '1';
    }, 500);
  }

  applyTheme(themeName) {
    document.body.removeAttribute('data-theme');
    if (themeName && themeName !== 'default') document.body.setAttribute('data-theme', themeName);
  }

  // ─── Tasks UI ───
  bindTasksUI() {
    this.dom.addFolderBtn.addEventListener('click', () => this.tasks.addFolder());
  }

  renderTasksUI() {
    const folders = this.tasks.folders;
    this.dom.folderListEl.innerHTML = '';
    this.dom.taskEmpty.style.display = folders.length === 0 ? 'block' : 'none';

    folders.forEach(folder => {
      const group = document.createElement('div');
      group.className = `folder-group${folder.expanded ? '' : ' collapsed'}`;

      const header = document.createElement('div');
      header.className = 'folder-header';
      header.addEventListener('click', () => this.tasks.toggleFolderExpand(folder.id));

      const chevron = document.createElement('div');
      chevron.className = 'folder-chevron';
      chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = folder.icon || '📁';

      const nameInput = document.createElement('input');
      nameInput.className = 'folder-name';
      nameInput.value = folder.name;
      nameInput.readOnly = true;
      nameInput.addEventListener('click', (e) => e.stopPropagation());
      nameInput.addEventListener('dblclick', (e) => { e.stopPropagation(); nameInput.readOnly = false; nameInput.focus(); nameInput.select(); });
      nameInput.addEventListener('blur', () => { nameInput.readOnly = true; this.tasks.renameFolder(folder.id, nameInput.value); });
      nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });

      const done = folder.tasks.filter(t => t.completed).length;
      const total = folder.tasks.length;
      const count = document.createElement('span');
      count.className = 'folder-count';
      count.textContent = total > 0 ? `${done}/${total}` : '0';

      const del = document.createElement('button');
      del.className = 'folder-delete';
      del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      del.addEventListener('click', (e) => { e.stopPropagation(); this.tasks.deleteFolder(folder.id); });

      header.append(chevron, icon, nameInput, count, del);

      const body = document.createElement('div');
      body.className = 'folder-body';

      folder.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item${task.completed ? ' completed' : ''}`;

        const cb = document.createElement('div');
        cb.className = `task-checkbox${task.completed ? ' checked' : ''}`;
        cb.addEventListener('click', () => this.tasks.toggleTask(folder.id, task.id));

        const txt = document.createElement('span');
        txt.className = 'task-text';
        txt.textContent = task.text;

        const tdel = document.createElement('button');
        tdel.className = 'task-delete';
        tdel.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        tdel.addEventListener('click', () => this.tasks.deleteTask(folder.id, task.id));

        item.append(cb, txt, tdel);
        body.appendChild(item);
      });

      const input = document.createElement('input');
      input.className = 'folder-task-input';
      input.type = 'text';
      input.placeholder = '+ Add task...';
      input.maxLength = 80;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) this.tasks.addTask(folder.id, input.value);
      });
      input.addEventListener('click', (e) => e.stopPropagation());

      body.appendChild(input);
      group.append(header, body);
      this.dom.folderListEl.appendChild(group);
    });
  }

  // ─── Notes UI ───
  bindNotesUI() {
    this.dom.addNoteBtn.addEventListener('click', async () => {
      const filename = await this.notes.createNote();
      await this.openNoteEditorUI(filename);
    });

    this.dom.notesBackBtn.addEventListener('click', async () => {
      await this.closeNoteEditor();
    });

    this.dom.deleteNoteBtn.addEventListener('click', async () => {
      if (!this.notes.currentFile) return;
      if (confirm('Delete this note?')) {
        await this.notes.deleteNote(this.notes.currentFile);
        this.showNotesList();
      }
    });

    // Title rename (debounced)
    let titleTimer = null;
    this.dom.noteTitleInput.addEventListener('input', () => {
      clearTimeout(titleTimer);
      this.dom.noteStatus.textContent = 'Renaming...';
      titleTimer = setTimeout(async () => {
        const newName = this.dom.noteTitleInput.value.trim();
        if (newName) {
          await this.notes.renameNote(newName);
          this.dom.noteFilename.textContent = this.notes.currentFile;
        }
        this.dom.noteStatus.textContent = 'Saved';
      }, 600);
    });

    // Mode toggle (Edit ↔ Read)
    this.dom.toggleNotePreviewBtn.addEventListener('click', () => {
      const mode = this.liveEditor.toggleMode();
      this.dom.toggleNotePreviewBtn.classList.toggle('active', mode === 'read');
      // Show/hide toolbar in read mode
      const toolbar = $('#mdToolbar');
      if (toolbar) toolbar.style.display = mode === 'read' ? 'none' : '';
      // Update mode label
      this.dom.noteStatus.textContent = mode === 'read' ? 'Reading' : 'Editing';
    });
  }

  renderNotesListUI() {
    const notes = this.notes.notes;
    this.dom.notesListEl.innerHTML = '';
    this.dom.notesEmpty.classList.toggle('hidden', notes.length > 0);

    notes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item';
      item.onclick = () => this.openNoteEditorUI(note.filename);

      const title = document.createElement('div');
      title.className = 'note-title';
      title.textContent = note.name || 'Untitled';

      const meta = document.createElement('div');
      meta.className = 'note-meta';
      const date = new Date(note.modifiedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      meta.textContent = `${date}  •  ${(note.size / 1024).toFixed(1)} KB`;

      item.append(title, meta);
      this.dom.notesListEl.appendChild(item);
    });
  }

  async openNoteEditorUI(filename) {
    const ok = await this.notes.openNote(filename);
    if (!ok) return;

    this.dom.noteTitleInput.value = filename.replace(/\.md$/, '');
    this.dom.noteFilename.textContent = filename;
    this.liveEditor.setValue(this.notes.currentContent);
    this.updateNoteStats();

    // Reset preview mode
    this._previewMode = false;
    this.dom.toggleNotePreviewBtn.classList.remove('active');

    // Show editor
    this.dom.notesListView.classList.add('hidden');
    this.dom.notesEditView.classList.remove('hidden');
    this.dom.notesEditView.style.display = 'flex';

    // Reset to edit mode
    this.liveEditor.setMode('edit');
    this.dom.toggleNotePreviewBtn.classList.remove('active');
    const toolbar = $('#mdToolbar');
    if (toolbar) toolbar.style.display = '';

    this.dom.noteStatus.textContent = 'Editing';
    this.liveEditor.focus();
  }

  async closeNoteEditor() {
    if (this.notes.currentFile) {
      await this.notes.saveContent(this.liveEditor.getValue());
    }
    this.notes.currentFile = null;
    this.showNotesList();
    await this.notes.loadList();
  }

  showNotesList() {
    this.dom.notesEditView.classList.add('hidden');
    this.dom.notesEditView.style.display = 'none';
    this.dom.notesListView.classList.remove('hidden');
  }

  updateNoteStats() {
    const { words, chars } = this.liveEditor.getWordCount();
    this.dom.noteWordCount.textContent = `${words} word${words !== 1 ? 's' : ''} · ${chars} chars`;
  }

  // ─── Settings UI ───
  bindSettingsUI() {
    const modeMap = { focusDuration: 'pomodoro', shortBreakDuration: 'shortBreak', longBreakDuration: 'longBreak' };
    $$('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = btn.dataset.target, dir = parseInt(btn.dataset.dir);
        const el = $(`#${tid}`);
        if (!el) return;
        if (tid === 'sessionsPerCycle') {
          let v = Math.max(1, Math.min(8, parseInt(el.textContent) + dir));
          el.textContent = v;
          this.settings.set('sessionsPerCycle', v);
          this.updateSessionDotsUI(this.timer.completedSessions);
        } else {
          const mode = modeMap[tid]; if (!mode) return;
          let v = Math.max(1, Math.min(90, parseInt(el.textContent) + dir));
          el.textContent = v;
          this.settings.setDuration(mode, v);
        }
      });
    });

    const f = $('#focusDuration'), s = $('#shortBreakDuration'), l = $('#longBreakDuration'), c = $('#sessionsPerCycle');
    if (f) f.textContent = this.settings.getDuration('pomodoro') / 60;
    if (s) s.textContent = this.settings.getDuration('shortBreak') / 60;
    if (l) l.textContent = this.settings.getDuration('longBreak') / 60;
    if (c) c.textContent = this.settings.get('sessionsPerCycle');

    const handleToggle = (id, key) => {
      const tg = $(id); if (!tg) return;
      if (this.settings.get(key)) { tg.dataset.on = 'true'; tg.classList.add('active'); }
      tg.addEventListener('click', () => {
        const val = !this.settings.get(key);
        this.settings.set(key, val);
        tg.dataset.on = String(val);
        tg.classList.toggle('active', val);
      });
    };
    handleToggle('#autoStartBreak', 'autoStartBreaks');
    handleToggle('#autoStartFocus', 'autoStartFocus');
    handleToggle('#notificationsToggle', 'notificationsEnabled');

    $$('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        this.settings.set('pomodoroTheme', card.dataset.themeId);
        $$('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
      if (card.dataset.themeId === this.settings.getTheme()) card.classList.add('active');
    });
  }

  // ─── Stats UI ───
  renderStatsUI() {
    const stats = this.timer.stats;
    const el = (id) => $(id);
    const e1 = el('#statTodaySessions'), e2 = el('#statTodayMinutes'), e3 = el('#statTotalSessions'), e4 = el('#statStreak');
    if (e1) e1.textContent = stats.sessionsToday || 0;
    if (e2) e2.textContent = stats.minutesToday || 0;
    if (e3) e3.textContent = stats.totalSessions || 0;
    if (e4) e4.textContent = stats.currentStreak || 0;

    const chart = el('#weekChart');
    if (chart) {
      chart.innerHTML = '';
      const max = Math.max(...(stats.weekly || []), 4);
      const today = (new Date().getDay() + 6) % 7;
      (stats.weekly || [0,0,0,0,0,0,0]).forEach((val, i) => {
        const pct = Math.max(3, (val / max) * 100);
        const bar = document.createElement('div');
        bar.className = 'flex-1'; bar.style.cssText = 'height:100%;display:flex;align-items:flex-end';
        const inner = document.createElement('div');
        inner.style.cssText = `width:100%;height:${pct}%;border-radius:4px;transition:height 0.5s ease;background:${i === today ? 'var(--accent,#ff6b6b)' : 'rgba(255,255,255,0.15)'}`;
        if (i === today) inner.style.boxShadow = '0 0 8px var(--accent,#ff6b6b)';
        bar.appendChild(inner); chart.appendChild(bar);
      });
    }

    const resetBtn = el('#resetStatsBtn');
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all statistics?')) {
          this.timer.stats = { lastDate: new Date().toDateString(), sessionsToday: 0, minutesToday: 0, totalSessions: 0, currentStreak: 0, weekly: [0,0,0,0,0,0,0] };
          localStorage.setItem('pomodoray-stats', JSON.stringify(this.timer.stats));
          this.renderStatsUI();
        }
      });
    }
  }
}

try {
  new PomodorayApp();
} catch (err) {
  console.error('PomodorayApp init failed:', err);
}
