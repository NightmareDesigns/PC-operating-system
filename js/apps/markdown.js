/**
 * NightmareOS — Markdown Editor
 * Live-preview Markdown editor with common formatting shortcuts.
 */

'use strict';

(function () {
  function open() {
    const el = WindowManager.create({
      id: 'markdown',
      title: 'Markdown Editor',
      icon: '📑',
      width: 820,
      height: 520,
      content: buildUI(),
    });
    initEditor(el);
  }

  function buildUI() {
    return `
      <div class="md-editor">
        <div class="md-toolbar">
          <button class="md-tb-btn" data-action="bold" title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="md-tb-btn" data-action="italic" title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="md-tb-btn" data-action="heading" title="Heading">H</button>
          <button class="md-tb-btn" data-action="link" title="Link">🔗</button>
          <button class="md-tb-btn" data-action="code" title="Code">&lt;/&gt;</button>
          <button class="md-tb-btn" data-action="ul" title="Bullet list">• List</button>
          <button class="md-tb-btn" data-action="ol" title="Numbered list">1. List</button>
          <button class="md-tb-btn" data-action="quote" title="Blockquote">"</button>
          <button class="md-tb-btn" data-action="hr" title="Horizontal rule">―</button>
          <span class="md-spacer"></span>
          <button class="md-tb-btn md-export" data-action="export" title="Copy HTML">Export HTML</button>
        </div>
        <div class="md-panes">
          <textarea class="md-source" id="md-source" placeholder="Write Markdown here…"
                    spellcheck="true" aria-label="Markdown source"></textarea>
          <div class="md-preview" id="md-preview" aria-live="polite" aria-label="Preview"></div>
        </div>
      </div>`;
  }

  /* Minimal Markdown-to-HTML converter (no dependencies) */
  function mdToHtml(src) {
    let html = src;

    // Escape HTML entities first
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_m, _lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr/>');

    // Bold & italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Blockquote
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered list items
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');

    // Ordered list items
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Links  [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Images ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%"/>');

    // Paragraphs: lines not wrapped in tags
    html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

  function initEditor(el) {
    const source = el.querySelector('#md-source');
    const preview = el.querySelector('#md-preview');

    const sampleMd = `# Welcome to Markdown Editor

Write **Markdown** on the left, see the *live preview* on the right.

## Features
- **Bold**, *italic*, and ***bold-italic*** text
- Headings (H1–H6)
- Bullet and numbered lists
- \`Inline code\` and code blocks
- [Links](https://example.com)
- Blockquotes
- Horizontal rules

> This is a blockquote.

---

\`\`\`js
function hello() {
  console.log("Hello, NightmareOS!");
}
\`\`\`

Enjoy writing! 🚀`;

    source.value = sampleMd;

    function updatePreview() {
      preview.innerHTML = mdToHtml(source.value);
    }

    source.addEventListener('input', updatePreview);
    updatePreview();

    // Toolbar actions
    el.querySelector('.md-toolbar').addEventListener('click', function (e) {
      var btn = e.target.closest('.md-tb-btn');
      if (!btn) return;
      var action = btn.dataset.action;
      var start = source.selectionStart;
      var end = source.selectionEnd;
      var sel = source.value.substring(start, end);

      var insert = '';
      switch (action) {
        case 'bold':    insert = '**' + (sel || 'bold') + '**'; break;
        case 'italic':  insert = '*' + (sel || 'italic') + '*'; break;
        case 'heading': insert = '## ' + (sel || 'Heading'); break;
        case 'link':    insert = '[' + (sel || 'link text') + '](https://)'; break;
        case 'code':    insert = sel.includes('\n') ? '```\n' + sel + '\n```' : '`' + (sel || 'code') + '`'; break;
        case 'ul':      insert = '- ' + (sel || 'item'); break;
        case 'ol':      insert = '1. ' + (sel || 'item'); break;
        case 'quote':   insert = '> ' + (sel || 'quote'); break;
        case 'hr':      insert = '\n---\n'; break;
        case 'export':
          if (navigator.clipboard) {
            navigator.clipboard.writeText(preview.innerHTML).then(function () {
              showNotification('Markdown Editor', 'HTML copied to clipboard!');
            });
          }
          return;
        default: return;
      }

      source.setRangeText(insert, start, end, 'end');
      source.focus();
      updatePreview();
    });

    // Keyboard shortcuts within editor
    source.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        var s = source.selectionStart, en = source.selectionEnd;
        var sel = source.value.substring(s, en) || 'bold';
        source.setRangeText('**' + sel + '**', s, en, 'end');
        updatePreview();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        var s2 = source.selectionStart, en2 = source.selectionEnd;
        var sel2 = source.value.substring(s2, en2) || 'italic';
        source.setRangeText('*' + sel2 + '*', s2, en2, 'end');
        updatePreview();
      }
    });
  }

  NightOS.registerApp('markdown', {
    title: 'Markdown Editor',
    icon: '📑',
    open: open,
  });
})();
