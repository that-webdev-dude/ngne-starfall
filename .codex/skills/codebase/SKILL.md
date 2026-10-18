---
name: codebase
description: Review architectural friction, present evidence-backed deepening candidates in a visual report, and explore the candidate the user selects. Only use when the user explicitly invokes /codebase.
disable-model-invocation: true
x-source: skills-manager@d4476c5
x-content-hash: 86b0c91935b49a1a8cee13f8e4bea6c8237fe46224c47061ce932ef0889faef5
---
<!-- Vendored from skills-manager@d4476c5. Do not edit here: edit the source in the skills-manager repo and re-run `skills sync`. -->


# Codebase

Find refactors that hide meaningful complexity behind simpler interfaces, improving locality, testability, and navigation. A review may conclude that no worthwhile refactor is justified.

## Dependencies and scope

This skill runs three other collection skills, each when its phase is reached:

- `/codebase-design`: architecture vocabulary, deepening, and alternative interfaces.
- `/grilling`: focused design questions and factual investigation.
- `/domain-modeling`: authorized glossary and decision updates.

Install them alongside this skill. If one is unavailable, name it and stop the phase that depends on it. No setup skill, issue tracker, external service, or package installation is required.

Read repository instructions and authoritative architecture/contracts first. User scope and repository constraints take precedence over these design preferences. Review and selection do not authorize implementation. Follow existing authorization if the user has already requested implementation; do not add another approval gate.

## 1. Explore

Invoke `/codebase-design` for the shared architecture vocabulary and deletion test.

If the user names a module, subsystem, or concern, focus there. Otherwise inspect a useful stretch of `git log --oneline` and changed paths to identify recent hotspots. Use current files and user concerns if history is unavailable. Recency guides attention; it does not prove a defect.

Read existing domain vocabulary and relevant decisions. Follow `CONTEXT-MAP.md` if present, otherwise `CONTEXT.md`; consult relevant ADRs and the repository's existing documentation locations. Missing glossary files do not block a review and are not a reason to create them during scanning.

When subagents are available, delegate a bounded read-only exploration of the chosen area while you inspect contracts, callers, or tests independently. Pass the scope, relevant instructions, and vocabulary. If delegation is unavailable, explore locally and disclose that limitation only when it affects the result.

Look for evidence:

- One concept requires following many modules with little useful separation.
- Callers must understand implementation details or ordering that could be owned in one place.
- Tests miss meaningful behavior because it is distributed across callers.
- Several modules change together for the same reason.

Apply the deletion test consistently: if removing a module makes needless complexity disappear, it may be a pass-through; if its responsibilities reappear across callers, it is earning its keep. Evaluate consolidation separately: does it actually reduce caller knowledge and concentrate responsibility without losing necessary ownership, lifecycle, or performance guarantees?

Record concrete files, call paths, and relevant tests. Distinguish observed friction from hypotheses. Do not recommend generic abstractions or consolidation solely because files are small.

## 2. Present candidates

Read [HTML-REPORT.md](HTML-REPORT.md). Unless the user asks for a text-only or no-file report, produce an offline-capable HTML report outside the repository in the OS temporary directory. Use the host's temp-directory API or environment, including `$env:TEMP` on PowerShell, and a unique `codebase-review-<timestamp>.html` filename.

For each justified candidate include:

- Files and evidence.
- Problem and proposed responsibility change.
- Expected benefits and trade-offs, including test and performance implications.
- A before/after diagram.
- Recommendation strength: Strong, Worth exploring, or Speculative.

Give a top recommendation, or state why no candidate clears the bar. Respect established decisions; flag a contradiction with an ADR only when concrete evidence warrants revisiting it. Use project terms for the domain and consistent architecture terms without renaming actual identifiers or banning necessary technical language.

Keep solutions conceptual at this stage; defer detailed interface design until a candidate is selected. Do not manufacture a minimum number of candidates.

Show the report using an available Codex file/browser preview. If necessary use a platform opener with a correctly quoted path, such as PowerShell `Start-Process -FilePath $reportPath`. If opening is unavailable, provide the absolute file link. Report rendering as verified only if inspected.

Ask which candidate the user wants to explore, unless the user requested report only. A report-only request ends here.

## 3. Explore the selected candidate

Invoke `/grilling`. Establish constraints, dependencies, ownership, lifecycle, interface shape, and the tests that must survive. Reuse already-settled decisions. Use `/codebase-design`'s DESIGN-IT-TWICE.md only when alternative interfaces would help or the user asks for them.

Invoke `/domain-modeling` when actively resolving domain language or documenting a durable decision. In an authorized documentation workflow, record resolved terms as they arise. In a read-only or discussion-only workflow, present proposed glossary/ADR text without writing it. Respect the repository's existing authoritative documents instead of creating competing specifications.

Keep documentation work separate from source implementation. End with the agreed proposal, evidence, unresolved choices, and next action within the user's scope. Do not treat selecting a candidate as permission to refactor.
