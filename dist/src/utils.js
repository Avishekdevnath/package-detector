"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCaches = clearCaches;
exports.readPackageJson = readPackageJson;
exports.getAllDependencies = getAllDependencies;
exports.findProjectFiles = findProjectFiles;
exports.extractImports = extractImports;
exports.executeNpmCommand = executeNpmCommand;
exports.parseNpmOutdated = parseNpmOutdated;
exports.parseNpmLs = parseNpmLs;
exports.isPackageUsed = isPackageUsed;
exports.batchCheckPackageUsage = batchCheckPackageUsage;
exports.getPackageNameWithoutScope = getPackageNameWithoutScope;
exports.isScopedPackage = isScopedPackage;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
// Performance optimization: Cache for file content and imports
const fileContentCache = new Map();
const importCache = new Map();
const packageUsageCache = new Map();
/**
 * Clear all caches (useful for testing or memory management)
 */
function clearCaches() {
    fileContentCache.clear();
    importCache.clear();
    packageUsageCache.clear();
}
/**
 * Read and parse package.json file
 */
function readPackageJson() {
    const packagePath = (0, path_1.join)(process.cwd(), 'package.json');
    if (!(0, fs_1.existsSync)(packagePath)) {
        throw new Error('package.json not found in current directory');
    }
    try {
        const content = (0, fs_1.readFileSync)(packagePath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error(`Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Get all dependencies from package.json (including dev, peer, optional)
 */
function getAllDependencies() {
    const pkg = readPackageJson();
    const allDeps = {};
    // Merge all dependency types
    if (pkg.dependencies)
        Object.assign(allDeps, pkg.dependencies);
    if (pkg.devDependencies)
        Object.assign(allDeps, pkg.devDependencies);
    if (pkg.peerDependencies)
        Object.assign(allDeps, pkg.peerDependencies);
    if (pkg.optionalDependencies)
        Object.assign(allDeps, pkg.optionalDependencies);
    return allDeps;
}
/**
 * Find all project files that might contain imports (optimized)
 */
function findProjectFiles(dir = process.cwd(), extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'], excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.cache']) {
    const files = [];
    const excludeSet = new Set(excludeDirs); // Use Set for O(1) lookup
    function scanDirectory(currentDir, depth = 0) {
        // Limit recursion depth to prevent stack overflow on deep directories
        if (depth > 20)
            return;
        try {
            const items = (0, fs_1.readdirSync)(currentDir);
            for (const item of items) {
                const fullPath = (0, path_1.join)(currentDir, item);
                try {
                    const stat = (0, fs_1.statSync)(fullPath);
                    if (stat.isDirectory()) {
                        // Skip excluded directories
                        if (!excludeSet.has(item)) {
                            scanDirectory(fullPath, depth + 1);
                        }
                    }
                    else if (stat.isFile()) {
                        // Check if file has a relevant extension
                        const ext = (0, path_1.extname)(item).toLowerCase();
                        if (extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
                catch (error) {
                    // Skip files/directories we can't access
                    continue;
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
            console.warn(`Warning: Could not read directory ${currentDir}: ${error}`);
        }
    }
    scanDirectory(dir);
    return files;
}
/**
 * Extract import/require statements from a file (optimized with caching)
 */
function extractImports(filePath) {
    // Check cache first
    if (importCache.has(filePath)) {
        return importCache.get(filePath);
    }
    try {
        const content = (0, fs_1.readFileSync)(filePath, 'utf8');
        const imports = [];
        // Optimized regex patterns - compile once and reuse
        const es6ImportPattern = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g;
        const commonjsPattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        // Match ES6 imports
        let match;
        while ((match = es6ImportPattern.exec(content)) !== null) {
            imports.push(match[1]);
        }
        // Match CommonJS requires
        while ((match = commonjsPattern.exec(content)) !== null) {
            imports.push(match[1]);
        }
        // Cache the result
        importCache.set(filePath, imports);
        return imports;
    }
    catch (error) {
        console.warn(`Warning: Could not read file ${filePath}: ${error}`);
        importCache.set(filePath, []); // Cache empty result
        return [];
    }
}
/**
 * Execute npm command and return result
 */
function executeNpmCommand(command) {
    try {
        return (0, child_process_1.execSync)(command, {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }
    catch (error) {
        // npm outdated returns non-zero exit code when there are outdated packages
        // but still produces valid output in stdout
        if (error instanceof Error && 'stdout' in error && error.stdout) {
            return error.stdout;
        }
        if (error instanceof Error && 'stderr' in error) {
            throw new Error(`npm command failed: ${error.stderr}`);
        }
        throw new Error(`npm command failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Parse npm outdated output
 */
function parseNpmOutdated(output) {
    const lines = output.trim().split('\n');
    const results = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
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
function parseNpmLs(output) {
    const lines = output.trim().split('\n');
    const results = [];
    // Look for lines with package names and versions
    // Match any line that contains a package name followed by @ and version
    for (const line of lines) {
        const match = line.match(/([^@\s]+)@([^\s]+)/);
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
 * Check if a package is used in the project (optimized with caching and early termination)
 */
function isPackageUsed(packageName, projectFiles) {
    // Check cache first
    const cacheKey = `${packageName}:${projectFiles.length}`;
    if (packageUsageCache.has(cacheKey)) {
        return packageUsageCache.get(cacheKey);
    }
    // Pre-compile regex patterns for better performance
    const exactMatchPattern = new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const prefixPattern = new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
    const scopedPattern = packageName.startsWith('@') ? new RegExp(`^${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : null;
    for (const file of projectFiles) {
        const imports = extractImports(file);
        for (const imp of imports) {
            // Check exact match
            if (exactMatchPattern.test(imp)) {
                packageUsageCache.set(cacheKey, true);
                return true;
            }
            // Check if package is a prefix (for sub-modules)
            if (prefixPattern.test(imp)) {
                packageUsageCache.set(cacheKey, true);
                return true;
            }
            // Check scoped packages
            if (scopedPattern && scopedPattern.test(imp)) {
                packageUsageCache.set(cacheKey, true);
                return true;
            }
        }
    }
    packageUsageCache.set(cacheKey, false);
    return false;
}
/**
 * Batch check multiple packages for usage (optimized)
 */
function batchCheckPackageUsage(packageNames, projectFiles) {
    const results = {};
    // Pre-extract all imports from all files once
    const allImports = new Set();
    for (const file of projectFiles) {
        const imports = extractImports(file);
        imports.forEach(imp => allImports.add(imp));
    }
    // Check each package against the pre-extracted imports
    for (const packageName of packageNames) {
        const cacheKey = `${packageName}:${projectFiles.length}`;
        if (packageUsageCache.has(cacheKey)) {
            results[packageName] = packageUsageCache.get(cacheKey);
            continue;
        }
        let isUsed = false;
        // Check exact match
        if (allImports.has(packageName)) {
            isUsed = true;
        }
        else {
            // Check prefix matches
            for (const imp of allImports) {
                if (imp.startsWith(packageName + '/')) {
                    isUsed = true;
                    break;
                }
                // Check scoped packages
                if (packageName.startsWith('@') && imp.startsWith(packageName)) {
                    isUsed = true;
                    break;
                }
            }
        }
        results[packageName] = isUsed;
        packageUsageCache.set(cacheKey, isUsed);
    }
    return results;
}
/**
 * Get package name without scope
 */
function getPackageNameWithoutScope(packageName) {
    return packageName.replace(/^@[^/]+\//, '');
}
/**
 * Check if a package is a scoped package
 */
function isScopedPackage(packageName) {
    return packageName.startsWith('@');
}
