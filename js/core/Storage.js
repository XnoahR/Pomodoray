export class Storage {
  static load(key, fallback = null) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn(`Failed to parse storage key ${key}`);
    }
    return fallback;
  }

  static save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Failed to save storage key ${key}`);
    }
  }
}
