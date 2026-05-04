// index.ts
// Entry point. Orchestrates scanner -> auditors -> reporter pipeline.
// Accepts CACTI_REPO_PATH environment variable to override default repo path.

import path from 'path';
import { findMarkdownFiles, getScanScopeLabel } from './scanner';
import { auditFile } from './auditors';
import { reportResults } from './reporter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Path to the Hyperledger Cacti repository root.
 * By default, resolves to a sibling `cacti` directory.
 * Override by setting the CACTI_REPO_PATH environment variable.
 */
const TARGET_REPO = process.env['CACTI_REPO_PATH']
  ? path.resolve(process.env['CACTI_REPO_PATH'])
  : path.resolve(__dirname, '../../cacti');

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nCacti Docs Quality Auditor`);
  console.log(`Target repository : ${TARGET_REPO}`);
  console.log(`Scope             : ${getScanScopeLabel()}\n`);

  // Stage 1 — Discovery
  let files: string[];
  try {
    files = await findMarkdownFiles(TARGET_REPO);
  } catch (err) {
    console.error(
      `\nError: Could not scan the target directory.\n` +
      `  Path tried: ${TARGET_REPO}\n` +
      `  Ensure the Cacti repository is cloned and the path is correct.\n` +
      `  Set CACTI_REPO_PATH environment variable to override.\n`
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.warn('Warning: No markdown files found. Verify the target path and exclusion rules.');
    process.exit(0);
  }

  // Stage 2 — Audit all discovered files in parallel
  const results = await Promise.all(files.map((f) => auditFile(f)));

  // Stage 3 — Report
  reportResults(results, TARGET_REPO, getScanScopeLabel());

  // Exit with non-zero code if High-severity issues exist (useful for CI)
  const hasHighSeverity = results.some((r) =>
    r.issues.some((i) => i.severity === 'High')
  );
  if (hasHighSeverity) {
    process.exit(1);
  }
}

main();
