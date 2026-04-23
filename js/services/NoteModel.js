import { eventBus } from '../core/EventBus.js';

/**
 * NoteModel — Manages notes as real .md files on disk via Electron IPC.
 * Each note is a .md file in the userData/notes directory.
 */
export class NoteModel {
  constructor() {
    this.notes = [];          // { filename, name, modifiedAt, size }
    this.currentFile = null;  // currently open filename
    this.currentContent = ''; // content of the open file
    this._saveTimer = null;
  }

  /**
   * Load the file listing from disk.
   */
  async loadList() {
    try {
      this.notes = await window.electronAPI.notes.list();
    } catch (e) {
      console.error('Failed to list notes:', e);
      this.notes = [];
    }
    eventBus.emit('NOTES_UPDATED');
  }

  /**
   * Create a new .md file with a timestamped name.
   */
  async createNote() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `untitled-${timestamp}.md`;
    await window.electronAPI.notes.write(filename, '');
    await this.loadList();
    return filename;
  }

  /**
   * Open a note file for editing.
   */
  async openNote(filename) {
    const content = await window.electronAPI.notes.read(filename);
    if (content === null) return false;
    this.currentFile = filename;
    this.currentContent = content;
    return true;
  }

  /**
   * Save current note content (debounced by the UI).
   */
  async saveContent(content) {
    if (!this.currentFile) return;
    this.currentContent = content;
    await window.electronAPI.notes.write(this.currentFile, content);
  }

  /**
   * Rename the current note file.
   */
  async renameNote(newName) {
    if (!this.currentFile) return false;
    // Sanitize filename
    const safeName = newName.replace(/[<>:"/\\|?*]/g, '').trim();
    if (!safeName) return false;
    const newFilename = safeName.endsWith('.md') ? safeName : `${safeName}.md`;
    if (newFilename === this.currentFile) return true;

    const success = await window.electronAPI.notes.rename(this.currentFile, newFilename);
    if (success) {
      this.currentFile = newFilename;
      await this.loadList();
    }
    return success;
  }

  /**
   * Delete the specified note.
   */
  async deleteNote(filename) {
    await window.electronAPI.notes.delete(filename);
    if (this.currentFile === filename) {
      this.currentFile = null;
      this.currentContent = '';
    }
    await this.loadList();
  }

  /**
   * Get the notes directory path for display.
   */
  async getNotesDir() {
    return await window.electronAPI.notes.getDir();
  }
}
