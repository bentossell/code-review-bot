## Repository Agent Guidelines

### Immediate Actions
- Read `plan.md` before starting work.
- Mark completed plan tasks with notes on implementation details and dates.
- Record any plan adjustments directly in `plan.md`, including rationale.

### Execution Principles
- Align changes with the objectives outlined in `plan.md`.
- Keep pull requests focused and reference relevant plan sections.
- Prefer iterative updates to avoid large, hard-to-review diffs.

### Collaboration
- Document open questions and resolutions in issues or the plan.
- Share key decisions in PR descriptions or lightweight ADRs.
- Coordinate with teammates when work areas overlap.

### Quality Assurance
- Add or update tests alongside code changes.
- Run linting, formatting, and tests locally before committing.
- Treat warnings as work items unless formally deferred.

### Automation & Tooling
- Monitor the code-review bot workflow results after significant changes.
- Keep secrets secure; avoid logging sensitive data.
- Prefer configuration-driven behavior to support future extensibility.

### Continuous Improvement
- Suggest refinements to the plan when new insights arise.
- Capture lessons learned from issues or incidents.
- Promote reusable utilities and patterns across the project.
