import { Storage } from '../core/Storage.js';
import { eventBus } from '../core/EventBus.js';

export class Settings {
  constructor() {
    this.DEFAULT_DURATIONS = { pomodoro: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
    this.settings = Storage.load('pomodoray-settings', {
      pomodoroTheme: 'default',
      sessionsPerCycle: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      notificationsEnabled: true
    });
    
    // Merge defaults
    this.durations = { ...this.DEFAULT_DURATIONS, ...Storage.load('pomodoray-durations', {}) };
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    Storage.save('pomodoray-settings', this.settings);
    eventBus.emit('SETTINGS_CHANGED', { key, value });
  }
  
  getDuration(mode) {
    return this.durations[mode];
  }
  
  setDuration(mode, minutes) {
    this.durations[mode] = parseInt(minutes, 10) * 60;
    Storage.save('pomodoray-durations', this.durations);
    eventBus.emit('DURATION_CHANGED', { mode, seconds: this.durations[mode] });
  }

  getTheme() {
    return this.settings.pomodoroTheme || 'default';
  }
}
