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
exports.detectDuplicatePackages = detectDuplicatePackages;
exports.detectDuplicatePackagesFromLockfile = detectDuplicatePackagesFromLockfile;
exports.getDuplicatePackagesInfo = getDuplicatePackagesInfo;
const reporter_1 = require("./reporter");
const utils_1 = require("./utils");
/**
 * Detect duplicate packages using npm ls
 */
function detectDuplicatePackages() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            reporter_1.reporter.printInfo('Checking for duplicate packages...');
            // Get all dependencies
            const dependencies = (0, utils_1.getAllDependencies)();
            const dependencyNames = Object.keys(dependencies);
            if (dependencyNames.length === 0) {
                reporter_1.reporter.printInfo('No dependencies found in package.json');
                return;
            }
            // Run npm ls to get the dependency tree
            let npmOutput;
            try {
                npmOutput = (0, utils_1.executeNpmCommand)('npm ls --depth=0');
            }
            catch (error) {
                // npm ls might fail if there are missing dependencies, but we can still parse the output
                if (error instanceof Error && 'stderr' in error) {
                    npmOutput = error.stdout || '';
                }
                else {
                    throw error;
                }
            }
            // Parse the output to find duplicates
            const duplicates = findDuplicatePackages(npmOutput);
            // Convert to DetectionResult format
            const results = duplicates.map(dup => ({
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
                reporter_1.reporter.addResults(results);
                reporter_1.reporter.printInfo(`Found ${results.length} packages with duplicate versions`);
            }
            else {
                reporter_1.reporter.printSuccess('No duplicate packages found');
            }
        }
        catch (error) {
            reporter_1.reporter.printError(`Failed to detect duplicate packages: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
/**
 * Find duplicate packages in npm ls output
 */
function findDuplicatePackages(npmOutput) {
    const lines = npmOutput.split('\n');
    const packageVersions = {};
    const duplicates = [];
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
function detectDuplicatePackagesFromLockfile() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            reporter_1.reporter.printInfo('Checking for duplicate packages in package-lock.json...');
            const { readFileSync, existsSync } = require('fs');
            const packageLockPath = require('path').join(process.cwd(), 'package-lock.json');
            if (!existsSync(packageLockPath)) {
                reporter_1.reporter.printWarning('package-lock.json not found, skipping lockfile analysis');
                return;
            }
            const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
            const duplicates = findDuplicatesInLockfile(packageLock);
            // Convert to DetectionResult format
            const results = duplicates.map(dup => ({
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
                reporter_1.reporter.addResults(results);
                reporter_1.reporter.printInfo(`Found ${results.length} packages with duplicate versions in lockfile`);
            }
            else {
                reporter_1.reporter.printSuccess('No duplicate packages found in lockfile');
            }
        }
        catch (error) {
            reporter_1.reporter.printError(`Failed to detect duplicate packages from lockfile: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
/**
 * Find duplicates in package-lock.json
 */
function findDuplicatesInLockfile(packageLock) {
    const packageVersions = {};
    const duplicates = [];
    // Recursively scan dependencies
    function scanDependencies(deps) {
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
function getDuplicatePackagesInfo() {
    const dependencies = (0, utils_1.getAllDependencies)();
    const totalDependencies = Object.keys(dependencies).length;
    // This would need to be called after detectDuplicatePackages
    // For now, return empty structure
    return {
        totalDependencies,
        duplicatePackages: [],
        totalDuplicates: 0
    };
}
