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
exports.GitHubIntegration = void 0;
const rest_1 = require("@octokit/rest");
const simple_git_1 = require("simple-git");
const reporter_1 = require("./reporter");
const utils_1 = require("./utils");
/**
 * GitHub Integration for Package Detector
 */
class GitHubIntegration {
    constructor(config) {
        this.config = Object.assign({ baseBranch: 'main', autoCreatePR: true, prTitle: 'chore: update dependencies', prBody: 'Automated dependency updates by package-detector', prLabels: [], prReviewers: [] }, config);
        this.octokit = new rest_1.Octokit({
            auth: this.config.token,
        });
        this.git = (0, simple_git_1.simpleGit)();
    }
    /**
     * Analyze dependencies and create PR for updates
     */
    analyzeAndCreatePR() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                reporter_1.reporter.printInfo('🔍 Analyzing dependencies for GitHub integration...');
                // Get outdated packages
                const outdatedPackages = yield this.getOutdatedPackages();
                if (outdatedPackages.length === 0) {
                    reporter_1.reporter.printSuccess('✅ All packages are up to date!');
                    return { success: true };
                }
                // Filter packages by update type and severity
                const packagesToUpdate = this.filterPackagesForUpdate(outdatedPackages);
                if (packagesToUpdate.length === 0) {
                    reporter_1.reporter.printInfo('ℹ️  No packages selected for update (filtered by severity)');
                    return { success: true };
                }
                reporter_1.reporter.printInfo(`📦 Found ${packagesToUpdate.length} packages to update`);
                // Create branch and update packages
                const branchName = yield this.createUpdateBranch(packagesToUpdate);
                // Create PR
                const prResult = yield this.createPullRequest(branchName, packagesToUpdate);
                return prResult;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                reporter_1.reporter.printError(`❌ GitHub integration failed: ${errorMessage}`);
                return { success: false, error: errorMessage };
            }
        });
    }
    /**
     * Get outdated packages from npm
     */
    getOutdatedPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const output = (0, utils_1.executeNpmCommand)('npm outdated --json');
                const outdatedData = JSON.parse(output);
                const updates = [];
                for (const [packageName, data] of Object.entries(outdatedData)) {
                    const pkgData = data;
                    const updateType = this.getUpdateType(pkgData.current, pkgData.latest);
                    const severity = this.getSeverity(updateType);
                    updates.push({
                        packageName,
                        currentVersion: pkgData.current,
                        latestVersion: pkgData.latest,
                        updateType,
                        severity
                    });
                }
                return updates;
            }
            catch (error) {
                // npm outdated returns non-zero exit code when there are outdated packages
                // but still produces valid JSON output
                if (error instanceof Error && 'stdout' in error && error.stdout) {
                    const output = error.stdout;
                    const outdatedData = JSON.parse(output);
                    const updates = [];
                    for (const [packageName, data] of Object.entries(outdatedData)) {
                        const pkgData = data;
                        const updateType = this.getUpdateType(pkgData.current, pkgData.latest);
                        const severity = this.getSeverity(updateType);
                        updates.push({
                            packageName,
                            currentVersion: pkgData.current,
                            latestVersion: pkgData.latest,
                            updateType,
                            severity
                        });
                    }
                    return updates;
                }
                throw error;
            }
        });
    }
    /**
     * Filter packages based on update type and severity
     */
    filterPackagesForUpdate(packages) {
        // For now, include all packages. You can add filtering logic here
        // Example: only include patch and minor updates, exclude major updates
        return packages.filter(pkg => {
            // Exclude major updates by default (can be configurable)
            if (pkg.updateType === 'major') {
                reporter_1.reporter.printInfo(`⚠️  Skipping major update for ${pkg.packageName} (${pkg.currentVersion} → ${pkg.latestVersion})`);
                return false;
            }
            return true;
        });
    }
    /**
     * Create a new branch and update packages
     */
    createUpdateBranch(packages) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const branchName = `deps/update-${timestamp}`;
            reporter_1.reporter.printInfo(`🌿 Creating branch: ${branchName}`);
            try {
                // Create and checkout new branch
                yield this.git.checkoutBranch(branchName, this.config.baseBranch);
                // Update each package
                for (const pkg of packages) {
                    yield this.updatePackage(pkg);
                }
                // Commit changes
                const commitMessage = this.config.commitMessage || this.generateCommitMessage(packages);
                yield this.git.add('.');
                yield this.git.commit(commitMessage);
                // Push branch
                yield this.git.push('origin', branchName);
                reporter_1.reporter.printSuccess(`✅ Branch ${branchName} created and pushed`);
                return branchName;
            }
            catch (error) {
                throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Update a single package
     */
    updatePackage(pkg) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                reporter_1.reporter.printInfo(`📦 Updating ${pkg.packageName} (${pkg.currentVersion} → ${pkg.latestVersion})`);
                // Update the package
                (0, utils_1.executeNpmCommand)(`npm install ${pkg.packageName}@${pkg.latestVersion}`);
            }
            catch (error) {
                reporter_1.reporter.printWarning(`⚠️  Failed to update ${pkg.packageName}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Create a pull request
     */
    createPullRequest(branchName, packages) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const title = this.generatePRTitle(packages);
                const body = this.generatePRBody(packages);
                reporter_1.reporter.printInfo('🔀 Creating pull request...');
                const response = yield this.octokit.pulls.create({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    title,
                    body,
                    head: branchName,
                    base: this.config.baseBranch,
                });
                const prUrl = response.data.html_url;
                reporter_1.reporter.printSuccess(`✅ Pull request created: ${prUrl}`);
                // Add labels if specified
                if (this.config.prLabels && this.config.prLabels.length > 0) {
                    yield this.octokit.issues.addLabels({
                        owner: this.config.owner,
                        repo: this.config.repo,
                        issue_number: response.data.number,
                        labels: this.config.prLabels
                    });
                    reporter_1.reporter.printInfo(`🏷️  Labels added: ${this.config.prLabels.join(', ')}`);
                }
                // Request reviewers if specified
                if (this.config.prReviewers && this.config.prReviewers.length > 0) {
                    yield this.octokit.pulls.requestReviewers({
                        owner: this.config.owner,
                        repo: this.config.repo,
                        pull_number: response.data.number,
                        reviewers: this.config.prReviewers
                    });
                    reporter_1.reporter.printInfo(`👥 Reviewers requested: ${this.config.prReviewers.join(', ')}`);
                }
                return {
                    success: true,
                    prUrl,
                    branchName
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to create pull request: ${errorMessage}`);
            }
        });
    }
    /**
     * Generate commit message
     */
    generateCommitMessage(packages) {
        const packageList = packages.map(pkg => `${pkg.packageName}@${pkg.latestVersion}`).join(', ');
        return `chore: update dependencies\n\nUpdated: ${packageList}`;
    }
    /**
     * Generate PR title
     */
    generatePRTitle(packages) {
        const count = packages.length;
        const types = [...new Set(packages.map(pkg => pkg.updateType))];
        if (types.length === 1) {
            return `chore: update ${count} ${types[0]} dependencies`;
        }
        else {
            return `chore: update ${count} dependencies`;
        }
    }
    /**
     * Generate PR body
     */
    generatePRBody(packages) {
        const packageTable = packages.map(pkg => `| ${pkg.packageName} | ${pkg.currentVersion} | ${pkg.latestVersion} | ${pkg.updateType} | ${pkg.severity} |`).join('\n');
        return `## 🔄 Automated Dependency Updates

This PR was automatically generated by [package-detector](https://www.npmjs.com/package/package-detector).

### 📦 Updated Packages

| Package | Current | Latest | Type | Severity |
|---------|---------|--------|------|----------|
${packageTable}

### 🔍 What Changed

${packages.map(pkg => `- **${pkg.packageName}**: ${pkg.currentVersion} → ${pkg.latestVersion} (${pkg.updateType} update)`).join('\n')}

### ⚠️ Important Notes

- Please review the changes before merging
- Test the application thoroughly after merging
- Consider running \`npm audit\` to check for security issues

---
*Generated by package-detector*`;
    }
    /**
     * Determine update type (patch, minor, major)
     */
    getUpdateType(current, latest) {
        const currentParts = current.split('.').map(Number);
        const latestParts = latest.split('.').map(Number);
        if (latestParts[0] > currentParts[0])
            return 'major';
        if (latestParts[1] > currentParts[1])
            return 'minor';
        return 'patch';
    }
    /**
     * Determine severity based on update type
     */
    getSeverity(updateType) {
        switch (updateType) {
            case 'patch': return 'low';
            case 'minor': return 'medium';
            case 'major': return 'high';
        }
    }
    /**
     * Get repository information
     */
    getRepositoryInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.octokit.repos.get({
                    owner: this.config.owner,
                    repo: this.config.repo,
                });
                return {
                    name: response.data.name,
                    description: response.data.description,
                    language: response.data.language,
                    stars: response.data.stargazers_count,
                    forks: response.data.forks_count,
                    openIssues: response.data.open_issues_count,
                };
            }
            catch (error) {
                throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Check if user has write access to the repository
     */
    checkWriteAccess() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield this.octokit.repos.get({
                    owner: this.config.owner,
                    repo: this.config.repo,
                });
                return ((_a = response.data.permissions) === null || _a === void 0 ? void 0 : _a.push) === true;
            }
            catch (error) {
                return false;
            }
        });
    }
}
exports.GitHubIntegration = GitHubIntegration;
