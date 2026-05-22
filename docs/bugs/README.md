# Bugs

Post-mortems for notable bugs we hit and how we fixed them. Each entry is a self-contained write-up: symptom, root cause, fix, lessons captured.

| Date | File | Title |
|------|------|-------|
| 2026-05-22 | [2026-05-22-shift-candidate-listener-churn.md](./2026-05-22-shift-candidate-listener-churn.md) | Hold-Shift candidate entry silently wrote digits |

## When to add an entry

Add a new entry when a bug required non-obvious investigation, exposed a platform/framework quirk, or produced a repo-wide policy or pattern change. Skip routine bugs that don't teach us anything new.

## File naming

`YYYY-MM-DD-short-kebab-summary.md`

## Entry structure

Suggested sections: Summary, How it manifested, Why this was hard to track down, The fix, Lessons captured, Follow-up work. Reference the related entry in `docs/guides/DECISION-LOG.md` if a policy was changed.
