import { reporter, DetectionResult } from './reporter';
import { executeNpmCommand, parseNpmLs, getAllDependencies } from './utils';

/**
 * Detect duplicate packages using npm ls
 */
export async function detectDuplicatePackages(): Promise<void> {
  try {
    reporter.printInfo('Checking for duplicate packages...');
    
    // Get all dependencies
    const dependencies = getAllDependencies();
    const dependencyNames = Object.keys(dependencies);
    
    if (dependencyNames.length === 0) {
      reporter.printInfo('No dependencies found in package.json');
      return;
    }
    
    // Run npm ls to get the dependency tree
    let npmOutput: string;
    try {
      npmOutput = executeNpmCommand('npm ls --depth=0');
    } catch (error) {
      // npm ls might fail if there are missing dependencies, but we can still parse the output
      if (error instanceof Error && 'stderr' in error) {
        npmOutput = (error as any).stdout || '';
      } else {
        throw error;
      }
    }
    
    // Parse the output to find duplicates
    const duplicates = findDuplicatePackages(npmOutput);
    
    // Convert to DetectionResult format
    const results: DetectionResult[] = duplicates.map(dup => ({
      type: 'duplicate',
      packageName: dup.packageName,
      message: `Multiple versions: ${dup.versions.join(', ')}`,
      severity: dup.versions.length > 2 ? 'high' : 'medium',
      metadata: {
        versions: dup.versions,
        count: dup.versions.length
      }
    }));
    
    // Add results to reporter
    if (results.length > 0) {
      reporter.addResults(results);
      reporter.printInfo(`Found ${results.length} packages with duplicate versions`);
    } else {
      reporter.printSuccess('No duplicate packages found');
    }
    
  } catch (error) {
    reporter.printError(`Failed to detect duplicate packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find duplicate packages in npm ls output
 */
function findDuplicatePackages(npmOutput: string): Array<{ packageName: string; versions: string[] }> {
  const lines = npmOutput.split('\n');
  const packageVersions: Record<string, Set<string>> = {};
  const duplicates: Array<{ packageName: string; versions: string[] }> = [];
  
  // Parse each line to extract package names and versions
  for (const line of lines) {
    // Match patterns like:
    // ├── package@version
    // └── package@version
    // ├─┬ package@version
    const match = line.match(/^[├└]─+\s+([^@]+)@([^\s]+)/);
    if (match) {
      const packageName = match[1];
      const version = match[2];
      
      if (!packageVersions[packageName]) {
        packageVersions[packageName] = new Set();
      }
      packageVersions[packageName].add(version);
    }
  }
  
  // Find packages with multiple versions
  for (const [packageName, versions] of Object.entries(packageVersions)) {
    if (versions.size > 1) {
      duplicates.push({
        packageName,
        versions: Array.from(versions)
      });
    }
  }
  
  return duplicates;
}

/**
 * Alternative method to detect duplicates using package-lock.json
 */
export async function detectDuplicatePackagesFromLockfile(): Promise<void> {
  try {
    reporter.printInfo('Checking for duplicate packages in package-lock.json...');
    
    const { readFileSync, existsSync } = require('fs');
    const packageLockPath = require('path').join(process.cwd(), 'package-lock.json');
    
    if (!existsSync(packageLockPath)) {
      reporter.printWarning('package-lock.json not found, skipping lockfile analysis');
      return;
    }
    
    const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
    const duplicates = findDuplicatesInLockfile(packageLock);
    
    // Convert to DetectionResult format
    const results: DetectionResult[] = duplicates.map(dup => ({
      type: 'duplicate',
      packageName: dup.packageName,
      message: `Multiple versions in lockfile: ${dup.versions.join(', ')}`,
      severity: dup.versions.length > 2 ? 'high' : 'medium',
      metadata: {
        versions: dup.versions,
        count: dup.versions.length,
        source: 'package-lock.json'
      }
    }));
    
    // Add results to reporter
    if (results.length > 0) {
      reporter.addResults(results);
      reporter.printInfo(`Found ${results.length} packages with duplicate versions in lockfile`);
    } else {
      reporter.printSuccess('No duplicate packages found in lockfile');
    }
    
  } catch (error) {
    reporter.printError(`Failed to detect duplicate packages from lockfile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find duplicates in package-lock.json
 */
function findDuplicatesInLockfile(packageLock: any): Array<{ packageName: string; versions: string[] }> {
  const packageVersions: Record<string, Set<string>> = {};
  const duplicates: Array<{ packageName: string; versions: string[] }> = [];
  
  // Recursively scan dependencies
  function scanDependencies(deps: Record<string, any>): void {
    for (const [packageName, depInfo] of Object.entries(deps)) {
      if (depInfo.version) {
        if (!packageVersions[packageName]) {
          packageVersions[packageName] = new Set();
        }
        packageVersions[packageName].add(depInfo.version);
      }
      
      // Recursively check nested dependencies
      if (depInfo.dependencies) {
        scanDependencies(depInfo.dependencies);
      }
    }
  }
  
  if (packageLock.dependencies) {
    scanDependencies(packageLock.dependencies);
  }
  
  // Find packages with multiple versions
  for (const [packageName, versions] of Object.entries(packageVersions)) {
    if (versions.size > 1) {
      duplicates.push({
        packageName,
        versions: Array.from(versions)
      });
    }
  }
  
  return duplicates;
}

/**
 * Get detailed duplicate package information
 */
export function getDuplicatePackagesInfo(): {
  totalDependencies: number;
  duplicatePackages: Array<{ packageName: string; versions: string[] }>;
  totalDuplicates: number;
} {
  const dependencies = getAllDependencies();
  const totalDependencies = Object.keys(dependencies).length;
  
  // This would need to be called after detectDuplicatePackages
  // For now, return empty structure
  return {
    totalDependencies,
    duplicatePackages: [],
    totalDuplicates: 0
  };
}
