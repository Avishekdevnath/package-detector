import { reporter, DetectionResult } from './reporter';
import { 
  getAllDependencies, 
  findProjectFiles, 
  isPackageUsed,
  getPackageNameWithoutScope 
} from './utils';

/**
 * Detect unused packages by comparing package.json dependencies with actual imports
 */
export async function detectUnusedPackages(): Promise<void> {
  try {
    reporter.printInfo('Scanning project files for imports...');
    
    // Get all dependencies from package.json
    const dependencies = getAllDependencies();
    const dependencyNames = Object.keys(dependencies);
    
    if (dependencyNames.length === 0) {
      reporter.printInfo('No dependencies found in package.json');
      return;
    }
    
    // Find all project files
    const projectFiles = findProjectFiles();
    reporter.printInfo(`Found ${projectFiles.length} project files to analyze`);
    
    // Check each dependency
    const unusedPackages: DetectionResult[] = [];
    
    for (const packageName of dependencyNames) {
      const isUsed = isPackageUsed(packageName, projectFiles);
      
      if (!isUsed) {
        unusedPackages.push({
          type: 'unused',
          packageName,
          message: 'Not imported anywhere in the project',
          severity: 'medium'
        });
      }
    }
    
    // Add results to reporter
    if (unusedPackages.length > 0) {
      reporter.addResults(unusedPackages);
      reporter.printInfo(`Found ${unusedPackages.length} unused packages`);
    } else {
      reporter.printSuccess('All packages are being used');
    }
    
  } catch (error) {
    reporter.printError(`Failed to detect unused packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get detailed analysis of package usage
 */
export function getPackageUsageAnalysis(): {
  totalDependencies: number;
  usedPackages: string[];
  unusedPackages: string[];
  usageStats: Record<string, { used: boolean; importCount: number }>;
} {
  const dependencies = getAllDependencies();
  const dependencyNames = Object.keys(dependencies);
  const projectFiles = findProjectFiles();
  
  const usageStats: Record<string, { used: boolean; importCount: number }> = {};
  const usedPackages: string[] = [];
  const unusedPackages: string[] = [];
  
  for (const packageName of dependencyNames) {
    let importCount = 0;
    
    // Count imports across all files
    for (const file of projectFiles) {
      const imports = extractImports(file);
      for (const imp of imports) {
        if (imp === packageName || 
            imp.startsWith(packageName + '/') || 
            (packageName.startsWith('@') && imp.startsWith(packageName))) {
          importCount++;
        }
      }
    }
    
    const isUsed = importCount > 0;
    usageStats[packageName] = { used: isUsed, importCount };
    
    if (isUsed) {
      usedPackages.push(packageName);
    } else {
      unusedPackages.push(packageName);
    }
  }
  
  return {
    totalDependencies: dependencyNames.length,
    usedPackages,
    unusedPackages,
    usageStats
  };
}

// Import the extractImports function from utils
import { extractImports } from './utils';
