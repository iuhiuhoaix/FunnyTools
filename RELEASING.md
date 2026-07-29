# Releasing FunnyTools

This document describes how to create a new release of FunnyTools.

## Release Process

1. **Update CHANGELOG.md**
   - Move items from `[Unreleased]` to a new version section
   - Add the version number and date
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

2. **Update version in plugin.json**
   - Edit `.claude-plugin/plugin.json`
   - Update the `"version"` field to match the new version

3. **Commit changes**
   ```bash
   git add CHANGELOG.md .claude-plugin/plugin.json
   git commit -m "release: vX.Y.Z"
   ```

4. **Create and push tag**
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```

5. **Automated Release**
   - GitHub Actions will automatically create a release
   - The workflow uses the tag to generate release notes
   - Pre-release versions (containing `-rc`, `-beta`, or `-alpha`) are marked as pre-releases

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes to plugin format or skill API
- **MINOR** (0.X.0): New skills or backward-compatible features
- **PATCH** (0.0.X): Bug fixes and minor improvements

## Pre-release Versions

For testing releases before official release:

```bash
# Release candidate
git tag v1.1.0-rc.1
git push origin main --tags

# Beta
git tag v1.1.0-beta.1
git push origin main --tags

# Alpha
git tag v1.1.0-alpha.1
git push origin main --tags
```

Pre-release versions are automatically marked as pre-releases in GitHub.
