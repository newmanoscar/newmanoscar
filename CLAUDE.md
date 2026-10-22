# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## Repository overview

This is **`newmanoscar/newmanoscar`** — a GitHub **profile repository**. Because the
repository name matches the account name, GitHub renders this repo's root
`README.md` at the top of the owner's GitHub profile page
(`https://github.com/newmanoscar`).

**Current state:** the repository contains a profile `README.md` (rendered on the
GitHub profile) and this `CLAUDE.md`. There is no application, build system,
package manifest, test suite, or CI configuration.

The `README.md` uses minimal, generic intro text plus a "Connect with me"
section of [shields.io](https://shields.io) badges. Several social links are
placeholders (`href="#"`) awaiting real profile URLs, and the email badge points
at a placeholder `you@example.com` address — these are meant to be filled in or
removed by the owner.

Because there is no codebase, most conventional CLAUDE.md sections (architecture,
build/test commands, module layout) do not apply. This file documents what the repo
*is* and how to proceed as content is added, rather than describing structure that
does not exist. **Keep it honest — do not document workflows or files that are not
actually present.**

## Files

- `README.md` — the public-facing profile content (see "Current state" above).
- `CLAUDE.md` — this guidance file.
- `.claude/skills/stop-slop/` — the `stop-slop` agent skill (writing-style rules that
  strip common AI prose patterns), installed from `hardikpandya/stop-slop` via
  `npx -y skills add hardikpandya/stop-slop --skill stop-slop --agent claude-code`.
  Markdown only, no scripts. It is tooling for assistants, not profile content.
- `skills-lock.json` — lockfile written by the `skills` CLI, pinning the source and
  content hash of the installed skill.

## What this repo is for

A profile repository typically contains:

- `README.md` at the root — the profile bio/landing content shown on the GitHub
  profile. This is almost always the primary (or only) deliverable.
- Optional supporting assets referenced by the README (images, badges, an
  `assets/` or `images/` directory).
- Optional GitHub Actions workflows under `.github/workflows/` for dynamically
  updating the README (e.g. latest blog posts, stats, activity).

It generally does **not** contain a traditional software project.

## Working conventions

- **The root `README.md` is the product.** When adding or editing it, remember it is
  public-facing and rendered on the profile page. Use GitHub-flavored Markdown; keep
  external image/badge URLs reachable.
- **Keep this file accurate.** When real content lands (a README, assets, or
  automation workflows), update this `CLAUDE.md` to describe what was actually added —
  its purpose, layout, and any commands needed to run or regenerate it. Remove this
  "empty repository" framing once it no longer holds.
- **Don't invent tooling.** There is currently no package manager, linter, formatter,
  or test runner. Do not add configuration for tools that aren't requested.

## Git workflow

- Development for the current documentation task happens on the branch
  `claude/claude-md-docs-08cpn8`.
- Commit with clear, descriptive messages and push with `git push -u origin <branch>`.
- Do not open a pull request unless explicitly asked.
