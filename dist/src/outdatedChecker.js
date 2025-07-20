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
exports.detectOutdatedPackages = detectOutdatedPackages;
exports.getOutdatedPackagesInfo = getOutdatedPackagesInfo;
const reporter_1 = require("./reporter");
const utils_1 = require("./utils");
/**
 * Detect outdated packages using npm outdated
 */
function detectOutdatedPackages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            reporter_1.reporter.printInfo('Checking for outdated packages...');
            // Get all dependencies
            const dependencies = (0, utils_1.getAllDependencies)();
            const dependencyNames = Object.keys(dependencies);
            if (dependencyNames.length === 0) {
                reporter_1.reporter.printInfo('No dependencies found in package.json');
                return;
            }
            // Run npm outdated
            let npmOutput;
            try {
                npmOutput = (0, utils_1.executeNpmCommand)('npm outdated --json');
            }
            catch (error) {
                // npm outdated returns non-zero exit code when there are outdated packages
                // We need to capture the output even when it fails
                if (error instanceof Error && 'stdout' in error) {
                    npmOutput = error.stdout || '';
                }
                else {
                    throw error;
                }
            }
            // Parse the output
            let outdatedPackages = [];
            try {
                // Try to parse as JSON first (npm outdated --json)
                if (npmOutput.trim()) {
                    const jsonOutput = JSON.parse(npmOutput);
                    outdatedPackages = Object.entries(jsonOutput).map(([packageName, data]) => ({
                        package: packageName,
                        current: data.current,
                        wanted: data.wanted,
                        latest: data.latest,
                        location: data.location || 'unknown'
                    }));
                }
            }
            catch (_a) {
                // Fallback to text parsing
                try {
                    const textOutput = (0, utils_1.executeNpmCommand)('npm outdated');
                    if (textOutput.trim()) {
                        outdatedPackages = (0, utils_1.parseNpmOutdated)(textOutput);
                    }
                }
                catch (textError) {
                    // If both JSON and text parsing fail, try a different approach
                    reporter_1.reporter.printWarning('Could not parse npm outdated output, trying alternative method...');
                    outdatedPackages = yield checkOutdatedPackagesAlternative();
                }
            }
            // Convert to DetectionResult format
            const results = outdatedPackages.map(pkg => ({
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
                reporter_1.reporter.addResults(results);
                reporter_1.reporter.printInfo(`Found ${results.length} outdated packages`);
            }
            else {
                reporter_1.reporter.printSuccess('All packages are up to date');
            }
        }
        catch (error) {
            reporter_1.reporter.printError(`Failed to detect outdated packages: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
/**
 * Alternative method to check for outdated packages
 * This method checks each package individually
 */
function checkOutdatedPackagesAlternative() {
    return __awaiter(this, void 0, void 0, function* () {
        const dependencies = (0, utils_1.getAllDependencies)();
        const results = [];
        for (const [packageName, currentVersion] of Object.entries(dependencies)) {
            try {
                // Get latest version from npm
                const latestVersion = (0, utils_1.executeNpmCommand)(`npm view ${packageName} version`).trim();
                if (latestVersion && latestVersion !== currentVersion) {
                    results.push({
                        package: packageName,
                        current: currentVersion,
                        wanted: currentVersion, // We don't know the wanted version
                        latest: latestVersion,
                        location: 'unknown'
                    });
                }
            }
            catch (error) {
                // Skip packages that can't be checked
                console.warn(`Warning: Could not check version for ${packageName}: ${error}`);
            }
        }
        return results;
    });
}
/**
 * Determine severity of outdated package
 */
function getOutdatedSeverity(current, latest) {
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
    }
    catch (_a) {
        // If version parsing fails, assume medium severity
        return 'medium';
    }
}
/**
 * Get detailed outdated package information
 */
function getOutdatedPackagesInfo() {
    const dependencies = (0, utils_1.getAllDependencies)();
    const totalDependencies = Object.keys(dependencies).length;
    // This would need to be called after detectOutdatedPackages
    // For now, return empty structure
    return {
        totalDependencies,
        outdatedPackages: [],
        severityBreakdown: { low: 0, medium: 0, high: 0 }
    };
}
