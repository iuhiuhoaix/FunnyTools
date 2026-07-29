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
| `--cdn` | Use CDN for JS/CSS libraries (for sharing) | false |
| `--embed` | Embed local images as base64 in HTML | false |
| `--list-themes` | Show available themes | - |

**Built-in themes:** `github`, `minimal`, `academic`, `report`, `dark`, `kreport`, `kdesign`

## Conversion Workflow

1. **Determine input**: Identify the markdown file or inline content to convert
2. **Choose theme**: If user specified a style, use it. Otherwise default to `github`. Ask only if the context suggests a specific style would be appropriate (e.g. a report -> `report`, code docs -> `github`)
3. **Determine options**:
   - Use `--cdn` if sharing HTML with others (loads JS/CSS from BootCDN)
   - Use `--embed` if markdown contains local images (embeds as base64)
   - Combine both for fully self-contained shareable files: `--cdn --embed`
4. **Run conversion script**:

```bash
# File conversion with default theme
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md>

# With specific theme
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md> --theme dark

# For sharing: use CDN + embed images
node "${CLAUDE_PLUGIN_ROOT}/skills/md-to-html/scripts/convert.cjs" --input <file.md> --theme kdesign --cdn --embed

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
| `kreport` | Kingdee-style reports with blue color scheme, mermaid support |
| `kdesign` | KDesign system style, modern enterprise UI, code highlighting |

**Special features by theme:**
- `kreport` and `kdesign`: Include Prism.js (code highlighting) and Mermaid.js (flowcharts/sequence diagrams)
- Use `--cdn` flag with these themes for shareable files (loads libraries from BootCDN)
- Use `--embed` flag to embed local images as base64

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

## Sharing HTML Files

### Option 1: CDN Mode (Recommended for sharing)
Use `--cdn` to load JS/CSS libraries from BootCDN (optimized for China network):
```bash
node convert.cjs --input file.md --theme kdesign --cdn
```
- ✅ Single HTML file
- ✅ No external dependencies
- ⚠️ Requires internet to load code highlighting and mermaid diagrams

### Option 2: Embed Images (Self-contained)
Use `--embed` to convert local images to base64:
```bash
node convert.cjs --input file.md --theme kdesign --embed
```
- ✅ Images embedded in HTML
- ✅ No need to send image files separately
- ⚠️ File size increases ~33% per image

### Option 3: Full Self-contained (Best for sharing)
Combine both flags for maximum portability:
```bash
node convert.cjs --input file.md --theme kdesign --cdn --embed
```
- ✅ Single HTML file
- ✅ Images embedded
- ✅ Libraries loaded from CDN
- ✅ Works offline for basic viewing (images show)
- ⚠️ Code highlighting and diagrams require internet

### Option 4: Offline Package
For fully offline use, send HTML + vendor directory:
```bash
# Generate HTML with local paths
node convert.cjs --input file.md --theme kdesign

# Send to colleague:
# - output.html
# - skills/md-to-html/assets/vendor/ (directory)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Input file not found" | Check the file path; use absolute paths for reliability |
| "Unknown theme" | Use `--list-themes` to see built-in names, or provide a full path to a .html file |
| Node.js not found | Ensure `node` is in PATH. Install from https://nodejs.org |
| CSS looks wrong | Clear browser cache; ensure the theme file is valid HTML |
