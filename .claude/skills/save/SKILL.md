---
name: save
description: Review all changes since the last commit, improve code quality, fix typecheck/lint errors, update docs, then commit and push to main. Invoke when the user types /save.
disable-model-invocation: true
---

Perform a full review, cleanup, and commit of all changes since the last git commit. Work through every step below in order. Do not skip steps. If a step produces no changes, say so and move on — don't fabricate work.

## 1. Review changes

Run `git status` and `git diff` (both staged and unstaged) to understand everything that changed since the last commit. Read any new or substantially modified files so you understand the full scope before touching anything.

If the working tree is clean, stop here and tell the user there's nothing to save.

## 2. Improve code quality

Look for changes that are clearly beneficial — don't over-engineer or add speculative abstractions. Good targets:

- Replace magic numbers / repeated literals with named constants
- Extract genuinely duplicated logic into a shared helper (but only if it's used 3+ times or the duplication is awkward)
- Remove dead code, unused imports, and stale commented-out blocks
- Simplify nested conditionals or redundant type assertions
- Make new code follow existing patterns in the file / nearby files

Hard constraints rooted in this project's conventions:

- **No paid dependencies.** The stack is strict free-tier (Vercel Hobby + Neon). Reject any new SDK that costs per call.
- **No transactions.** The `neon-http` driver doesn't support them. Writes are sequential; don't add `db.transaction(...)`.
- **The tagger runs only on insert.** Don't wire it into update paths — admin confirmations must survive re-ingest.
- **Don't add comments explaining what code does.** Only add a comment when the *why* is non-obvious (hidden constraint, workaround, surprising behavior). Follow the style already in the repo.

## 3. Fix errors

Run each check and fix every error at its root. Do not suppress with `@ts-ignore`, `// eslint-disable`, or `as any`. If something truly cannot be fixed (e.g., a dependency type bug), explain why in the commit message rather than silencing it.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

Skip `npm run build` unless the changes touch build-time behavior (route config, `generateStaticParams`, env-dependent imports), or one of the checks above suggests a build issue. Full builds are slow; run them only when they'd catch something the faster checks miss.

If you changed `lib/db/schema.ts`, also run `npm run db:generate` and commit the generated SQL in `drizzle/`.

## 4. Update documentation

Read `docs/maintaining-docs.md` first — it's the routing table for what belongs in which doc file and the rules for keeping each file small.

Then:

- Scan every file in `docs/` against the diff from step 1. For each changed area, update the corresponding doc so it matches the new reality. Add new sections for net-new features, correct stale information, and remove references to things you just deleted.
- Update `docs/README.md` — if a new version tag is warranted (a visible feature change, new page, new admin action), bump it and add a one-line entry to the "Recent changes" section in the same style as the existing entries.
- Update `CLAUDE.md` — keep it concise. It loads into every conversation, so it should stay a high-level map (stack, commands, layout, sharp edges), not a changelog. If something in CLAUDE.md is now wrong, fix it. If a new section is tempting, first ask whether it belongs in `docs/` instead.

If the change is purely internal (refactor, dependency bump, typo fix) with no user-visible or architectural impact, no doc update is needed — say so explicitly rather than padding docs for its own sake.

## 5. Commit and push

Stage the code changes and doc updates together. Draft a commit message in the repo's existing style — look at recent `git log` output. Format is roughly `type: short imperative summary`, where type is one of `feat`, `fix`, `docs`, `refactor`, `chore`. Lead with the *why* when it isn't obvious from the *what*.

Confirm the current branch is `main`. If it isn't, stop and ask the user before switching — a feature branch may be intentional.

Create the commit, then push:

```bash
git push origin main
```

If the push is rejected because the remote moved, `git pull --rebase origin main` and push again. Do **not** force-push to `main`.
