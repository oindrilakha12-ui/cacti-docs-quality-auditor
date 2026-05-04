# Cacti Documentation Quality Auditor

A TypeScript-based static analysis tool for detecting documentation quality issues in the Hyperledger Cacti repository. Performs a focused partial scan targeting the `/docs` directory and root-level markdown files to produce actionable, low-noise audit reports.

---

## Quick Start

```bash
# Clone this tool into the same parent directory as the cacti repository
git clone https://github.com/your-org/cacti-docs-quality-auditor.git
cd cacti-docs-quality-auditor

# Install dependencies
npm install

# Run the audit against ../cacti (default target)
npm run audit

# Override the target repository path
CACTI_REPO_PATH=/path/to/cacti npm run audit
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    npm run audit                             │
│                    (src/index.ts)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │      scanner.ts         │
              │  glob(*.md, docs/**/*.md)│
              │  excludes: generated/   │
              │            openapi/     │
              └────────────┬────────────┘
                           │  string[] (absolute paths)
              ┌────────────▼────────────┐
              │      auditors.ts        │
              │  ┌───────────────────┐  │
              │  │  checkBranding()  │  │  → High severity
              │  │  checkLinks()     │  │  → High severity
              │  │  checkSections()  │  │  → Medium / Low
              │  └───────────────────┘  │
              └────────────┬────────────┘
                           │  FileAuditResult[]
              ┌────────────▼────────────┐
              │      reporter.ts        │
              │  chalk-formatted output │
              │  per-file + summary     │
              └─────────────────────────┘
```

---

## Why This Tool Matters

Documentation debt is one of the most underestimated problems in large open-source projects. In a monorepo with hundreds of packages and an ongoing project rename (Cactus → Cacti), documentation can silently degrade across releases :-onfusing new contributors, misleading users, and reflecting poorly on project maintainability.

This tool addresses three concrete, recurring problems:

**1. Legacy branding creates contributor confusion.**
References to "Hyperledger Cactus" still appear in active documentation, long after the project was renamed. These are not historical notes :- they appear in onboarding guides and architecture pages that new contributors read first.

**2. Broken internal links erode trust in documentation.**
As the repository restructures packages, relative links go stale silently. No build system catches them; no CI check prevents them from being merged.

**3. Missing structural sections block contributor onboarding.**
Packages lacking "Getting Started" or "Architecture" sections force contributors to reverse-engineer intent from source code, increasing the time-to-first-contribution.

---

## Key Features

| Feature | Description | Severity |
|---|---|---|
| Legacy Branding Detection | Flags "Hyperledger Cactus" and standalone "Cactus" in active docs. Suppresses package namespace false positives. | High |
| Broken Internal Link Detection | Resolves all local markdown links and verifies existence on disk | High |
| Missing Section Detection | Checks for `Getting Started`, `Architecture`, `Contributing` in primary docs | Medium / Low |
| Partial Scan Mode | Targets `/docs` and root markdown only — no noise from generated API clients | — |
| CI-Ready Exit Codes | Exits with code `1` when High-severity issues are found | — |

---

## Example Audit Output

```text
══════════════════════════════════════════════════
  Hyperledger Cacti — Documentation Audit Report
══════════════════════════════════════════════════
  Partial Scan: /docs directory and root-level markdown files

File: docs/docs/index.md
  [High] [Branding] Line 15 — Outdated reference: "Cactus"
     Context: Welcome to the Cactus documentation portal.

File: docs/docs/weaver/getting-started/interop/asset-exchange/overview.md
  [High] [Link] Line 42 — Broken local link: "external/getting-started/test-network/overview.md"
     Context: the network you [launched earlier](external/getting-started/test-network/overview.md).

File: README-cactus.md
  [Medium] [Section] — Missing required section: "Architecture"

══════════════════════════════════════════════════
  Summary
══════════════════════════════════════════════════
  Total files scanned : 126
  Files with issues   : 69
  Total issues found  : 1638

  Breakdown by type:
    Branding : 984
    Link     : 312
    Section  : 342

  Breakdown by severity:
    High     : 1296
    Medium   : 228
    Low      : 114
══════════════════════════════════════════════════
```

See [sample-output.txt](./sample-output.txt) for the full annotated output.

---

## Sample Findings

| Severity | Type | File | Line | Detail |
|---|---|---|---|---|
| High | Branding | `docs/docs/index.md` | 15 | Outdated reference: "Cactus" in active onboarding page |
| High | Branding | `docs/docs/vision.md` | 22 | "Hyperledger Cactus" in project mission statement |
| High | Link | `docs/docs/weaver/getting-started/.../overview.md` | 42 | Target `external/getting-started/test-network/overview.md` does not exist |
| High | Link | `CHANGELOG.md` | 102 | `CONTRIBUTING.md` relative path broken after root restructure |
| Medium | Section | `README-cactus.md` | — | No `## Architecture` section found |
| Medium | Section | `docs/docs/guides/developers.md` | — | No `## Getting Started` section found |

---

## How It Works

**Stage 1 :- Discovery (`scanner.ts`)**
Collects `.md` files matching `*.md` and `docs/**/*.md` using `glob`. Auto-generated directories (`generated/`, `openapi/`, proto stubs) are excluded to prevent false positives.

**Stage 2 :- Branding Analysis (`auditors.ts`)**
Each file's lines are matched against `/Hyperledger Cactus|\bCactus\b/gi`. Package namespace strings (`@hyperledger/cactus-*`) are suppressed. Results include line number and surrounding context.

**Stage 3 :- Link Validation (`auditors.ts`)**
Local links matching `\[label\]\(target\)` are extracted. Each target is resolved relative to the source file using `path.resolve` and verified with `fs.pathExists`. Anchor fragments are stripped before resolution.

**Stage 4 :- Section Check (`auditors.ts`)**
Primary documentation files are checked for required headers using case-insensitive regex. Only root-level READMEs and files under `docs/docs/` are subject to this check to avoid noise from fixture or generated files.

**Stage 5 :- Report (`reporter.ts`)**
Results are printed per file with color-coded severity levels. A structured summary provides totals broken down by type and severity. Exit code `1` is returned if any High-severity issues are found.

---

## Installation and Usage

**Prerequisites:** Node.js v16+, npm

```bash
# Install
npm install

# Run audit (targets ../cacti by default)
npm run audit

# Override target path
CACTI_REPO_PATH=/absolute/path/to/cacti npm run audit

# Build to dist/
npm run build

# Run compiled output
npm start
```

---

## Project Structure

```
cacti-docs-quality-auditor/
├── src/
│   ├── index.ts        # Entry point; orchestrates scan → audit → report
│   ├── scanner.ts      # File discovery using glob with exclusion rules
│   ├── auditors.ts     # Branding, link, and section audit logic
│   └── reporter.ts     # Terminal output formatting with chalk
├── sample-output.txt   # Annotated example output from a real scan
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## CI/CD Integration

Add the following to `.github/workflows/docs-audit.yml` in the Cacti repository:

```yaml
name: Documentation Quality Audit

on:
  pull_request:
    paths:
      - 'docs/**'
      - '*.md'

jobs:
  audit:
    name: Docs Quality Gate
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Cacti repository
        uses: actions/checkout@v4

      - name: Checkout audit tool
        uses: actions/checkout@v4
        with:
          repository: your-org/cacti-docs-quality-auditor
          path: cacti-docs-quality-auditor

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install audit tool dependencies
        run: npm install
        working-directory: cacti-docs-quality-auditor

      - name: Run documentation audit
        run: CACTI_REPO_PATH=${{ github.workspace }} npm run audit
        working-directory: cacti-docs-quality-auditor
```

**Behavior:** The workflow triggers on every PR that modifies `docs/` or a root `.md` file. The auditor exits with code `1` on High-severity findings, which causes the CI check to fail and prevents the PR from being merged without resolution.

---

## Before vs. After Impact

| Metric | Before | After |
|---|---|---|
| Legacy "Cactus" references in active docs | Untracked | Caught on every PR |
| Broken internal links introduced by PRs | Untracked | Blocked at CI gate |
| Packages missing "Getting Started" section | Untracked | Tracked and reported per sprint |
| Time to detect a broken link | Manual review or never | Automated, < 30 seconds |
| Contributor onboarding quality | Inconsistent | Structurally enforced |

---

## Disclaimer

This tool performs a partial, static analysis of documentation files. It does not evaluate semantic accuracy, verify external URLs, or audit code-level documentation such as JSDoc or inline comments.

**This tool does not replace manual audits but helps standardize and scale documentation cleanup.**

Results should be reviewed by a human maintainer before remediation actions are taken, particularly for legacy branding references that may appear in intentional historical contexts such as changelogs.

---

## Contributing

Contributions are welcome. Before opening a pull request:

1. Open an issue to discuss the proposed change.
2. Follow the existing module structure :- one concern per file (`scanner`, `auditors`, `reporter`).
3. Document any new audit rule with a comment block explaining its purpose, the pattern it matches, and its severity rationale.
4. Test against a local Cacti repository clone before submitting.

---

## Audit Summary

Run against `hyperledger-cacti/cacti` mainline, May 2026.

Hyperledger Cacti — Documentation Audit Report

Partial Scan: /docs directory and root-level markdown files
Total files scanned : 126
Files with issues   : 69
Total issues found  : 1638
Breakdown by type:
Branding : 984
Link     : 312
Section  : 342
Breakdown by severity:
High     : 1296
Medium   : 228
Low      : 114

These findings form the Week 0 baseline for the mentorship cleanup work.
Metric M9 targets 0 broken links by Week 22.
Metric M5 targets 8 of 10 documented problems resolved in main.
Full annotated output available in [sample-output.txt](./sample-output.txt).

## License

Apache License 2.0.
