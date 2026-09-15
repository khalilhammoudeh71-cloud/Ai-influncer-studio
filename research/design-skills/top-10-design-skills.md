# Top 10 GitHub Skills for Design, Frontend, UI and UX

Impeccable is the strongest overall first addition for a broad design workflow. UI UX Pro Max offers the most useful searchable design reference library among these candidates, while Taste Skill is a strong choice for expressive landing pages and portfolios. Interface Design is the more targeted choice for dashboards and application screens. These are editorial recommendations based on repository content and installation practicality, not results of a controlled generation benchmark.

## Ranking basis

The ranking balances three considerations: practical usefulness in Codex, visual design and UX depth, and GitHub popularity. Specialization, concrete workflows, supporting references, and installation requirements influence the order. Popularity is supporting evidence rather than a proxy for output quality. A smaller specialist can rank because it fills a gap that the larger design skills do not.

Repository metadata and source files were checked on September 8, 2026, America/Chicago. Stars below are exact GitHub API snapshots for the entire repository, not individual skill installations. Multi-skill repositories therefore have a substantial popularity advantage. Repository push dates indicate repository activity, not necessarily updates to the listed skill. No claim is made that this is an exhaustive census of every GitHub skill.

| Rank | Skill | Repository stars | Main specialization | Local availability |
|---|---|---:|---|---|
| 1 | Impeccable | 66,598 | Design direction, critique, refinement, responsive UI | New install |
| 2 | UI UX Pro Max | 126,139 | Searchable UI/UX recommendations and design systems | New install; adapt script paths |
| 3 | Taste Skill | 85,477 | Landing pages, portfolios, expressive redesigns | New install; current default is experimental |
| 4 | Frontend Design — Anthropic | 175,245 | Art direction and frontend visual craft | Existing local variant |
| 5 | Interface Design | 5,676 | Dashboards, SaaS applications, tools and settings | New install |
| 6 | Web Design Guidelines — Vercel | 30,982 | UI code review and interaction quality | Already installed |
| 7 | Figma Implement Design — OpenAI | 26,518 | Translating Figma specifications into application code | New install; Figma MCP required |
| 8 | Fixing Accessibility — UI Skills | 8,249 | Keyboard, focus, semantics and form accessibility | New install |
| 9 | React Best Practices — Vercel | 30,982 | Frontend performance and React implementation | Related plugin version available |
| 10 | Product Design and UX | 75 | Information architecture, task flows and UX handoffs | New install |

Each entry below links directly to its original skill source. Repository metadata sources are collected at the end.

## 1. Impeccable

**Best overall addition.** It joins design direction, critique, refinement, responsive adaptation, UX copy, and edge-case handling in one skill. Named operations such as polish, typeset, layout, harden and clarify make it easy to request a specific improvement. The inspected skill separates marketing, operational interfaces, reading surfaces and experiential work, which helps avoid imposing landing-page aesthetics on product tools. [Skill source](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md).

It includes supporting references and a runtime launcher. The normal upstream installer also offers design-detector hooks; a direct skill-folder installation should not be described as installing those hooks. The launcher may download its pinned engine on first use. **Recommendation:** use it as the primary general design skill, then bring in specialists only for the current task. [Installation and runtime documentation](https://github.com/pbakaus/impeccable).

## 2. UI UX Pro Max

**Best searchable design reference library.** Its local data supports queries for styles, palettes, typography, UX guidelines, charts and implementation stacks. It distinguishes broad design-system work from focused domain or framework questions, making it useful when choosing a coherent visual system or resolving a specific interaction concern. Its recommendations remain guidance; they are not evidence about actual user behavior. [Skill source](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md).

Python 3 is required for the search workflow. The inspected folder includes data, references and scripts, but its examples use `CLAUDE_PLUGIN_ROOT`. A Codex installation must resolve these examples against the installed skill directory, or use an upstream Codex-targeted installation. **Recommendation:** particularly useful when a brief lacks a palette, type system or interface direction. [Repository and installation options](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).

## 3. Taste Skill

**Best for visually distinctive marketing surfaces.** The skill reads the brief and adjusts layout variation, motion intensity and visual density. Its explicit scope is landing pages, portfolios and redesigns; it excludes dashboards, data tables and complex product flows. It contains detailed design-system, layout, motion and redesign guidance, with a strong React/Next.js and Tailwind orientation. [Skill source](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md).

The repository labels its current default v2 experimental. It is a large, opinionated instruction set, so it can introduce more context and stylistic constraints than a compact skill. The installation name is `design-taste-frontend`, despite the folder being named `taste-skill`. **Recommendation:** choose it when expressive visual execution is the priority; use Interface Design for operational screens. [Version and installation documentation](https://github.com/Leonxlnx/taste-skill).

## 4. Frontend Design — Anthropic

**Best compact general foundation.** It focuses on deliberate aesthetics, typography, composition and working frontend output. It is valuable when a project needs a clear visual point of view without a large supporting toolchain. Its scope is broader and less structured than a dedicated UX research or interaction-specification workflow. [Skill source](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).

A local `frontend-design` skill is already present, with a customized emphasis on subject-specific visual identity, typography and self-critique. Its provenance was not established as an exact upstream match. **Recommendation:** keep the local version unless replacing it is an explicit choice; installing another skill with the same destination name would collide.

## 5. Interface Design

**Best for dashboards and application interfaces.** Its scope covers admin panels, SaaS applications, settings, tools and data interfaces. It addresses visual hierarchy, density, tokens, states, reusable controls and design-system consistency. It also records reusable design patterns in a project system file. [Skill source](https://github.com/Dammyjay93/interface-design/blob/main/.claude/skills/interface-design/SKILL.md).

This is a better specialist for an application workspace than a skill explicitly aimed at portfolio or marketing pages. The core design instructions are self-contained; Claude-specific command conveniences should not be assumed to transfer automatically. **Recommendation:** a strong second addition for ongoing product UI work.

## 6. Web Design Guidelines — Vercel

**Best lightweight UI review companion.** It retrieves the current Web Interface Guidelines, reviews requested files, and reports actionable findings at file locations. This makes it useful for catching interface implementation problems after the main design work. It is an audit workflow rather than a visual concept generator. [Skill source](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md), [rules source](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

The skill is already installed locally. It relies on fetching its external rules, so a review should identify any failure to retrieve them. **Recommendation:** use the existing installation alongside the chosen visual design skill.

## 7. Figma Implement Design — OpenAI

**Best for implementing an existing Figma design.** It provides a workflow for obtaining design context and screenshots, retrieving assets, mapping tokens, reusing project components and validating visual parity. This is especially useful when the design direction has already been approved in Figma. [Skill source](https://github.com/openai/skills/blob/main/skills/.curated/figma-implement-design/SKILL.md).

A working Figma MCP connection is a prerequisite; installing the Markdown skill does not create that connection. The Figma plugin is not installed in the current setup. **Recommendation:** select this when work regularly begins from Figma files. It is less valuable for inventing a design from a short text brief.

## 8. Fixing Accessibility — UI Skills

**Best focused accessibility repair skill in this shortlist.** It covers accessible names, keyboard operation, dialog focus, semantics, form errors, announcements, contrast and motion. Reviews ask for a specific violation, its consequence and a concrete code-level fix, while favoring small targeted changes. [Skill source](https://github.com/ibelick/ui-skills/blob/main/skills/fixing-accessibility/SKILL.md).

Its narrow scope makes it a useful companion after implementation or while adding interactive controls. Checklist-driven code review does not establish full accessibility conformance or replace testing with assistive technology. **Recommendation:** add it for frequent forms, dialogs, custom navigation or interaction-heavy UI work.

## 9. React Best Practices — Vercel

**Best frontend performance companion.** It prioritizes data-fetching waterfalls, bundle size, server work, rendering and re-rendering behavior. These concerns influence perceived interface speed but do not provide art direction, information architecture or a complete usability method. [Skill source](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md).

A related Vercel plugin version is available locally; it is not identical to the inspected upstream file. **Recommendation:** use the available version first, or deliberately add the upstream skill if its broader/current rules are needed. Treat it as an engineering complement to design guidance.

## 10. Product Design and UX

**Best dedicated UX planning specialist in this shortlist.** It covers information architecture, task and state models, recovery paths, interface contracts, content decisions and usability-study planning. It ties decisions to available evidence and distinguishes interaction design from visual styling and implementation. [Skill source](https://github.com/magnus919/agent-skills/blob/main/product-design-and-ux/SKILL.md).

The repository has far less popularity evidence than the other entries. Its inclusion reflects the specificity of its UX workflow, not demonstrated superior real-world outcomes. It links to sibling discovery, accessibility and specification skills for work outside its scope; a single-folder install does not include those siblings. **Recommendation:** use it when deciding how a multi-step product should work before writing UI code.

## Installation choices

Any entry can be selected by number or name. Nothing was installed as part of this comparison. A sensible starting point is **#1 alone**, or **#1 and #5** when both public-facing pages and application screens matter. Keep the existing #4 and #6. Add #8 for accessibility repair or #10 for deeper product-flow work. Use one primary design skill per task to avoid conflicting aesthetic defaults.

The following are verified source directories for selective installation, not commands already executed. Copy the complete folder, including references and scripts. Existing destinations require an explicit replacement or distinct-name decision.

| Pick | GitHub repository | Skill directory | Installation note |
|---|---|---|---|
| 1 | `pbakaus/impeccable` | `.agents/skills/impeccable` | Includes launcher and references; hooks are separate |
| 2 | `nextlevelbuilder/ui-ux-pro-max-skill` | `.claude/skills/ui-ux-pro-max` | Python; resolve Claude-specific script paths for Codex |
| 3 | `Leonxlnx/taste-skill` | `skills/taste-skill` | Suggested destination name: `design-taste-frontend` |
| 4 | `anthropics/skills` | `skills/frontend-design` | Existing local variant; avoid overwriting automatically |
| 5 | `Dammyjay93/interface-design` | `.claude/skills/interface-design` | Install core skill; command integrations may differ |
| 6 | `vercel-labs/agent-skills` | `skills/web-design-guidelines` | Already installed |
| 7 | `openai/skills` | `skills/.curated/figma-implement-design` | Figma connection required separately |
| 8 | `ibelick/ui-skills` | `skills/fixing-accessibility` | Focused Markdown skill |
| 9 | `vercel-labs/agent-skills` | `skills/react-best-practices` | Related plugin version available; avoid redundant activation |
| 10 | `magnus919/agent-skills` | `product-design-and-ux` | Include references/templates; sibling skills not included |

For example, the available Codex installer can selectively install #5:

```sh
python3 /Users/Family/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --repo Dammyjay93/interface-design --path .claude/skills/interface-design
```

This command is supplied for review and has not been run. Installation verification should confirm the skill name, supporting files and any required runtime or connection before reporting it ready.

## Sources and evidence limits

Original `SKILL.md` links appear with each assessment. The following GitHub API records supplied repository star counts and activity metadata; all were accessed September 8, 2026, America/Chicago:

1. Paul Bakaus, [Impeccable repository metadata](https://api.github.com/repos/pbakaus/impeccable).
2. Next Level Builder, [UI UX Pro Max repository metadata](https://api.github.com/repos/nextlevelbuilder/ui-ux-pro-max-skill).
3. Leonxlnx, [Taste Skill repository metadata](https://api.github.com/repos/Leonxlnx/taste-skill).
4. Anthropic, [Skills repository metadata](https://api.github.com/repos/anthropics/skills).
5. Dammyjay93, [Interface Design repository metadata](https://api.github.com/repos/Dammyjay93/interface-design).
6. Vercel Labs, [Agent Skills repository metadata](https://api.github.com/repos/vercel-labs/agent-skills).
7. OpenAI, [Skills repository metadata](https://api.github.com/repos/openai/skills).
8. ibelick, [UI Skills repository metadata](https://api.github.com/repos/ibelick/ui-skills).
9. magnus919, [Agent Skills repository metadata](https://api.github.com/repos/magnus919/agent-skills).

Other candidates surfaced during discovery included UI UX Kit, PracticalSwan Frontend Design, ChloeVPin UI/UX Design, and JPeetz Design-to-Code. They were not all evaluated to the same depth as the finalists. Original publisher sources were preferred over republished copies. The order is a qualitative shortlist, not a numerical league table; no side-by-side implementation benchmark, installation smoke test or comprehensive security audit was performed.

Local availability was checked against the current skill catalog and relevant files under `/Users/Family/.codex/skills` and the installed Vercel plugin. A matching or related skill name is not proof of identical source content. Repository stars, source content and installation details can change after this snapshot.
