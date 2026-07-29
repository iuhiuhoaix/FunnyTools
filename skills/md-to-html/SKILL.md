---
name: md-to-html
description: "This skill should be used when the user asks to 'convert markdown to HTML', 'generate HTML from markdown', 'export markdown as HTML', 'create HTML page from .md file', 'render markdown to HTML', 'convert my document to a web page', 'make an HTML file from this markdown', 'turn this into a webpage', 'make a styled HTML document', or needs to produce styled HTML output from any markdown content. Covers single file conversion, inline content transformation, batch processing, and custom theme requests."
version: 1.0.0
---

# md-to-html

Convert Markdown files to styled HTML using the embedded Node.js converter with multiple built-in themes.

## When to Use

- User has `.md` files and wants HTML output
- User wants a styled web page from markdown content
- User mentions HTML export, web page generation, or document rendering
- User asks for a specific visual style (dark mode, academic, report)

## Quick Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--input, -i` | Input markdown file | (required unless --stdin) |
| `--theme, -t` | Theme name or custom .html path | `github` |
| `--output, -o` | Output HTML file | `<input>.html` |
| `--title` | Page title | First H1 or filename |
| `--stdin` | Read from stdin | false |
| `--list-themes` | Show available themes | - |

**Built-in themes:** `github`, `minimal`, `academic`, `report`, `dark`

## Conversion Workflow

1. **Determine input**: Identify the markdown file or inline content to convert
2. **Choose theme**: If user specified a style, use it. Otherwise default to `github`. Ask only if the context suggests a specific style would be appropriate (e.g. a report -> `report`, code docs -> `github`)
3. **Run conversion script**:

```bash
# File conversion with default theme
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md>

# With specific theme
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md> --theme dark

# Custom output path and title
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md> --theme report --output report.html --title "Report Title"

# From stdin (for inline content)
echo "# Hello" | node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --stdin --theme minimal --output hello.html
```

4. **Verify output**: Confirm the HTML file was created and report its path to the user

## Theme Selection Guide

| Theme | Best For |
|-------|----------|
| `github` | Technical documentation, READMEs, code-related content |
| `minimal` | Clean reading experience, blog posts, personal notes |
| `academic` | Papers, research documents, formal writing |
| `report` | Business documents, reports, professional content |
| `dark` | Dark mode preference, presentations, screen sharing |

## Custom Themes

Users can create custom themes by copying any built-in theme and modifying the CSS. See [references/custom-themes.md](references/custom-themes.md) for the full guide.

Quick version:
1. Copy `skills/md-to-html/assets/themes/github.html`
2. Edit the `<style>` section
3. Save anywhere and use: `--theme /path/to/custom.html`

## Batch Processing

Convert multiple files at once:

```bash
# Convert all .md files in a directory
for f in docs/*.md; do
  node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input "$f" --theme github
done
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Input file not found" | Check the file path; use absolute paths for reliability |
| "Unknown theme" | Use `--list-themes` to see built-in names, or provide a full path to a .html file |
| Node.js not found | Ensure `node` is in PATH. Install from https://nodejs.org |
| CSS looks wrong | Clear browser cache; ensure the theme file is valid HTML |
