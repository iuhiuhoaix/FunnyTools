# FunnyTools

A collection of productivity skills (plugins) for Claude Code. Install once, get all skills.

## Installation

### Plugin Install (Recommended)

```bash
/plugin install https://github.com/<your-org>/FunnyTools.git
```

### Manual: Copy to Project

```bash
cp -r FunnyTools/skills/* /path/to/your-project/.claude/skills/
```

## Skills

| Skill | Description |
|-------|-------------|
| [md-to-html](skills/md-to-html/) | Convert Markdown to styled HTML with 5 built-in themes and custom template support |

## Adding New Skills

1. Create a directory under `skills/`
2. Add a `SKILL.md` with proper frontmatter (name, description)
3. Optionally add `scripts/`, `assets/`, `references/` as needed
4. Test locally, then commit

Each skill is auto-discovered by Claude Code — no registration needed.

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [RELEASING.md](RELEASING.md) - How to create new releases
- [PROMPT.md](PROMPT.md) - Development prompt template for new Claude Code sessions

## License

MIT
