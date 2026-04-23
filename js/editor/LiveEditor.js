/**
 * LiveEditor — Obsidian-style live markdown editor with Edit/Read modes.
 *
 * EDIT MODE: contenteditable, active line shows raw markdown, others rendered.
 * READ MODE: fully rendered, non-editable, interactive checkboxes.
 */
export class LiveEditor {
  constructor(container, { onChange = () => {}, onSave = () => {} } = {}) {
    this.container = container;
    this.onChange = onChange;
    this.onSave = onSave;
    this._lines = [''];
    this._active = 0;
    this._mode = 'edit'; // 'edit' or 'read'

    this.el = document.createElement('div');
    this.el.className = 'live-editor';
    this.el.contentEditable = 'true';
    this.el.spellcheck = true;
    this.el.dataset.placeholder = 'Start writing markdown...';
    container.innerHTML = '';
    container.appendChild(this.el);

    this._bindEvents();
    this._fullRender();
  }

  // ═══ Public API ═══

  getValue() {
    this._sync();
    return this._lines.join('\n');
  }

  setValue(md) {
    this._lines = (md || '').split('\n');
    if (!this._lines.length) this._lines = [''];
    this._active = 0;
    if (this._mode === 'edit') {
      this._fullRender();
    } else {
      this._renderReadMode();
    }
  }

  focus() {
    if (this._mode !== 'edit') return;
    this.el.focus();
    this._placeCursor(this._active, this._lines[this._active]?.length || 0);
  }

  getWordCount() {
    const text = this.getValue().trim();
    if (!text) return { words: 0, chars: 0 };
    return { words: text.split(/\s+/).length, chars: text.length };
  }

  getMode() { return this._mode; }

  setMode(mode) {
    if (mode === this._mode) return;
    if (mode === 'read') {
      this._sync();
      this._mode = 'read';
      this.el.contentEditable = 'false';
      this.el.classList.add('read-mode');
      this.el.classList.remove('edit-mode');
      this._renderReadMode();
    } else {
      this._mode = 'edit';
      this.el.contentEditable = 'true';
      this.el.classList.remove('read-mode');
      this.el.classList.add('edit-mode');
      this._active = 0;
      this._fullRender();
      this.focus();
    }
  }

  toggleMode() {
    this.setMode(this._mode === 'edit' ? 'read' : 'edit');
    return this._mode;
  }

  // ═══ Data ═══

  _sync() {
    if (this._mode !== 'edit') return;
    const el = this.el.children[this._active];
    if (el && el.classList.contains('active')) {
      this._lines[this._active] = el.textContent || '';
    }
  }

  // ═══ Read Mode Rendering ═══

  _renderReadMode() {
    this.el.innerHTML = '';
    let inCode = false;
    this._lines.forEach((line, i) => {
      if (line.trim().startsWith('```')) inCode = !inCode;

      const div = document.createElement('div');
      div.className = 'ed-line rendered';

      if (line.trim().startsWith('```')) {
        div.classList.add('fence');
        const lang = line.trim().substring(3).trim();
        div.innerHTML = `<span class="md-fence">\`\`\`${lang ? '<span class="md-fence-lang">' + lang + '</span>' : ''}</span>`;
      } else if (inCode) {
        div.classList.add('code-line');
        div.textContent = line || '\u00A0';
      } else if (line === '') {
        div.innerHTML = '<br>';
      } else {
        // Render with interactive checkboxes
        div.innerHTML = this._renderLineRead(line, i);
      }

      this.el.appendChild(div);
    });
  }

  _renderLineRead(text, lineIdx) {
    if (!text.trim()) return '<br>';

    // Heading
    const hm = text.match(/^(#{1,6})\s+(.*)/);
    if (hm) {
      return `<span class="md-h md-h${hm[1].length}">${this._inline(hm[2])}</span>`;
    }

    // HR
    if (/^-{3,}$/.test(text.trim())) {
      return '<span class="md-hr"></span>';
    }

    // Interactive checkbox (clickable in read mode)
    if (/^- \[x\] /i.test(text)) {
      return `<span class="md-cb-interactive done" data-line="${lineIdx}">☑</span><span class="md-cb-t done">${this._inline(text.substring(6))}</span>`;
    }
    if (/^- \[ \] /.test(text)) {
      return `<span class="md-cb-interactive" data-line="${lineIdx}">☐</span><span class="md-cb-t">${this._inline(text.substring(6))}</span>`;
    }

    // Unordered list
    if (/^[-*] /.test(text)) {
      return `<span class="md-dot">•</span><span>${this._inline(text.substring(2))}</span>`;
    }

    // Ordered list
    const olm = text.match(/^(\d+)\. (.*)/);
    if (olm) {
      return `<span class="md-num">${olm[1]}.</span><span>${this._inline(olm[2])}</span>`;
    }

    // Blockquote
    if (text.startsWith('> ')) {
      return `<span class="md-bq">${this._inline(text.substring(2))}</span>`;
    }

    return this._inline(text);
  }

  _handleCheckboxClick(lineIdx) {
    const line = this._lines[lineIdx];
    if (!line) return;

    if (/^- \[ \] /.test(line)) {
      this._lines[lineIdx] = line.replace('- [ ] ', '- [x] ');
    } else if (/^- \[x\] /i.test(line)) {
      this._lines[lineIdx] = line.replace(/- \[x\] /i, '- [ ] ');
    }

    this._renderReadMode();
    this.onChange(this.getValue());
  }

  // ═══ Edit Mode — Full Render ═══

  _fullRender() {
    this.el.innerHTML = '';
    let inCode = false;
    this._lines.forEach((line, i) => {
      if (line.trim().startsWith('```')) inCode = !inCode;
      const div = document.createElement('div');
      div.className = 'ed-line';
      this._fillLine(div, line, i, i === this._active, inCode);
      this.el.appendChild(div);
    });
  }

  _fillLine(div, text, idx, isActive, inCode) {
    div.className = 'ed-line';

    if (isActive) {
      div.classList.add('active');
      if (text === '') {
        div.innerHTML = '<br>';
      } else {
        div.textContent = text;
      }
      return;
    }

    if (text.trim().startsWith('```')) {
      div.classList.add('fence');
      const lang = text.trim().substring(3).trim();
      div.innerHTML = `<span class="md-fence">\`\`\`${lang ? '<span class="md-fence-lang">' + lang + '</span>' : ''}</span>`;
      return;
    }

    if (inCode) {
      div.classList.add('code-line');
      div.textContent = text || '\u00A0';
      return;
    }

    if (text === '') {
      div.innerHTML = '<br>';
      return;
    }

    div.classList.add('rendered');
    div.innerHTML = this._renderLine(text);
  }

  // ═══ Incremental Update ═══

  _updateLine(idx) {
    const div = this.el.children[idx];
    if (!div) return;
    let inCode = false;
    for (let i = 0; i < idx; i++) {
      if (this._lines[i]?.trim().startsWith('```')) inCode = !inCode;
    }
    this._fillLine(div, this._lines[idx] || '', idx, idx === this._active, inCode);
  }

  _switchActive(newIdx) {
    if (newIdx < 0 || newIdx >= this._lines.length || newIdx === this._active) return;
    this._sync();
    const old = this._active;
    this._active = newIdx;
    this._updateLine(old);
    this._updateLine(newIdx);
  }

  // ═══ Cursor ═══

  _placeCursor(lineIdx, charOffset) {
    const div = this.el.children[lineIdx];
    if (!div) return;
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      const range = document.createRange();
      const node = div.firstChild;
      if (node && node.nodeType === 3) {
        range.setStart(node, Math.min(charOffset, node.length));
        range.collapse(true);
      } else {
        range.selectNodeContents(div);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }

  _getCursorOffset() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    return range.startContainer.nodeType === 3 ? range.startOffset : (this._lines[this._active]?.length || 0);
  }

  // ═══ Events ═══

  _bindEvents() {
    this.el.addEventListener('input', () => this._onInput());

    this.el.addEventListener('keydown', (e) => {
      if (this._mode !== 'edit') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleEnter();
      } else if (e.key === 'Backspace') {
        if (this._getCursorOffset() === 0 && this._active > 0) {
          e.preventDefault();
          this._handleBackspaceStart();
        }
      } else if (e.key === 'Delete') {
        const len = this._lines[this._active]?.length || 0;
        if (this._getCursorOffset() >= len && this._active < this._lines.length - 1) {
          e.preventDefault();
          this._handleDeleteEnd();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setTimeout(() => this._detectLineChange(), 10);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this._insertTextRaw('  ');
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this._sync();
        this.onSave(this.getValue());
      }
    });

    this.el.addEventListener('mousedown', (e) => {
      // Handle checkbox clicks in read mode
      if (this._mode === 'read') {
        const cb = e.target.closest('.md-cb-interactive');
        if (cb) {
          e.preventDefault();
          const lineIdx = parseInt(cb.dataset.line);
          this._handleCheckboxClick(lineIdx);
        }
        return;
      }

      // Edit mode: switch active line
      const lineEl = e.target.closest('.ed-line');
      if (!lineEl) return;
      const idx = Array.from(this.el.children).indexOf(lineEl);
      if (idx < 0 || idx === this._active) return;
      e.preventDefault();
      this._switchActive(idx);
      this._placeCursor(idx, this._lines[idx]?.length || 0);
    });

    this.el.addEventListener('paste', (e) => {
      if (this._mode !== 'edit') return;
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      this._insertTextRaw(text);
    });
  }

  _onInput() {
    if (this._mode !== 'edit') return;
    this._sync();
    this.onChange(this.getValue());
  }

  // ═══ Input Handling ═══

  _handleEnter() {
    this._sync();
    const offset = this._getCursorOffset();
    const line = this._lines[this._active];
    const before = line.substring(0, offset);
    const after = line.substring(offset);

    // Auto-continue: if empty list item, cancel the list
    const listPat = /^(\s*[-*] (?:\[[ x]\] )?)$/;
    const olPat = /^(\s*\d+\. )$/;
    if (listPat.test(before) && after === '') {
      this._lines[this._active] = '';
      this.el.children[this._active].textContent = '';
      this.el.children[this._active].innerHTML = '<br>';
      this.onChange(this.getValue());
      return;
    }
    if (olPat.test(before) && after === '') {
      this._lines[this._active] = '';
      this.el.children[this._active].textContent = '';
      this.el.children[this._active].innerHTML = '<br>';
      this.onChange(this.getValue());
      return;
    }

    // Determine continuation prefix
    let prefix = '';
    const chk = before.match(/^(\s*)- \[[ x]\] /);
    const ul = before.match(/^(\s*[-*] )/);
    const ol = before.match(/^(\s*)(\d+)\. /);
    if (chk) prefix = chk[1] + '- [ ] ';
    else if (ul) prefix = ul[1];
    else if (ol) prefix = ol[1] + `${parseInt(ol[2]) + 1}. `;

    // Split
    this._lines[this._active] = before;
    this._lines.splice(this._active + 1, 0, prefix + after);

    const oldDiv = this.el.children[this._active];
    this._active++;
    this._updateLine(this._active - 1);

    const newDiv = document.createElement('div');
    newDiv.className = 'ed-line active';
    const newText = prefix + after;
    if (newText === '') {
      newDiv.innerHTML = '<br>';
    } else {
      newDiv.textContent = newText;
    }

    if (oldDiv.nextSibling) {
      this.el.insertBefore(newDiv, oldDiv.nextSibling);
    } else {
      this.el.appendChild(newDiv);
    }

    this._placeCursor(this._active, prefix.length);
    this.onChange(this.getValue());
  }

  _handleBackspaceStart() {
    this._sync();
    const prevLen = this._lines[this._active - 1].length;
    this._lines[this._active - 1] += this._lines[this._active];
    this._lines.splice(this._active, 1);

    const curDiv = this.el.children[this._active];
    this.el.removeChild(curDiv);

    this._active--;
    this._updateLine(this._active);
    this._placeCursor(this._active, prevLen);
    this.onChange(this.getValue());
  }

  _handleDeleteEnd() {
    this._sync();
    const curLen = this._lines[this._active].length;
    this._lines[this._active] += this._lines[this._active + 1];
    this._lines.splice(this._active + 1, 1);

    const nextDiv = this.el.children[this._active + 1];
    if (nextDiv) this.el.removeChild(nextDiv);

    this._updateLine(this._active);
    this._placeCursor(this._active, curLen);
    this.onChange(this.getValue());
  }

  _detectLineChange() {
    const sel = window.getSelection();
    if (!sel.focusNode) return;
    const n = sel.focusNode;
    const lineEl = n.nodeType === 3 ? n.parentElement?.closest('.ed-line') : n.closest?.('.ed-line');
    if (!lineEl) return;
    const idx = Array.from(this.el.children).indexOf(lineEl);
    if (idx >= 0 && idx !== this._active) {
      this._switchActive(idx);
    }
  }

  _insertTextRaw(text) {
    this._sync();
    const offset = this._getCursorOffset();
    const line = this._lines[this._active];
    const lines = text.split('\n');

    if (lines.length === 1) {
      this._lines[this._active] = line.substring(0, offset) + text + line.substring(offset);
      this.el.children[this._active].textContent = this._lines[this._active];
      this._placeCursor(this._active, offset + text.length);
    } else {
      const before = line.substring(0, offset);
      const after = line.substring(offset);
      this._lines[this._active] = before + lines[0];
      for (let i = 1; i < lines.length; i++) {
        this._lines.splice(this._active + i, 0, i === lines.length - 1 ? lines[i] + after : lines[i]);
      }
      this._active += lines.length - 1;
      this._fullRender();
      this._placeCursor(this._active, lines[lines.length - 1].length);
    }
    this.onChange(this.getValue());
  }

  // ═══ Formatting API ═══

  insertFormatting(action) {
    if (this._mode !== 'edit') return;
    this.el.focus();
    this._sync();

    switch (action) {
      case 'bold': this._wrap('**', '**'); break;
      case 'italic': this._wrap('*', '*'); break;
      case 'strikethrough': this._wrap('~~', '~~'); break;
      case 'code': this._wrap('`', '`'); break;
      case 'link': this._wrap('[', '](url)'); break;
      case 'heading': this._togglePrefix(); break;
      case 'ul': this._setPrefix('- '); break;
      case 'ol': this._setPrefix('1. '); break;
      case 'checklist': this._setPrefix('- [ ] '); break;
      case 'quote': this._setPrefix('> '); break;
      case 'codeblock': this._insertBlock(['```', '', '```']); break;
      case 'hr': this._insertBlock(['---']); break;
    }
  }

  _wrap(before, after) {
    const offset = this._getCursorOffset();
    const line = this._lines[this._active];
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    let s = offset, e = offset;
    if (!range.collapsed && range.startContainer.nodeType === 3) {
      s = range.startOffset;
      e = range.endOffset;
    }
    const selected = line.substring(s, e);
    this._lines[this._active] = line.substring(0, s) + before + selected + after + line.substring(e);
    this.el.children[this._active].textContent = this._lines[this._active];
    this._placeCursor(this._active, s + before.length + selected.length);
    this.onChange(this.getValue());
  }

  _togglePrefix() {
    const line = this._lines[this._active];
    const m = line.match(/^(#{1,6})\s/);
    if (m) {
      this._lines[this._active] = m[1].length >= 6
        ? line.replace(/^#{1,6}\s/, '')
        : '#' + line;
    } else {
      this._lines[this._active] = '## ' + line;
    }
    this.el.children[this._active].textContent = this._lines[this._active];
    this._placeCursor(this._active, this._lines[this._active].length);
    this.onChange(this.getValue());
  }

  _setPrefix(prefix) {
    const line = this._lines[this._active];
    this._lines[this._active] = line.startsWith(prefix) ? line.substring(prefix.length) : prefix + line;
    this.el.children[this._active].textContent = this._lines[this._active];
    this._placeCursor(this._active, this._lines[this._active].length);
    this.onChange(this.getValue());
  }

  _insertBlock(blockLines) {
    this._sync();
    const offset = this._getCursorOffset();
    const line = this._lines[this._active];
    this._lines[this._active] = line.substring(0, offset);
    for (let i = 0; i < blockLines.length; i++) {
      this._lines.splice(this._active + 1 + i, 0, blockLines[i]);
    }
    this._lines.splice(this._active + 1 + blockLines.length, 0, line.substring(offset) || '');
    this._active += Math.ceil(blockLines.length / 2) + (blockLines.length === 1 ? 1 : 0);
    this._fullRender();
    this._placeCursor(this._active, this._lines[this._active]?.length || 0);
    this.onChange(this.getValue());
  }

  // ═══ Line Rendering (for edit mode non-active lines) ═══

  _renderLine(text) {
    if (!text.trim()) return '<br>';

    const hm = text.match(/^(#{1,6})\s+(.*)/);
    if (hm) return `<span class="md-h md-h${hm[1].length}">${this._inline(hm[2])}</span>`;

    if (/^-{3,}$/.test(text.trim())) return '<span class="md-hr"></span>';

    if (/^- \[x\] /i.test(text)) return `<span class="md-cb done">☑</span><span class="md-cb-t done">${this._inline(text.substring(6))}</span>`;
    if (/^- \[ \] /.test(text)) return `<span class="md-cb">☐</span><span class="md-cb-t">${this._inline(text.substring(6))}</span>`;

    if (/^[-*] /.test(text)) return `<span class="md-dot">•</span><span>${this._inline(text.substring(2))}</span>`;

    const olm = text.match(/^(\d+)\. (.*)/);
    if (olm) return `<span class="md-num">${olm[1]}.</span><span>${this._inline(olm[2])}</span>`;

    if (text.startsWith('> ')) return `<span class="md-bq">${this._inline(text.substring(2))}</span>`;

    return this._inline(text);
  }

  _inline(text) {
    let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>');
    s = s.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
    s = s.replace(/~~(.*?)~~/g, '<del>$1</del>');
    s = s.replace(/`([^`]+)`/g, '<code class="md-ic">$1</code>');
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<span class="md-link">$1</span>');
    return s;
  }
}
