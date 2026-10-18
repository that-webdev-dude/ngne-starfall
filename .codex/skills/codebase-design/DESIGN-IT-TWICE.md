# Design it twice

Use this when the user wants alternative interfaces or a consequential design choice would benefit from independent proposals. Read [SKILL.md](SKILL.md) and the relevant dependency guidance in [DEEPENING.md](DEEPENING.md).

Explain the constraints, current callers, dependencies, and non-negotiable ownership, lifecycle, ordering, and performance contracts. An illustrative sketch may clarify the problem; label it as such.

When delegation is available, request three independent designs within the host's available capacity:

1. Minimize what callers must know.
2. Support the demonstrated variations without speculative extension points.
3. Optimize the most common real caller.

Give each agent a bounded technical brief with file paths, evidence, architecture vocabulary, and project vocabulary. Ask for the interface, usage example, hidden responsibilities, dependency strategy, test approach, and trade-offs. Keep the work read-only unless implementation was explicitly requested.

Do not exceed the available agent slots. Use fewer agents or sequential passes when necessary, and do not describe sequential proposals as independent agent reviews.

Compare designs on caller knowledge, locality, preserved contracts, test coverage, migration cost, and relevant performance risks. Recommend one design or a justified combination. Preserve uncertainty where evidence is missing.
