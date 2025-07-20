import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface NpmOutdatedResult {
  package: string;
  current: string;
  wanted: string;
  latest: string;
  location: string;
}

export interface NpmLsResult {
  name: string;
  version: string;
  dependencies?: Record<string, NpmLsResult>;
}

export interface BundlephobiaResult {
  size: number;
  gzip: number;
  dependencySizes: Record<string, number>;
}

/**
 * Read and parse package.json file
 */
export function readPackageJson(): PackageJson {
  const packagePath = join(process.cwd(), 'package.json');
  
  if (!existsSync(packagePath)) {
    throw new Error('package.json not found in current directory');
  }
  
  try {
    const content = readFileSync(packagePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all dependencies from package.json (including dev, peer, optional)
 */
export function getAllDependencies(): Record<string, string> {
  const pkg = readPackageJson();
  const allDeps: Record<string, string> = {};
  
  // Merge all dependency types
  if (pkg.dependencies) Object.assign(allDeps, pkg.dependencies);
  if (pkg.devDependencies) Object.assign(allDeps, pkg.devDependencies);
  if (pkg.peerDependencies) Object.assign(allDeps, pkg.peerDependencies);
  if (pkg.optionalDependencies) Object.assign(allDeps, pkg.optionalDependencies);
  
  return allDeps;
}

/**
 * Find all project files that might contain imports
 */
export function findProjectFiles(
  dir: string = process.cwd(),
  extensions: string[] = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
  excludeDirs: string[] = ['node_modules', '.git', 'dist', 'build', 'coverage']
): string[] {
  const files: string[] = [];
  
  function scanDirectory(currentDir: string): void {
    try {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!excludeDirs.includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Check if file has a relevant extension
          const ext = extname(item).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Warning: Could not read directory ${currentDir}: ${error}`);
    }
  }
  
  scanDirectory(dir);
  return files;
}

/**
 * Extract import/require statements from a file
 */
export function extractImports(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf8');
    const imports: string[] = [];
    
    // Match ES6 imports: import x from 'y', import {x} from 'y', import * as x from 'y'
    const es6Imports = content.match(/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g);
    if (es6Imports) {
      es6Imports.forEach(imp => {
        const match = imp.match(/['"`]([^'"`]+)['"`]/);
        if (match) imports.push(match[1]);
      });
    }
    
    // Match CommonJS requires: require('x'), require("x")
    const commonjsImports = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    if (commonjsImports) {
      commonjsImports.forEach(imp => {
        const match = imp.match(/['"`]([^'"`]+)['"`]/);
        if (match) imports.push(match[1]);
      });
    }
    
    return imports;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error}`);
    return [];
  }
}

/**
 * Execute npm command and return result
 */
export function executeNpmCommand(command: string): string {
  try {
    return execSync(command, { 
      cwd: process.cwd(), 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    // npm outdated returns non-zero exit code when there are outdated packages
    // but still produces valid output in stdout
    if (error instanceof Error && 'stdout' in error && (error as any).stdout) {
      return (error as any).stdout;
    }
    if (error instanceof Error && 'stderr' in error) {
      throw new Error(`npm command failed: ${(error as any).stderr}`);
    }
    throw new Error(`npm command failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse npm outdated output
 */
export function parseNpmOutdated(output: string): NpmOutdatedResult[] {
  const lines = output.trim().split('\n');
  const results: NpmOutdatedResult[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse line: package current wanted latest location
    const parts = line.split(/\s+/);
    if (parts.length >= 5) {
      results.push({
        package: parts[0],
        current: parts[1],
        wanted: parts[2],
        latest: parts[3],
        location: parts[4]
      });
    }
  }
  
  return results;
}

/**
 * Parse npm ls output (simplified)
 */
export function parseNpmLs(output: string): NpmLsResult[] {
  const lines = output.trim().split('\n');
  const results: NpmLsResult[] = [];
  
  // Look for lines with package names and versions
  for (const line of lines) {
    const match = line.match(/^[├└]─\s+([^@]+)@([^\s]+)/);
    if (match) {
      results.push({
        name: match[1],
        version: match[2]
      });
    }
  }
  
  return results;
}

/**
 * Check if a package is used in the project
 */
export function isPackageUsed(packageName: string, projectFiles: string[]): boolean {
  for (const file of projectFiles) {
    const imports = extractImports(file);
    
    for (const imp of imports) {
      // Check exact match
      if (imp === packageName) return true;
      
      // Check if package is a prefix (for sub-modules)
      if (imp.startsWith(packageName + '/')) return true;
      
      // Check scoped packages
      if (packageName.startsWith('@') && imp.startsWith(packageName)) return true;
    }
  }
  
  return false;
}

/**
 * Get package name without scope
 */
export function getPackageNameWithoutScope(packageName: string): string {
  return packageName.replace(/^@[^/]+\//, '');
}

/**
 * Check if a package is a scoped package
 */
export function isScopedPackage(packageName: string): boolean {
  return packageName.startsWith('@');
}
