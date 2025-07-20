import axios from 'axios';
import { reporter, DetectionResult } from './reporter';
import { getAllDependencies } from './utils';

// Cache for bundlephobia results to avoid repeated API calls
const bundlephobiaCache = new Map<string, BundlephobiaResult | null>();

export interface BundlephobiaResult {
  size: number;
  gzip: number;
  dependencySizes: Record<string, number>;
  name: string;
  version: string;
  description?: string;
}

/**
 * Clear bundlephobia cache
 */
export function clearBundlephobiaCache(): void {
  bundlephobiaCache.clear();
}

/**
 * Detect heavy packages using Bundlephobia API (optimized with parallel calls)
 */
export async function detectHeavyPackages(): Promise<void> {
  try {
    reporter.printInfo('Checking for heavy packages using Bundlephobia...');
    
    // Get all dependencies
    const dependencies = getAllDependencies();
    const dependencyNames = Object.keys(dependencies);
    
    if (dependencyNames.length === 0) {
      reporter.printInfo('No dependencies found in package.json');
      return;
    }
    
    const heavyPackages: DetectionResult[] = [];
    const sizeThresholds = {
      small: 50 * 1024,    // 50KB
      medium: 100 * 1024,  // 100KB
      large: 500 * 1024    // 500KB
    };
    
    // Get existing unused packages to skip them
    const existingResults = reporter.getResults();
    const unusedPackages = existingResults.filter(r => r.type === 'unused' && (!r.metadata?.category || r.metadata.category !== 'infrastructure')).map(r => r.packageName);
    
    // Filter out packages to check
    const packagesToCheck = dependencyNames.filter(pkg => !unusedPackages.includes(pkg));
    
    if (packagesToCheck.length === 0) {
      reporter.printSuccess('No packages to check for size');
      return;
    }
    
    // Process packages in parallel batches to avoid overwhelming the API
    const batchSize = 3; // Process 3 packages at a time
    const batches = [];
    
    for (let i = 0; i < packagesToCheck.length; i += batchSize) {
      batches.push(packagesToCheck.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (packageName) => {
        try {
          reporter.printInfo(`Checking size for ${packageName}...`);
          const bundleInfo = await getBundlephobiaInfo(packageName);
          
          if (bundleInfo) {
            const gzipSize = bundleInfo.gzip;
            let severity: 'low' | 'medium' | 'high' = 'low';
            let message = '';
            
            if (gzipSize > sizeThresholds.large) {
              severity = 'high';
              message = `Very large package: ${formatSize(gzipSize)} (gzipped)`;
            } else if (gzipSize > sizeThresholds.medium) {
              severity = 'medium';
              message = `Large package: ${formatSize(gzipSize)} (gzipped)`;
            } else if (gzipSize > sizeThresholds.small) {
              severity = 'low';
              message = `Medium package: ${formatSize(gzipSize)} (gzipped)`;
            }
            
            if (gzipSize > sizeThresholds.small) {
              return {
                type: 'heavy' as const,
                packageName,
                message,
                severity,
                metadata: {
                  size: bundleInfo.size,
                  gzip: bundleInfo.gzip,
                  version: bundleInfo.version,
                  description: bundleInfo.description
                }
              };
            }
          }
          
          return null;
        } catch (error) {
          // Skip packages that can't be checked
          console.warn(`Warning: Could not check size for ${packageName}: ${error}`);
          return null;
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add non-null results
      batchResults.forEach(result => {
        if (result) {
          heavyPackages.push(result);
        }
      });
      
      // Add a small delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Add results to reporter
    if (heavyPackages.length > 0) {
      reporter.addResults(heavyPackages);
      reporter.printInfo(`Found ${heavyPackages.length} heavy packages`);
    } else {
      reporter.printSuccess('No heavy packages found');
    }
    
  } catch (error) {
    reporter.printError(`Failed to detect heavy packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get package information from Bundlephobia API (with caching)
 */
async function getBundlephobiaInfo(packageName: string): Promise<BundlephobiaResult | null> {
  // Check cache first
  if (bundlephobiaCache.has(packageName)) {
    return bundlephobiaCache.get(packageName)!;
  }
  
  try {
    const url = `https://bundlephobia.com/api/size?package=${encodeURIComponent(packageName)}`;
    const response = await axios.get(url, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'package-detector/1.0.0'
      }
    });
    
    if (response.status === 200 && response.data) {
      const result = {
        size: response.data.size || 0,
        gzip: response.data.gzip || 0,
        dependencySizes: response.data.dependencySizes || {},
        name: response.data.name || packageName,
        version: response.data.version || 'unknown',
        description: response.data.description
      };
      
      // Cache the result
      bundlephobiaCache.set(packageName, result);
      return result;
    }
    
    // Cache null result
    bundlephobiaCache.set(packageName, null);
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // Package not found on Bundlephobia
        bundlephobiaCache.set(packageName, null);
        return null;
      }
      if (error.response?.status === 429) {
        // Rate limited
        throw new Error('Rate limited by Bundlephobia API');
      }
      if (error.code === 'ECONNABORTED') {
        // Timeout
        throw new Error('Request timeout');
      }
    }
    throw error;
  }
}

/**
 * Format file size in human readable format
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get detailed heavy package information
 */
export function getHeavyPackagesInfo(): {
  totalDependencies: number;
  heavyPackages: Array<{ packageName: string; size: number; gzip: number }>;
  sizeBreakdown: { small: number; medium: number; large: number };
} {
  const dependencies = getAllDependencies();
  const totalDependencies = Object.keys(dependencies).length;
  
  // This would need to be called after detectHeavyPackages
  // For now, return empty structure
  return {
    totalDependencies,
    heavyPackages: [],
    sizeBreakdown: { small: 0, medium: 0, large: 0 }
  };
}

/**
 * Check if a package is considered heavy based on size thresholds
 */
export function isPackageHeavy(gzipSize: number, customThreshold?: number): boolean {
  const threshold = customThreshold || 100 * 1024; // Default 100KB
  return gzipSize > threshold;
}

/**
 * Get package size recommendations
 */
export function getSizeRecommendations(gzipSize: number): string[] {
  const recommendations: string[] = [];
  
  if (gzipSize > 500 * 1024) {
    recommendations.push('Consider using a lighter alternative');
    recommendations.push('Check if you need the full package or just specific modules');
  } else if (gzipSize > 100 * 1024) {
    recommendations.push('Consider tree-shaking to reduce bundle size');
    recommendations.push('Check if you can use dynamic imports for this package');
  }
  
  return recommendations;
}
