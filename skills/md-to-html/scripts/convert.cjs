#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ── CLI Argument Parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    input: null,
    theme: 'github',
    output: null,
    title: null,
    stdin: false,
    listThemes: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--input': case '-i': args.input = argv[++i]; break;
      case '--theme': case '-t': args.theme = argv[++i]; break;
      case '--output': case '-o': args.output = argv[++i]; break;
      case '--title': args.title = argv[++i]; break;
      case '--stdin': args.stdin = true; break;
      case '--list-themes': args.listThemes = true; break;
      case '--help': case '-h': args.help = true; break;
      default:
        if (!args.input && !argv[i].startsWith('-')) args.input = argv[i];
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node convert.cjs [options]

Options:
  --input, -i <file>    Input markdown file (required unless --stdin)
  --theme, -t <name>    Theme name or path to custom .html template (default: github)
  --output, -o <file>   Output HTML file (default: <input>.html)
  --title <title>       Page title (default: extracted from first H1)
  --stdin               Read markdown from stdin
  --list-themes         List available built-in themes
  --help, -h            Show this help`);
}

// ── HTML Escaping ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Slug Generation ───────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Inline Parsing ────────────────────────────────────────────────────────────

function parseInline(text) {
  // Process in stages using placeholder replacement to avoid nested match issues

  // 1. Extract and protect inline code spans first (they should not be parsed further)
  const codeSpans = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codeSpans.length;
    codeSpans.push('<code>' + escapeHtml(code) + '</code>');
    return '\x00CODE' + idx + '\x00';
  });

  // 2. Extract images BEFORE HTML escaping: ![alt](url "title")
  const imgSpans = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) => {
    const t = title ? ' title="' + escapeHtml(title) + '"' : '';
    const idx = imgSpans.length;
    imgSpans.push('<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '"' + t + '>');
    return '\x00IMG' + idx + '\x00';
  });

  // 3. Extract links BEFORE HTML escaping: [text](url "title")
  const linkSpans = [];
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => {
    const t = title ? ' title="' + escapeHtml(title) + '"' : '';
    const idx = linkSpans.length;
    linkSpans.push('<a href="' + escapeHtml(url) + '"' + t + '>' + label + '</a>');
    return '\x00LINK' + idx + '\x00';
  });

  // 4. Escape HTML in remaining text (images/links already protected by placeholders)
  text = escapeHtml(text);

  // 5. Autolinks: <url> (now escaped as &lt;url&gt;)
  text = text.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, (_, url) => {
    return '<a href="' + escapeHtml(url) + '">' + escapeHtml(url) + '</a>';
  });

  // 6. Bold+Italic: ***text*** or ___text___
  text = text.replace(/\*{3}([^*]+)\*{3}/g, '<strong><em>$1</em></strong>');
  text = text.replace(/_{3}([^_]+)_{3}/g, '<strong><em>$1</em></strong>');

  // 7. Bold: **text** or __text__
  text = text.replace(/\*{2}([^*]+)\*{2}/g, '<strong>$1</strong>');
  text = text.replace(/_{2}([^_]+)_{2}/g, '<strong>$1</strong>');

  // 8. Italic: *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

  // 9. Strikethrough: ~~text~~
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 10. Footnote references: [^name]
  text = text.replace(/\[\^(\w+)\]/g, (_, name) => {
    return '<sup><a href="#fn-' + name + '" id="fnref-' + name + '">[' + name + ']</a></sup>';
  });

  // 11. Restore protected spans
  text = text.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codeSpans[parseInt(idx)]);
  text = text.replace(/\x00IMG(\d+)\x00/g, (_, idx) => imgSpans[parseInt(idx)]);
  text = text.replace(/\x00LINK(\d+)\x00/g, (_, idx) => linkSpans[parseInt(idx)]);

  return text;
}

// ── Block-Level Parsing ───────────────────────────────────────────────────────

const BlockType = {
  HEADING: 'heading',
  CODE_FENCE: 'code_fence',
  CODE_INDENT: 'code_indent',
  BLOCKQUOTE: 'blockquote',
  UL: 'ul',
  OL: 'ol',
  TABLE: 'table',
  HR: 'hr',
  BLANK: 'blank',
  FOOTNOTE_DEF: 'footnote_def',
  PARAGRAPH: 'paragraph',
};

function parseBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  const footnotes = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      blocks.push({ type: BlockType.BLANK });
      i++;
      continue;
    }

    // Horizontal rule: ---, ***, ___ (3+ chars, only whitespace around)
    if (/^(\s*[-*_]\s*){3,}$/.test(line) && !/^(\s*\d+\.\s)/.test(line)) {
      blocks.push({ type: BlockType.HR });
      i++;
      continue;
    }

    // Heading: # to ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: BlockType.HEADING,
        level: headingMatch[1].length,
        text: headingMatch[2].replace(/\s+#+\s*$/, ''), // strip trailing #
      });
      i++;
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^(`{3,}|~{3,})(\w*)\s*$/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] || '';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({
        type: BlockType.CODE_FENCE,
        lang: lang,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Indented code block (4 spaces or tab, not in a list context)
    if (/^( {4}|\t)/.test(line)) {
      const codeLines = [];
      while (i < lines.length && (/^( {4}|\t)/.test(lines[i]) || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && i + 1 < lines.length && !/^( {4}|\t)/.test(lines[i + 1]) && lines[i + 1].trim() !== '') break;
        codeLines.push(lines[i].replace(/^( {4}|\t)/, ''));
        i++;
      }
      // Trim trailing blank lines
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') codeLines.pop();
      blocks.push({
        type: BlockType.CODE_INDENT,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Footnote definition: [^name]: content
    const fnMatch = line.match(/^\[\^(\w+)\]:\s+(.+)$/);
    if (fnMatch) {
      footnotes[fnMatch[1]] = parseInline(fnMatch[2]);
      i++;
      continue;
    }

    // Table: starts with |
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    // Blockquote
    if (line.match(/^>\s?/)) {
      const bqLines = [];
      while (i < lines.length && (lines[i].match(/^>\s?/) || (lines[i].trim() !== '' && bqLines.length > 0 && !lines[i].match(/^[#*\d|`~\-_]/)))) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const bqParsed = parseBlocks(bqLines.join('\n'));
      Object.assign(footnotes, bqParsed.footnotes);
      blocks.push({
        type: BlockType.BLOCKQUOTE,
        children: bqParsed.blocks,
      });
      continue;
    }

    // Unordered list
    if (line.match(/^(\s*)([-*+])\s+/)) {
      const { items, consumed } = parseList(lines, i, 'ul');
      blocks.push({ type: BlockType.UL, items: items });
      i += consumed;
      continue;
    }

    // Ordered list
    if (line.match(/^(\s*)\d+\.\s+/)) {
      const { items, consumed } = parseList(lines, i, 'ol');
      blocks.push({ type: BlockType.OL, items: items });
      i += consumed;
      continue;
    }

    // Paragraph: collect consecutive non-blank, non-special lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      const l = lines[i];
      // Stop if we hit a block-level construct
      if (l.match(/^(#{1,6})\s/) || l.match(/^(`{3,}|~{3,})/) || l.match(/^>\s?/) ||
          l.match(/^(\s*)([-*+])\s/) || l.match(/^(\s*)\d+\.\s/) || l.match(/^\[\^(\w+)\]:/) ||
          (/^(\s*[-*_]\s*){3,}$/.test(l) && !/^(\s*\d+\.\s)/.test(l))) break;
      // Table detection
      if (l.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1] && /^\|?\s*:?-{2,}/.test(lines[i + 1])) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: BlockType.PARAGRAPH,
        text: paraLines.join('\n'),
      });
    }
  }

  return { blocks, footnotes };
}

// ── List Parsing ──────────────────────────────────────────────────────────────

function parseList(lines, startIndex, listType) {
  const items = [];
  let i = startIndex;
  const baseMatch = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  const baseIndent = baseMatch ? baseMatch[1].length : 0;

  while (i < lines.length) {
    const line = lines[i];
    const itemMatch = line.match(new RegExp('^(\\s{' + (baseIndent) + ',})' + (listType === 'ol' ? '\\d+\\.\\s+' : '[-*+]\\s+') + '(.*)$'));

    if (!itemMatch && line.trim() !== '') {
      // Check if it's a continuation of the previous item
      if (items.length > 0 && line.match(/^\s{2,}/)) {
        items[items.length - 1].text += '\n' + line.trim();
        i++;
        continue;
      }
      break;
    }

    if (!itemMatch && line.trim() === '') {
      // Blank line within list - check if next line continues the list
      if (i + 1 < lines.length && lines[i + 1].match(new RegExp('^(\\s{' + baseIndent + ',})' + (listType === 'ol' ? '\\d+\\.\\s+' : '[-*+]\\s+')))) {
        i++;
        continue;
      }
      break;
    }

    const indent = itemMatch[1].length;
    const content = itemMatch[2];

    // Check for task list
    const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      items.push({
        text: taskMatch[2],
        task: true,
        checked: taskMatch[1].toLowerCase() === 'x',
        indent: indent,
      });
    } else {
      items.push({
        text: content,
        task: false,
        checked: false,
        indent: indent,
      });
    }
    i++;
  }

  return { items, consumed: i - startIndex };
}

// ── Table Parsing ─────────────────────────────────────────────────────────────

function parseTable(tableLines) {
  if (tableLines.length < 2) {
    return { type: BlockType.PARAGRAPH, text: tableLines.join('\n') };
  }

  function splitCells(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  }

  const headers = splitCells(tableLines[0]);
  const alignRow = splitCells(tableLines[1]);
  const alignments = alignRow.map(cell => {
    if (cell.match(/^:-{3,}:$/)) return 'center';
    if (cell.match(/^:-{3,}$/)) return 'left';
    if (cell.match(/^-{3,}:$/)) return 'right';
    return 'left';
  });

  const rows = [];
  for (let r = 2; r < tableLines.length; r++) {
    rows.push(splitCells(tableLines[r]));
  }

  return { type: BlockType.TABLE, headers, alignments, rows };
}

// ── Block Rendering ───────────────────────────────────────────────────────────

function renderBlocks(blocks, footnotes, isRoot) {
  const html = [];

  for (const block of blocks) {
    switch (block.type) {
      case BlockType.BLANK:
        // Skip blank lines in output
        break;

      case BlockType.HEADING: {
        const id = slugify(block.text);
        const inner = parseInline(block.text);
        html.push('<h' + block.level + ' id="' + id + '">' + inner + '</h' + block.level + '>');
        break;
      }

      case BlockType.CODE_FENCE: {
        const langClass = block.lang ? ' class="language-' + escapeHtml(block.lang) + '"' : '';
        html.push('<pre><code' + langClass + '>' + escapeHtml(block.code) + '</code></pre>');
        break;
      }

      case BlockType.CODE_INDENT:
        html.push('<pre><code>' + escapeHtml(block.code) + '</code></pre>');
        break;

      case BlockType.BLOCKQUOTE: {
        const inner = renderBlocks(block.children, footnotes, false);
        html.push('<blockquote>\n' + inner + '\n</blockquote>');
        break;
      }

      case BlockType.UL: {
        const hasTask = block.items.some(it => it.task);
        const cls = hasTask ? ' class="task-list"' : '';
        const listHtml = block.items.map(it => {
          if (it.task) {
            const checked = it.checked ? ' checked' : '';
            return '  <li class="task-list-item"><input type="checkbox"' + checked + ' disabled> ' + parseInline(it.text) + '</li>';
          }
          return '  <li>' + parseInline(it.text) + '</li>';
        }).join('\n');
        html.push('<ul' + cls + '>\n' + listHtml + '\n</ul>');
        break;
      }

      case BlockType.OL: {
        const listHtml = block.items.map(it =>
          '  <li>' + parseInline(it.text) + '</li>'
        ).join('\n');
        html.push('<ol>\n' + listHtml + '\n</ol>');
        break;
      }

      case BlockType.TABLE: {
        const ths = block.headers.map((h, idx) => {
          const align = block.alignments[idx] && block.alignments[idx] !== 'left' ? ' style="text-align:' + block.alignments[idx] + '"' : '';
          return '    <th' + align + '>' + parseInline(h) + '</th>';
        }).join('\n');

        const trs = block.rows.map(row => {
          const tds = row.map((cell, idx) => {
            const align = block.alignments[idx] && block.alignments[idx] !== 'left' ? ' style="text-align:' + block.alignments[idx] + '"' : '';
            return '    <td' + align + '>' + parseInline(cell) + '</td>';
          }).join('\n');
          return '  <tr>\n' + tds + '\n  </tr>';
        }).join('\n');

        html.push('<table>\n  <thead>\n  <tr>\n' + ths + '\n  </tr>\n  </thead>\n  <tbody>\n' + trs + '\n  </tbody>\n</table>');
        break;
      }

      case BlockType.HR:
        html.push('<hr>');
        break;

      case BlockType.PARAGRAPH:
        html.push('<p>' + parseInline(block.text) + '</p>');
        break;
    }
  }

  // Append footnotes section (only at root level)
  if (isRoot) {
    const fnKeys = Object.keys(footnotes);
    if (fnKeys.length > 0) {
      html.push('<section class="footnotes"><hr><ol>');
      for (const key of fnKeys) {
        html.push('  <li id="fn-' + escapeHtml(key) + '">' + footnotes[key] +
          ' <a href="#fnref-' + escapeHtml(key) + '">&#8617;</a></li>');
      }
      html.push('</ol></section>');
    }
  }

  return html.join('\n');
}

// ── Title Extraction ──────────────────────────────────────────────────────────

function extractTitle(md, filename) {
  // Try first H1
  const h1Match = md.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].replace(/\s+#+\s*$/, '');

  // Try first heading of any level
  const headingMatch = md.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].replace(/\s+#+\s*$/, '');

  // Fall back to filename
  if (filename) return path.basename(filename, path.extname(filename));

  return 'Document';
}

// ── Theme Loading ─────────────────────────────────────────────────────────────

function loadTheme(themeArg, scriptDir) {
  // Check if it's a file path
  if (themeArg.includes('/') || themeArg.includes('\\') || themeArg.endsWith('.html')) {
    const resolved = path.resolve(themeArg);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, 'utf-8');
    }
    console.error('Error: Theme file not found: ' + resolved);
    process.exit(3);
  }

  // Built-in theme
  const themePath = path.join(scriptDir, 'assets', 'themes', themeArg + '.html');
  if (fs.existsSync(themePath)) {
    return fs.readFileSync(themePath, 'utf-8');
  }

  console.error('Error: Unknown theme "' + themeArg + '". Use --list-themes to see available themes.');
  process.exit(3);
}

function listThemes(scriptDir) {
  const themesDir = path.join(scriptDir, 'assets', 'themes');
  if (!fs.existsSync(themesDir)) {
    console.log('No built-in themes found.');
    return;
  }
  const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.html'));
  console.log('Available themes:\n');
  for (const f of files) {
    const name = path.basename(f, '.html');
    console.log('  ' + name);
  }
  console.log('\nUse --theme <name> or --theme /path/to/custom.html');
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scriptDir = path.join(__dirname, '..');

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.listThemes) {
    listThemes(scriptDir);
    process.exit(0);
  }

  // Read input
  let md;
  if (args.stdin) {
    md = fs.readFileSync(0, 'utf-8');
  } else if (args.input) {
    const inputPath = path.resolve(args.input);
    if (!fs.existsSync(inputPath)) {
      console.error('Error: Input file not found: ' + inputPath);
      process.exit(1);
    }
    md = fs.readFileSync(inputPath, 'utf-8');
  } else {
    console.error('Error: No input specified. Use --input <file> or --stdin.');
    printHelp();
    process.exit(2);
  }

  // Parse markdown
  const { blocks, footnotes } = parseBlocks(md);
  const bodyHtml = renderBlocks(blocks, footnotes, true);

  // Extract title
  const title = args.title || extractTitle(md, args.input);

  // Load and apply theme
  const themeHtml = loadTheme(args.theme, scriptDir);
  const output = themeHtml
    .replace(/\{\{content\}\}/g, bodyHtml)
    .replace(/\{\{title\}\}/g, escapeHtml(title));

  // Write output
  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log('Written: ' + outputPath);
  } else if (args.input) {
    const outputPath = args.input.replace(/\.md$/i, '') + '.html';
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log('Written: ' + path.resolve(outputPath));
  } else {
    // stdin + no output -> stdout
    process.stdout.write(output);
  }
}

main();
