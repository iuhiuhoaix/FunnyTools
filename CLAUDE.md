# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is FunnyTools

A Claude Code plugin monorepo containing reusable "skills" for Claude Code sessions. The primary developer builds skills; non-technical team members consume them. The plugin is installed via `/plugin install` and each skill under `skills/` is auto-discovered by Claude Code — no registration step needed.

## Repository Structure

```
FunnyTools/
├── .claude-plugin/plugin.json   # Plugin manifest (name, version, keywords)
├── skills/                      # One directory per skill
│   └── <skill-name>/
│       ├── SKILL.md             # Required: YAML frontmatter + workflow instructions
│       ├── scripts/             # Optional: executable scripts
│       ├── assets/              # Optional: templates, themes, static resources
│       └── references/          # Optional: detailed docs, loaded on demand
├── README.md
├── PROMPT.md                    # Chinese-language dev prompt template for new sessions
└── LICENSE                      # MIT
```

## Skill Format Convention

Every skill lives in `skills/<name>/` and must have a `SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: "Trigger phrases and usage description (~100 words). Claude sees this to decide when to activate the skill."
version: 1.0.0
---
```

Below the frontmatter: markdown workflow instructions telling Claude how to invoke the skill's scripts and present results.

**Trigger mechanism**: Claude always sees each skill's `name` + `description`. When a user request matches, Claude loads the full `SKILL.md` and follows its workflow.

## Development Rules

- **Zero dependencies**: Scripts must run with only Node.js built-in modules or Python standard library. No `npm install` required.
- **Script format**: CommonJS `.cjs` files (not ES modules). Must be directly runnable with `node scripts/convert.cjs`.
- **Audience**: Non-technical end users. Keep docs, templates, and error messages simple and accessible.
- **Theme templating**: HTML templates use `{{content}}` and `{{title}}` as Mustache-style placeholders.

## Existing Skills

| Skill | What it does |
|-------|-------------|
| `md-to-html` | Converts Markdown to styled HTML. 5 built-in themes (`github`, `minimal`, `academic`, `report`, `dark`), custom theme support, batch processing. CLI: `node scripts/convert.cjs --input <file.md> [--theme name] [--output file.html]` |

## Running the md-to-html Skill

```bash
# Basic conversion (default: github theme, output: <input>.html)
node skills/md-to-html/scripts/convert.cjs --input file.md

# With theme and custom output
node skills/md-to-html/scripts/convert.cjs --input file.md --theme dark --output out.html

# From stdin
echo "# Hello" | node skills/md-to-html/scripts/convert.cjs --stdin --theme minimal --output hello.html

# List built-in themes
node skills/md-to-html/scripts/convert.cjs --list-themes
```

## Adding a New Skill

1. Create `skills/<name>/` directory
2. Add `SKILL.md` with frontmatter (`name`, `description` with broad trigger coverage, `version`)
3. Add `scripts/`, `assets/`, `references/` as needed
4. Follow `md-to-html` as the reference implementation
5. Test locally before committing
