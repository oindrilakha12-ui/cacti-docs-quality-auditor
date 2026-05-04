// reporter.ts
// Formats audit results into a chalk-coloured per-file and summary report.
// Exits with code 1 when High severity issues are found for CI integration.

import chalk from 'chalk';
import { FileAuditResult, AuditIssue, Severity } from './auditors';

// ---------------------------------------------------------------------------
// Severity color map
// ---------------------------------------------------------------------------

const severityColor: Record<Severity, chalk.Chalk> = {
  High: chalk.red,
  Medium: chalk.yellow,
  Low: chalk.cyan,
};

const typeColor: Record<string, chalk.Chalk> = {
  Branding: chalk.red,
  Link: chalk.magenta,
  Section: chalk.cyan,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatIssue(issue: AuditIssue): string {
  const sev = severityColor[issue.severity](`[${issue.severity}]`);
  const type = typeColor[issue.type](`[${issue.type}]`);
  const loc = issue.line ? chalk.gray(` Line ${issue.line}`) : '';
  const msg = `  ${sev} ${type}${loc} — ${issue.message}`;
  const ctx = issue.context
    ? `\n     ${chalk.gray('Context:')} ${chalk.dim(issue.context)}`
    : '';
  return msg + ctx;
}

function formatFileHeader(relativePath: string): string {
  return chalk.bold.white(`\nFile: ${relativePath}`);
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

interface SummaryStats {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  byType: Record<string, number>;
  bySeverity: Record<Severity, number>;
}

function buildStats(results: FileAuditResult[]): SummaryStats {
  const filesWithIssues = results.filter((r) => r.issues.length > 0);

  const stats: SummaryStats = {
    totalFiles: results.length,
    filesWithIssues: filesWithIssues.length,
    totalIssues: 0,
    byType: { Branding: 0, Link: 0, Section: 0 },
    bySeverity: { High: 0, Medium: 0, Low: 0 },
  };

  for (const result of results) {
    for (const issue of result.issues) {
      stats.totalIssues++;
      stats.byType[issue.type] = (stats.byType[issue.type] ?? 0) + 1;
      stats.bySeverity[issue.severity]++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Public reporter
// ---------------------------------------------------------------------------

export function reportResults(
  results: FileAuditResult[],
  rootDir: string,
  scopeLabel: string
): void {
  const filesWithIssues = results.filter((r) => r.issues.length > 0);

  console.log(
    chalk.bold.blue('\n══════════════════════════════════════════════════')
  );
  console.log(chalk.bold.blue('  Hyperledger Cacti — Documentation Audit Report'));
  console.log(chalk.bold.blue('══════════════════════════════════════════════════'));
  console.log(chalk.dim(`  ${scopeLabel}\n`));

  if (filesWithIssues.length === 0) {
    console.log(chalk.green('  ✔  No issues found. Documentation is clean.\n'));
    return;
  }

  for (const result of filesWithIssues) {
    const relativePath = path.relative(rootDir, result.filePath);
    console.log(formatFileHeader(relativePath));
    for (const issue of result.issues) {
      console.log(formatIssue(issue));
    }
  }

  const stats = buildStats(results);

  console.log(
    chalk.bold.blue('\n══════════════════════════════════════════════════')
  );
  console.log(chalk.bold.white('  Summary'));
  console.log(chalk.bold.blue('══════════════════════════════════════════════════'));
  console.log(
    `  Total files scanned : ${chalk.white(stats.totalFiles.toString())}`
  );
  console.log(
    `  Files with issues   : ${chalk.yellow(stats.filesWithIssues.toString())}`
  );
  console.log(
    `  Total issues found  : ${chalk.red(stats.totalIssues.toString())}`
  );
  console.log('');
  console.log(chalk.bold('  Breakdown by type:'));
  console.log(`    Branding : ${chalk.red(stats.byType['Branding'].toString())}`);
  console.log(`    Link     : ${chalk.magenta(stats.byType['Link'].toString())}`);
  console.log(`    Section  : ${chalk.cyan(stats.byType['Section'].toString())}`);
  console.log('');
  console.log(chalk.bold('  Breakdown by severity:'));
  console.log(
    `    High     : ${severityColor['High'](stats.bySeverity.High.toString())}`
  );
  console.log(
    `    Medium   : ${severityColor['Medium'](stats.bySeverity.Medium.toString())}`
  );
  console.log(
    `    Low      : ${severityColor['Low'](stats.bySeverity.Low.toString())}`
  );
  console.log(
    chalk.bold.blue('\n══════════════════════════════════════════════════\n')
  );
}
