# Schulportal Client — AI Agent Router

> **This is the mandatory entry point for every AI coding session in this repository.**
> Read this file completely before taking any action.

> **Maintainers:** `.github/copilot-instructions.md` is a symlink pointing to this file. Edit only `AGENTS.md` — never edit the symlink directly.

---

## Step 1 — Bootstrap (ALWAYS first)

**MUST** read the instruction file matched in Step 3 before taking any action.

Only read `.github/.instructions/basic_stack.md` when the routing table in Step 3 directs you to it (DevOps topics or no-match). Do not read it for every request — it documents all three repositories and is only relevant for infrastructure and cross-repo context.

---

## Step 2 — Global Hard Constraints

These rules override everything else and apply to every response, in every context.

| # | Constraint |
|---|---|
| 1 | **Language:** All code, comments, variable names, and responses are in **English**. The only exception is domain object names that reflect official German administrative terminology — these are kept in German (e.g. `Personenkontext`, `Schulstrukturknoten`, `Befristung`, `Zuordnung`, `Rolle`). Never translate domain terms. |
| 2 | **No context-free changes:** Never modify code without first reading the target file and its surrounding context. Never edit based on a file path or symbol name alone. |
| 3 | **No terminal edits:** Never use shell commands to edit files. Use file write/edit tools only. |
| 4 | **No hallucinated tools:** Only use build commands, scripts, and npm run targets that are documented in this project. Never invent commands. |
| 5 | **No hallucinated frameworks:** Only use libraries and frameworks that appear in `package.json`. Never import packages that are not listed as dependencies. |
| 6 | **No commands without permission:** Never run any shell command, terminal command, or npm script without first asking the user for explicit confirmation. This includes installs, builds, starts, and Docker operations. |
| 7 | **Auto-generated files are read-only:** Never edit anything under `src/api-client/generated/`. Regenerate with `npm run generate-client` — but ask the user first. |
| 8 | **Scope discipline:** Only implement what was explicitly asked. Never add unrequested features, refactors, helper abstractions, error handling, comments, or docstrings — even if they seem like improvements. |
| 9 | **One concern per response:** Never bundle edits that serve different concerns into a single change. Independent edits that serve the *same* concern may be applied in parallel. |
| 10 | **Validate after every edit:** After modifying any TypeScript or Vue file, check for TypeScript and ESLint errors before declaring the task complete. |
| 11 | **No unnecessary file creation:** Never create a new file when the change can be made in an existing one. New files require explicit justification. |
| 12 | **No assumptions:** When requirements are ambiguous, ask. Do not infer intent and proceed silently. |

---

## Step 3 — Route to the Right Agent

Identify the primary topic of the request, then read the corresponding instruction file **before** writing any code or giving any advice.

| Topic keywords | Instruction file to read |
|:---|:---|
| Frontend, UI, component, view, store, composable, Vue, Vuetify, Pinia, router, i18n, SCSS, form, validation | `.github/.instructions/frontend_agent.md` |
| Test, spec, unit test, component test, mock, coverage, Vitest, DoFactory, MockAdapter | `.github/.instructions/testing_agent.md` |
| Review, PR, code review, refactor, analyse, smell, quality | `.github/.instructions/review_agent.md` |
| DevOps, Docker, CI/CD, build, deploy, pipeline, Helm, Kubernetes, environment, local setup | `.github/.instructions/devops_agent.md` |
| _(no specific match)_ | Use `.github/.instructions/basic_stack.md` as the sole reference |

> If a request spans multiple topics (e.g. "write a component and its tests"), read **all** matching instruction files before proceeding.

## Jira Integration

Whenever a prompt references a ticket matching `SPSH-\d+`, **MUST** immediately call the Jira MCP tool (`jira_get_issue` or `jira_search`) to fetch the current ticket data before responding. Never answer from memory or context alone.