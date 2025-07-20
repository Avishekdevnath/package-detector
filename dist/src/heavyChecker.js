"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHeavyPackages = detectHeavyPackages;
exports.getHeavyPackagesInfo = getHeavyPackagesInfo;
exports.isPackageHeavy = isPackageHeavy;
exports.getSizeRecommendations = getSizeRecommendations;
const axios_1 = __importDefault(require("axios"));
const reporter_1 = require("./reporter");
const utils_1 = require("./utils");
/**
 * Detect heavy packages using Bundlephobia API
 */
function detectHeavyPackages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            reporter_1.reporter.printInfo('Checking for heavy packages using Bundlephobia...');
            // Get all dependencies
            const dependencies = (0, utils_1.getAllDependencies)();
            const dependencyNames = Object.keys(dependencies);
            if (dependencyNames.length === 0) {
                reporter_1.reporter.printInfo('No dependencies found in package.json');
                return;
            }
            const heavyPackages = [];
            const sizeThresholds = {
                small: 50 * 1024, // 50KB
                medium: 100 * 1024, // 100KB
                large: 500 * 1024 // 500KB
            };
            // Get existing unused packages to skip them
            const existingResults = reporter_1.reporter.getResults();
            const unusedPackages = existingResults.filter(r => r.type === 'unused').map(r => r.packageName);
            // Check each package
            for (const packageName of dependencyNames) {
                // Skip packages that are already detected as unused
                if (unusedPackages.includes(packageName)) {
                    continue;
                }
                try {
                    const bundleInfo = yield getBundlephobiaInfo(packageName);
                    if (bundleInfo) {
                        const gzipSize = bundleInfo.gzip;
                        let severity = 'low';
                        let message = '';
                        if (gzipSize > sizeThresholds.large) {
                            severity = 'high';
                            message = `Very large package: ${formatSize(gzipSize)} (gzipped)`;
                        }
                        else if (gzipSize > sizeThresholds.medium) {
                            severity = 'medium';
                            message = `Large package: ${formatSize(gzipSize)} (gzipped)`;
                        }
                        else if (gzipSize > sizeThresholds.small) {
                            severity = 'low';
                            message = `Medium package: ${formatSize(gzipSize)} (gzipped)`;
                        }
                        if (gzipSize > sizeThresholds.small) {
                            heavyPackages.push({
                                type: 'heavy',
                                packageName,
                                message,
                                severity,
                                metadata: {
                                    size: bundleInfo.size,
                                    gzip: bundleInfo.gzip,
                                    version: bundleInfo.version,
                                    description: bundleInfo.description
                                }
                            });
                        }
                    }
                    // Add a small delay to avoid rate limiting
                    yield new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    // Skip packages that can't be checked
                    console.warn(`Warning: Could not check size for ${packageName}: ${error}`);
                }
            }
            // Add results to reporter
            if (heavyPackages.length > 0) {
                reporter_1.reporter.addResults(heavyPackages);
                reporter_1.reporter.printInfo(`Found ${heavyPackages.length} heavy packages`);
            }
            else {
                reporter_1.reporter.printSuccess('No heavy packages found');
            }
        }
        catch (error) {
            reporter_1.reporter.printError(`Failed to detect heavy packages: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
/**
 * Get package information from Bundlephobia API
 */
function getBundlephobiaInfo(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const url = `https://bundlephobia.com/api/size?package=${encodeURIComponent(packageName)}`;
            const response = yield axios_1.default.get(url, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'package-detector/1.0.0'
                }
            });
            if (response.status === 200 && response.data) {
                return {
                    size: response.data.size || 0,
                    gzip: response.data.gzip || 0,
                    dependencySizes: response.data.dependencySizes || {},
                    name: response.data.name || packageName,
                    version: response.data.version || 'unknown',
                    description: response.data.description
                };
            }
            return null;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                    // Package not found on Bundlephobia
                    return null;
                }
                if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
                    // Rate limited
                    throw new Error('Rate limited by Bundlephobia API');
                }
            }
            throw error;
        }
    });
}
/**
 * Format file size in human readable format
 */
function formatSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
/**
 * Get detailed heavy package information
 */
function getHeavyPackagesInfo() {
    const dependencies = (0, utils_1.getAllDependencies)();
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
function isPackageHeavy(gzipSize, customThreshold) {
    const threshold = customThreshold || 100 * 1024; // Default 100KB
    return gzipSize > threshold;
}
/**
 * Get package size recommendations
 */
function getSizeRecommendations(gzipSize) {
    const recommendations = [];
    if (gzipSize > 500 * 1024) {
        recommendations.push('Consider using a lighter alternative');
        recommendations.push('Check if you need the full package or just specific modules');
    }
    else if (gzipSize > 100 * 1024) {
        recommendations.push('Consider tree-shaking to reduce bundle size');
        recommendations.push('Check if you can use dynamic imports for this package');
    }
    return recommendations;
}
