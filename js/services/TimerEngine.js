import { eventBus } from '../core/EventBus.js';
import { Storage } from '../core/Storage.js';

const DEFAULT_STATS = {
  lastDate: new Date().toDateString(),
  sessionsToday: 0,
  minutesToday: 0,
  totalSessions: 0,
  currentStreak: 0,
  weekly: [0, 0, 0, 0, 0, 0, 0]
};

export class TimerEngine {
  constructor(settingsService) {
    this.settings = settingsService;
    this.timer = null;
    this.isRunning = false;
    this.currentMode = 'pomodoro';
    this.timeRemaining = this.settings.getDuration('pomodoro');
    this.completedSessions = 0;

    // Load and MERGE stats with defaults so missing fields never cause NaN
    const loaded = Storage.load('pomodoray-stats', {});
    this.stats = { ...DEFAULT_STATS, ...loaded };
    // Ensure weekly is always a valid 7-element array
    if (!Array.isArray(this.stats.weekly) || this.stats.weekly.length !== 7) {
      this.stats.weekly = [0, 0, 0, 0, 0, 0, 0];
    }
    // Sanitize: replace any NaN/undefined with 0
    for (const key of ['sessionsToday', 'minutesToday', 'totalSessions', 'currentStreak']) {
      if (typeof this.stats[key] !== 'number' || isNaN(this.stats[key])) {
        this.stats[key] = 0;
      }
    }
    this.stats.weekly = this.stats.weekly.map(v => (typeof v === 'number' && !isNaN(v)) ? v : 0);

    this.checkNewDay();
  }

  checkNewDay() {
    const today = new Date().toDateString();
    if (this.stats.lastDate !== today) {
      if (Date.now() - new Date(this.stats.lastDate).getTime() > 86400000 * 2) {
        this.stats.currentStreak = 0;
      }
      this.stats.sessionsToday = 0;
      this.stats.minutesToday = 0;
      this.stats.lastDate = today;
      Storage.save('pomodoray-stats', this.stats);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => this.tick(), 1000);
    eventBus.emit('TIMER_STARTED');
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timer);
    this.timer = null;
    eventBus.emit('TIMER_PAUSED');
  }

  toggle() {
    this.isRunning ? this.pause() : this.start();
  }

  reset() {
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.isRunning = false;
      clearInterval(this.timer);
      this.timer = null;
    }
    this.timeRemaining = this.settings.getDuration(this.currentMode);
    eventBus.emit('TIMER_TICK', { remaining: this.timeRemaining, total: this.settings.getDuration(this.currentMode) });
    if (wasRunning) {
      eventBus.emit('TIMER_PAUSED');
    }
  }

  skip() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.timer);
      this.timer = null;
      eventBus.emit('TIMER_PAUSED');
    }
    this.completeSession();
  }

  setMode(mode) {
    this.currentMode = mode;
    this.timeRemaining = this.settings.getDuration(mode);
    eventBus.emit('TIMER_TICK', { remaining: this.timeRemaining, total: this.settings.getDuration(mode) });
    eventBus.emit('MODE_CHANGED', mode);
  }

  tick() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      eventBus.emit('TIMER_TICK', { remaining: this.timeRemaining, total: this.settings.getDuration(this.currentMode) });
    } else {
      this.isRunning = false;
      clearInterval(this.timer);
      this.timer = null;
      eventBus.emit('TIMER_PAUSED');
      this.completeSession();
    }
  }

  completeSession() {
    let nextMode = 'pomodoro';
    let autoStart = false;

    if (this.currentMode === 'pomodoro') {
      this.completedSessions++;

      this.checkNewDay();
      this.stats.sessionsToday = (this.stats.sessionsToday || 0) + 1;
      this.stats.totalSessions = (this.stats.totalSessions || 0) + 1;
      this.stats.minutesToday = (this.stats.minutesToday || 0) + Math.floor(this.settings.getDuration('pomodoro') / 60);
      if (this.stats.sessionsToday === 1) {
        this.stats.currentStreak = (this.stats.currentStreak || 0) + 1;
      }

      const dayIdx = (new Date().getDay() + 6) % 7;
      if (!Array.isArray(this.stats.weekly)) this.stats.weekly = [0, 0, 0, 0, 0, 0, 0];
      this.stats.weekly[dayIdx] = (this.stats.weekly[dayIdx] || 0) + 1;

      Storage.save('pomodoray-stats', this.stats);
      eventBus.emit('STATS_UPDATED', this.stats);

      const perCycle = this.settings.get('sessionsPerCycle') || 4;
      if (this.completedSessions >= perCycle) {
        nextMode = 'longBreak';
        this.completedSessions = 0;
      } else {
        nextMode = 'shortBreak';
      }
      autoStart = this.settings.get('autoStartBreaks');
      this.notify('Focus Complete', 'Time for a break!');
    } else {
      nextMode = 'pomodoro';
      autoStart = this.settings.get('autoStartFocus');
      this.notify('Break Complete', 'Time to focus!');
    }

    eventBus.emit('SESSION_COMPLETED', { completed: this.completedSessions, mode: this.currentMode });
    this.setMode(nextMode);

    if (autoStart) {
      setTimeout(() => this.start(), 1000);
    }
  }

  notify(title, body) {
    try {
      if (this.settings.get('notificationsEnabled') && Notification.permission === 'granted') {
        new Notification(title, { body, silent: true });
      }
    } catch (e) {
      // Notification may not be available
    }
  }
}
