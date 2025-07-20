import { reporter, DetectionResult } from './reporter';
import { executeNpmCommand, parseNpmOutdated, getAllDependencies } from './utils';

/**
 * Detect outdated packages using npm outdated
 */
export async function detectOutdatedPackages(): Promise<void> {
  try {
    reporter.printInfo('Checking for outdated packages...');
    
    // Get all dependencies
    const dependencies = getAllDependencies();
    const dependencyNames = Object.keys(dependencies);
    
    if (dependencyNames.length === 0) {
      reporter.printInfo('No dependencies found in package.json');
      return;
    }
    
    // Run npm outdated
    let npmOutput: string;
    try {
      npmOutput = executeNpmCommand('npm outdated --json');
    } catch (error) {
      // npm outdated returns non-zero exit code when there are outdated packages
      // We need to capture the output even when it fails
      if (error instanceof Error && 'stdout' in error) {
        npmOutput = (error as any).stdout || '';
      } else {
        throw error;
      }
    }
    
    // Parse the output
    let outdatedPackages: any[] = [];
    
    try {
      // Try to parse as JSON first (npm outdated --json)
      if (npmOutput.trim()) {
        const jsonOutput = JSON.parse(npmOutput);
        outdatedPackages = Object.entries(jsonOutput).map(([packageName, data]: [string, any]) => ({
          package: packageName,
          current: data.current,
          wanted: data.wanted,
          latest: data.latest,
          location: data.location || 'unknown'
        }));
      }
    } catch {
      // Fallback to text parsing
      try {
        const textOutput = executeNpmCommand('npm outdated');
        if (textOutput.trim()) {
          outdatedPackages = parseNpmOutdated(textOutput);
        }
      } catch (textError) {
        // If both JSON and text parsing fail, try a different approach
        reporter.printWarning('Could not parse npm outdated output, trying alternative method...');
        outdatedPackages = await checkOutdatedPackagesAlternative();
      }
    }
    
    // Convert to DetectionResult format
    const results: DetectionResult[] = outdatedPackages.map(pkg => ({
      type: 'outdated',
      packageName: pkg.package,
      message: `Current: ${pkg.current}, Latest: ${pkg.latest}`,
      severity: getOutdatedSeverity(pkg.current, pkg.latest),
      metadata: {
        current: pkg.current,
        wanted: pkg.wanted,
        latest: pkg.latest,
        location: pkg.location
      }
    }));
    
    // Add results to reporter
    if (results.length > 0) {
      reporter.addResults(results);
      reporter.printInfo(`Found ${results.length} outdated packages`);
    } else {
      reporter.printSuccess('All packages are up to date');
    }
    
  } catch (error) {
    reporter.printError(`Failed to detect outdated packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Alternative method to check for outdated packages
 * This method checks each package individually
 */
async function checkOutdatedPackagesAlternative(): Promise<any[]> {
  const dependencies = getAllDependencies();
  const results: any[] = [];
  
  for (const [packageName, currentVersion] of Object.entries(dependencies)) {
    try {
      // Get latest version from npm
      const latestVersion = executeNpmCommand(`npm view ${packageName} version`).trim();
      
      if (latestVersion && latestVersion !== currentVersion) {
        results.push({
          package: packageName,
          current: currentVersion,
          wanted: currentVersion, // We don't know the wanted version
          latest: latestVersion,
          location: 'unknown'
        });
      }
    } catch (error) {
      // Skip packages that can't be checked
      console.warn(`Warning: Could not check version for ${packageName}: ${error}`);
    }
  }
  
  return results;
}

/**
 * Determine severity of outdated package
 */
function getOutdatedSeverity(current: string, latest: string): 'low' | 'medium' | 'high' {
  try {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    // Major version difference = high severity
    if (latestParts[0] > currentParts[0]) {
      return 'high';
    }
    
    // Minor version difference = medium severity
    if (latestParts[1] > currentParts[1]) {
      return 'medium';
    }
    
    // Patch version difference = low severity
    if (latestParts[2] > currentParts[2]) {
      return 'low';
    }
    
    return 'low';
  } catch {
    // If version parsing fails, assume medium severity
    return 'medium';
  }
}

/**
 * Get detailed outdated package information
 */
export function getOutdatedPackagesInfo(): {
  totalDependencies: number;
  outdatedPackages: any[];
  severityBreakdown: { low: number; medium: number; high: number };
} {
  const dependencies = getAllDependencies();
  const totalDependencies = Object.keys(dependencies).length;
  
  // This would need to be called after detectOutdatedPackages
  // For now, return empty structure
  return {
    totalDependencies,
    outdatedPackages: [],
    severityBreakdown: { low: 0, medium: 0, high: 0 }
  };
}
