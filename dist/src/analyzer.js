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
/**
 * Detect unused packages by comparing package.json dependencies with actual imports
 */
function detectUnusedPackages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
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
            // Check each dependency
            const unusedPackages = [];
            for (const packageName of dependencyNames) {
                const isUsed = (0, utils_1.isPackageUsed)(packageName, projectFiles);
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
                reporter_1.reporter.addResults(unusedPackages);
                reporter_1.reporter.printInfo(`Found ${unusedPackages.length} unused packages`);
            }
            else {
                reporter_1.reporter.printSuccess('All packages are being used');
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
    for (const packageName of dependencyNames) {
        let importCount = 0;
        // Count imports across all files
        for (const file of projectFiles) {
            const imports = (0, utils_2.extractImports)(file);
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
        }
        else {
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
const utils_2 = require("./utils");
