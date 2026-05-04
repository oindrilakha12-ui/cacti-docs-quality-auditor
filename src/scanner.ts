// scanner.ts
// Discovers markdown files across the Cacti repository using glob patterns.
// Excludes auto-generated directories (generated/, openapi/) to prevent false positives.simport { glob } from 'glob';
import path from 'path';

/**
 * Discovers all markdown files relevant to the partial scan strategy.
 *
 * Scope:
 *   - Root-level .md files (e.g., README.md, CHANGELOG.md, CONTRIBUTING.md)
 *   - All .md files under the /docs directory
 *
 * Exclusions:
 *   - Auto-generated API client directories (generated/, openapi/)
 *   - Proto-generated files
 *   - node_modules and .git
 */
export async function findMarkdownFiles(rootDir: string): Promise<string[]> {
  const patterns = [
    '*.md',
    'docs/**/*.md',
  ];

  const ignore = [
    'node_modules/**',
    '.git/**',
    '**/generated/**',
    '**/openapi/**',
    '**/src/main/proto/generated/**',
  ];

  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore,
      absolute: true,
      nodir: true,
    });
    allFiles.push(...matches);
  }

  // Deduplicate in case of overlapping patterns
  return [...new Set(allFiles)].sort();
}

/**
 * Returns a short, display-friendly label for the scan scope.
 */
export function getScanScopeLabel(): string {
  return 'Partial Scan: /docs directory and root-level markdown files';
}
