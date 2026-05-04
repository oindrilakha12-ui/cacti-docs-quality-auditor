// auditors.ts
// Three focused audit checks: legacy branding detection, broken internal link
// resolution, and missing section detection across Cacti markdown files.
import fs from 'fs-extra';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'High' | 'Medium' | 'Low';
export type IssueType = 'Branding' | 'Link' | 'Section';

export interface AuditIssue {
  type: IssueType;
  severity: Severity;
  message: string;
  line?: number;
  context?: string;
}

export interface FileAuditResult {
  filePath: string;
  issues: AuditIssue[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if this file should be subject to the Section check.
 * Only primary documentation files — not deep package-level or fixture READMEs.
 */
function isPrimaryDoc(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const isRoot = /\/[^/]+\.md$/.test(normalized) && !normalized.includes('/docs/');
  const isMainDoc = normalized.includes('/docs/docs/');
  return isRoot || isMainDoc;
}

// ---------------------------------------------------------------------------
// Check A: Branding
//
// Detects legacy "Hyperledger Cactus" and standalone "Cactus" references.
// Ignores occurrences that are part of the word "Cacti".
// Ignores package namespace strings like "@hyperledger/cactus-*" that are
// immutable (still published under the old name).
// ---------------------------------------------------------------------------

function checkBranding(lines: string[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Matches "Hyperledger Cactus" or word-boundary "Cactus" not preceded by Cacti
  const brandingPattern = /Hyperledger Cactus|\bCactus\b/gi;

  // Namespace pattern — suppress false positives from package names
  const namespacePattern = /@hyperledger\/cactus[-\w]*/i;

  lines.forEach((line, index) => {
    // Skip lines that are purely package namespace references
    if (namespacePattern.test(line) && !/(Hyperledger Cactus|\bCactus\b)/i.test(
      line.replace(/@hyperledger\/cactus[-\w]*/gi, '')
    )) {
      return;
    }

    let match: RegExpExecArray | null;
    const pattern = new RegExp(brandingPattern.source, 'gi');

    while ((match = pattern.exec(line)) !== null) {
      // Ensure "Cactus" is not part of "Cacti" (look ahead in surrounding text)
      const surrounding = line.substring(
        Math.max(0, match.index - 5),
        Math.min(line.length, match.index + match[0].length + 5)
      );
      if (/cacti/i.test(surrounding) && !/hyperledger cactus/i.test(surrounding)) {
        continue;
      }

      issues.push({
        type: 'Branding',
        severity: 'High',
        message: `Outdated reference: "${match[0]}"`,
        line: index + 1,
        context: line.trim().substring(0, 120),
      });
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Check B: Link Integrity
//
// Extracts all local markdown links and verifies their targets exist on disk.
// Ignores: http/https, mailto, and anchor-only links (#section).
// ---------------------------------------------------------------------------

async function checkLinks(
  lines: string[],
  filePath: string
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];

  // Matches [label](target) where target is NOT a URL, mailto, or anchor
  const linkPattern = /\[([^\]]+)\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    const pattern = new RegExp(linkPattern.source, 'g');

    while ((match = pattern.exec(line)) !== null) {
      const rawTarget = match[2].trim();

      // Strip anchor fragments before resolving the path
      const targetPath = rawTarget.split('#')[0];
      if (!targetPath) continue; // anchor-only after stripping

      const absoluteTarget = path.resolve(path.dirname(filePath), targetPath);

      const exists = await fs.pathExists(absoluteTarget);
      if (!exists) {
        issues.push({
          type: 'Link',
          severity: 'High',
          message: `Broken local link: "${rawTarget}"`,
          line: i + 1,
          context: line.trim().substring(0, 120),
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Check C: Required Sections
//
// Ensures primary documentation files contain the three baseline sections
// that are required for contributor onboarding and discoverability.
// ---------------------------------------------------------------------------

interface SectionRule {
  label: string;
  pattern: RegExp;
  severity: Severity;
}

const REQUIRED_SECTIONS: SectionRule[] = [
  {
    label: 'Getting Started',
    pattern: /^#+\s+.*getting\s+started/im,
    severity: 'Medium',
  },
  {
    label: 'Architecture',
    pattern: /^#+\s+.*architecture/im,
    severity: 'Medium',
  },
  {
    label: 'Contributing',
    pattern: /^#+\s+.*contributing/im,
    severity: 'Low',
  },
];

function checkSections(content: string, filePath: string): AuditIssue[] {
  if (!isPrimaryDoc(filePath)) return [];

  const issues: AuditIssue[] = [];

  for (const rule of REQUIRED_SECTIONS) {
    if (!rule.pattern.test(content)) {
      issues.push({
        type: 'Section',
        severity: rule.severity,
        message: `Missing required section: "${rule.label}"`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main audit entry point
// ---------------------------------------------------------------------------

export async function auditFile(
  filePath: string,
): Promise<FileAuditResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const [linkIssues, brandingIssues, sectionIssues] = await Promise.all([
    checkLinks(lines, filePath),
    Promise.resolve(checkBranding(lines)),
    Promise.resolve(checkSections(content, filePath)),
  ]);

  return {
    filePath,
    issues: [...brandingIssues, ...linkIssues, ...sectionIssues],
  };
}
