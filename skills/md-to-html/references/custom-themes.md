# Custom Themes Guide

This guide explains how to create custom HTML themes for the md-to-html converter. No programming knowledge required — if you can edit HTML and CSS, you can create a theme.

## How Themes Work

A theme is a **complete HTML file** with a special placeholder `{{content}}` where the converted Markdown content is inserted. The converter reads your template, converts the Markdown, and replaces `{{content}}` with the result.

## Required Placeholders

| Placeholder | Required | Description |
|-------------|----------|-------------|
| `{{content}}` | Yes | Where the converted HTML body is inserted |
| `{{title}}` | No | The page title (extracted from first H1 or filename) |

## Step-by-Step: Create Your First Theme

### 1. Copy an Existing Theme

Start by copying the built-in theme closest to what you want:

```
# Copy github theme (the most versatile starting point)
cp skills/md-to-html/assets/themes/github.html my-theme.html
```

### 2. Edit the CSS

Open `my-theme.html` in any text editor. Find the `<style>` section and modify:

- **Colors**: Change `color`, `background`, `border-color` values
- **Fonts**: Change `font-family` properties
- **Spacing**: Adjust `padding`, `margin`, `line-height`
- **Width**: Change `max-width` on `body` to control content width

### 3. Test Your Theme

```bash
node convert.cjs --input your-doc.md --theme /path/to/my-theme.html --output test.html
```

Open `test.html` in a browser to see the result. Edit and re-run until satisfied.

### 4. Share Your Theme

- **Personal use**: Save anywhere, reference by full path
- **Team use**: Place in `skills/md-to-html/assets/themes/` to make it available by name
- **Contribute**: Submit a PR to add it as a built-in theme

## CSS Class Reference

The converter generates the following HTML elements and classes. Style these in your theme:

### Block Elements

| CSS Selector | HTML Element | Description |
|--------------|--------------|-------------|
| `h1` - `h6` | `<h1>` ... `<h6>` | Headings (h1 and h2 have `id` attributes for anchoring) |
| `p` | `<p>` | Paragraphs |
| `pre` | `<pre>` | Code blocks |
| `pre code` | `<pre><code>` | Code within code blocks |
| `code` | `<code>` | Inline code spans |
| `blockquote` | `<blockquote>` | Blockquotes (can be nested) |
| `ul`, `ol` | `<ul>`, `<ol>` | Unordered and ordered lists |
| `li` | `<li>` | List items |
| `table` | `<table>` | Tables |
| `th`, `td` | `<th>`, `<td>` | Table header and data cells |
| `hr` | `<hr>` | Horizontal rules |

### Special Classes

| CSS Selector | Description |
|--------------|-------------|
| `.markdown-body` | Wrapper `<article>` around all content — scope your styles here |
| `.task-list` | `<ul>` containing task list items |
| `.task-list-item` | `<li>` with a checkbox |
| `.task-list-item input[type="checkbox"]` | The checkbox itself |
| `.footnotes` | Section at the bottom containing footnote definitions |
| `.footnotes ol` | The ordered list of footnotes |
| `.footnotes a` | Back-link from footnote to reference |

### Inline Elements

| HTML Element | Description |
|--------------|-------------|
| `<strong>` | Bold text |
| `<em>` | Italic text |
| `<del>` | Strikethrough text |
| `<a href="...">` | Links (have `title` attribute if specified) |
| `<img src="..." alt="...">` | Images (have `title` attribute if specified) |
| `<sup><a>` | Footnote reference markers |

### Code Block Language Classes

When a fenced code block specifies a language, the `<code>` element gets a class:

```html
<pre><code class="language-python">...</code></pre>
```

Use this for syntax highlighting with CSS:

```css
pre code.language-python { /* python-specific styling */ }
pre code.language-json { /* json-specific styling */ }
```

## Example: Company Brand Theme

Here's how to create a theme with your company's brand colors:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body {
            font-family: "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
            background: #fff;
        }

        /* Company brand colors */
        h1, h2, h3 { color: #0056b3; }
        a { color: #0056b3; }
        pre { background: #f8f9fa; }

        /* Add company logo */
        .markdown-body::before {
            content: '';
            display: block;
            width: 120px;
            height: 40px;
            background: url('logo.png') no-repeat center;
            background-size: contain;
            margin-bottom: 2em;
        }
    </style>
</head>
<body>
    <article class="markdown-body">
        {{content}}
    </article>
</body>
</html>
```

## Tips

- **Scope styles to `.markdown-body`** to avoid affecting the page layout
- **Use relative units** (`em`, `rem`, `%`) for responsive designs
- **Add `@media print`** rules for print-friendly output
- **Test with varied content**: headings, tables, code blocks, and images
- **Keep templates UTF-8 encoded** for international character support
