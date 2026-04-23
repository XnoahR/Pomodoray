import { Storage } from '../core/Storage.js';
import { eventBus } from '../core/EventBus.js';

export class TaskModel {
  constructor() {
    this.folders = this.loadFolders();
  }

  loadFolders() {
    return Storage.load('pomodoray-folders', []);
  }

  save() {
    Storage.save('pomodoray-folders', this.folders);
    eventBus.emit('TASKS_UPDATED', this.folders);
  }

  addFolder() {
    const FOLDER_ICONS = ['📁', '💼', '🎯', '📚', '🔬', '🎨', '🏠', '⭐'];
    const newFolder = {
      id: Date.now(),
      name: 'New Folder',
      icon: FOLDER_ICONS[Math.floor(Math.random() * FOLDER_ICONS.length)],
      expanded: true,
      tasks: []
    };
    this.folders.unshift(newFolder);
    this.save();
    return newFolder;
  }

  deleteFolder(id) {
    this.folders = this.folders.filter(f => f.id !== id);
    this.save();
  }

  renameFolder(id, newName) {
    const f = this.folders.find(x => x.id === id);
    if (f) {
      f.name = newName.trim() || 'Untitled';
      this.save();
    }
  }

  toggleFolderExpand(id) {
    const f = this.folders.find(x => x.id === id);
    if (f) {
      f.expanded = !f.expanded;
      this.save();
    }
  }

  addTask(folderId, text) {
    const f = this.folders.find(x => x.id === folderId);
    if (f && text.trim()) {
      f.tasks.push({ id: Date.now(), text: text.trim(), completed: false });
      this.save();
    }
  }

  toggleTask(folderId, taskId) {
    const f = this.folders.find(x => x.id === folderId);
    if (f) {
      const t = f.tasks.find(x => x.id === taskId);
      if (t) {
        t.completed = !t.completed;
        this.save();
      }
    }
  }

  deleteTask(folderId, taskId) {
    const f = this.folders.find(x => x.id === folderId);
    if (f) {
      f.tasks = f.tasks.filter(t => t.id !== taskId);
      this.save();
    }
  }
}
