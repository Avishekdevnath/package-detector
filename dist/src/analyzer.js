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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectUnusedPackages = detectUnusedPackages;
exports.getPackageUsageAnalysis = getPackageUsageAnalysis;
const reporter_1 = require("./reporter");
const utils_1 = require("./utils");
// Define infrastructure packages that are needed for the project but not imported
const INFRASTRUCTURE_PACKAGES = {
    // Build tools
    'typescript': 'Build tool - needed for TypeScript compilation',
    'ts-node': 'Development tool - needed for running TypeScript directly',
    'webpack': 'Build tool - needed for bundling',
    // Testing frameworks
    'jest': 'Testing framework - needed for running tests',
    'ts-jest': 'TypeScript testing - needed for Jest TypeScript support',
    '@types/jest': 'Type definitions - needed for Jest TypeScript support',
    // Development tools
    'rimraf': 'Development tool - needed for clean script',
    // Type definitions (common patterns)
    '@types/node': 'Type definitions - needed for Node.js types',
    '@types/*': 'Type definitions - needed for TypeScript support'
};
/**
 * Check if a package is an infrastructure package
 */
function isInfrastructurePackage(packageName) {
    // Check exact matches
    if (INFRASTRUCTURE_PACKAGES[packageName]) {
        return { isInfra: true, reason: INFRASTRUCTURE_PACKAGES[packageName] };
    }
    // Check @types/* pattern
    if (packageName.startsWith('@types/')) {
        return { isInfra: true, reason: 'Type definitions - needed for TypeScript support' };
    }
    return { isInfra: false };
}
/**
 * Detect unused packages by comparing package.json dependencies with actual imports (optimized)
 */
function detectUnusedPackages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Clear caches at the start for fresh analysis
            (0, utils_1.clearCaches)();
            reporter_1.reporter.printInfo('Scanning project files for imports...');
            // Get all dependencies from package.json
            const dependencies = (0, utils_1.getAllDependencies)();
            const dependencyNames = Object.keys(dependencies);
            if (dependencyNames.length === 0) {
                reporter_1.reporter.printInfo('No dependencies found in package.json');
                return;
            }
            // Find all project files
            const projectFiles = (0, utils_1.findProjectFiles)();
            reporter_1.reporter.printInfo(`Found ${projectFiles.length} project files to analyze`);
            // Use batch checking for better performance
            const usageResults = (0, utils_1.batchCheckPackageUsage)(dependencyNames, projectFiles);
            // Process results
            const unusedPackages = [];
            const infrastructurePackages = [];
            for (const packageName of dependencyNames) {
                const isUsed = usageResults[packageName];
                if (!isUsed) {
                    const infraCheck = isInfrastructurePackage(packageName);
                    if (infraCheck.isInfra) {
                        // This is an infrastructure package - needed for project but not imported
                        infrastructurePackages.push({
                            type: 'unused',
                            packageName,
                            message: `Infrastructure package: ${infraCheck.reason}`,
                            severity: 'low',
                            metadata: {
                                category: 'infrastructure',
                                reason: infraCheck.reason
                            }
                        });
                    }
                    else {
                        // This is truly unused
                        unusedPackages.push({
                            type: 'unused',
                            packageName,
                            message: 'Not imported anywhere in the project',
                            severity: 'medium'
                        });
                    }
                }
            }
            // Add results to reporter
            const allResults = [...unusedPackages, ...infrastructurePackages];
            if (allResults.length > 0) {
                reporter_1.reporter.addResults(allResults);
                if (unusedPackages.length > 0) {
                    reporter_1.reporter.printInfo(`Found ${unusedPackages.length} truly unused packages`);
                }
                if (infrastructurePackages.length > 0) {
                    reporter_1.reporter.printInfo(`Found ${infrastructurePackages.length} infrastructure packages (needed for project but not imported)`);
                }
            }
            else {
                reporter_1.reporter.printSuccess('All packages are being used');
            }
            // If no truly unused packages found, show a success message
            if (unusedPackages.length === 0 && infrastructurePackages.length === 0) {
                reporter_1.reporter.printSuccess('✅ No unused packages found! All dependencies are being used.');
            }
            else if (unusedPackages.length === 0) {
                reporter_1.reporter.printSuccess('✅ No truly unused packages found! Only infrastructure packages detected.');
            }
        }
        catch (error) {
            reporter_1.reporter.printError(`Failed to detect unused packages: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
/**
 * Get detailed analysis of package usage
 */
function getPackageUsageAnalysis() {
    const dependencies = (0, utils_1.getAllDependencies)();
    const dependencyNames = Object.keys(dependencies);
    const projectFiles = (0, utils_1.findProjectFiles)();
    const usageStats = {};
    const usedPackages = [];
    const unusedPackages = [];
    const infrastructurePackages = [];
    for (const packageName of dependencyNames) {
        let importCount = 0;
        // Count imports across all files
        for (const file of projectFiles) {
            const imports = (0, utils_1.extractImports)(file);
            for (const imp of imports) {
                if (imp === packageName ||
                    imp.startsWith(packageName + '/') ||
                    (packageName.startsWith('@') && imp.startsWith(packageName))) {
                    importCount++;
                }
            }
        }
        const isUsed = importCount > 0;
        const infraCheck = isInfrastructurePackage(packageName);
        const isInfrastructure = infraCheck.isInfra;
        usageStats[packageName] = { used: isUsed, importCount, isInfrastructure };
        if (isUsed) {
            usedPackages.push(packageName);
        }
        else if (isInfrastructure) {
            infrastructurePackages.push(packageName);
        }
        else {
            unusedPackages.push(packageName);
        }
    }
    return {
        totalDependencies: dependencyNames.length,
        usedPackages,
        unusedPackages,
        infrastructurePackages,
        usageStats
    };
}
