import { Octokit } from '@octokit/rest';
import { simpleGit, SimpleGit } from 'simple-git';
import { reporter, DetectionResult } from './reporter';
import { parseNpmOutdated, executeNpmCommand } from './utils';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch?: string;
  autoCreatePR?: boolean;
  prTitle?: string;
  prBody?: string;
  prLabels?: string[];
  prReviewers?: string[];
  commitMessage?: string;
}

export interface DependencyUpdate {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'patch' | 'minor' | 'major';
  severity: 'low' | 'medium' | 'high';
}

export interface PRResult {
  success: boolean;
  prUrl?: string;
  branchName?: string;
  error?: string;
}

/**
 * GitHub Integration for Package Detector
 */
export class GitHubIntegration {
  private octokit: Octokit;
  private git: SimpleGit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = {
      baseBranch: 'main',
      autoCreatePR: true,
      prTitle: 'chore: update dependencies',
      prBody: 'Automated dependency updates by package-detector',
      prLabels: [],
      prReviewers: [],
      ...config
    };

    this.octokit = new Octokit({
      auth: this.config.token,
    });

    this.git = simpleGit();
  }

  /**
   * Analyze dependencies and create PR for updates
   */
  async analyzeAndCreatePR(): Promise<PRResult> {
    try {
      reporter.printInfo('🔍 Analyzing dependencies for GitHub integration...');

      // Get outdated packages
      const outdatedPackages = await this.getOutdatedPackages();
      
      if (outdatedPackages.length === 0) {
        reporter.printSuccess('✅ All packages are up to date!');
        return { success: true };
      }

      // Filter packages by update type and severity
      const packagesToUpdate = this.filterPackagesForUpdate(outdatedPackages);
      
      if (packagesToUpdate.length === 0) {
        reporter.printInfo('ℹ️  No packages selected for update (filtered by severity)');
        return { success: true };
      }

      reporter.printInfo(`📦 Found ${packagesToUpdate.length} packages to update`);

      // Create branch and update packages
      const branchName = await this.createUpdateBranch(packagesToUpdate);
      
      // Create PR
      const prResult = await this.createPullRequest(branchName, packagesToUpdate);
      
      return prResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      reporter.printError(`❌ GitHub integration failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get outdated packages from npm
   */
  private async getOutdatedPackages(): Promise<DependencyUpdate[]> {
    try {
      const output = executeNpmCommand('npm outdated --json');
      const outdatedData = JSON.parse(output);
      
      const updates: DependencyUpdate[] = [];
      
      for (const [packageName, data] of Object.entries(outdatedData)) {
        const pkgData = data as any;
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
    } catch (error) {
      // npm outdated returns non-zero exit code when there are outdated packages
      // but still produces valid JSON output
      if (error instanceof Error && 'stdout' in error && (error as any).stdout) {
        const output = (error as any).stdout;
        const outdatedData = JSON.parse(output);
        
        const updates: DependencyUpdate[] = [];
        
        for (const [packageName, data] of Object.entries(outdatedData)) {
          const pkgData = data as any;
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
  }

  /**
   * Filter packages based on update type and severity
   */
  private filterPackagesForUpdate(packages: DependencyUpdate[]): DependencyUpdate[] {
    // For now, include all packages. You can add filtering logic here
    // Example: only include patch and minor updates, exclude major updates
    return packages.filter(pkg => {
      // Exclude major updates by default (can be configurable)
      if (pkg.updateType === 'major') {
        reporter.printInfo(`⚠️  Skipping major update for ${pkg.packageName} (${pkg.currentVersion} → ${pkg.latestVersion})`);
        return false;
      }
      return true;
    });
  }

  /**
   * Create a new branch and update packages
   */
  private async createUpdateBranch(packages: DependencyUpdate[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const branchName = `deps/update-${timestamp}`;
    
    reporter.printInfo(`🌿 Creating branch: ${branchName}`);
    
    try {
      // Create and checkout new branch
      await this.git.checkoutBranch(branchName, this.config.baseBranch!);
      
      // Update each package
      for (const pkg of packages) {
        await this.updatePackage(pkg);
      }
      
      // Commit changes
      const commitMessage = this.config.commitMessage || this.generateCommitMessage(packages);
      await this.git.add('.');
      await this.git.commit(commitMessage);
      
      // Push branch
      await this.git.push('origin', branchName);
      
      reporter.printSuccess(`✅ Branch ${branchName} created and pushed`);
      return branchName;
      
    } catch (error) {
      throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a single package
   */
  private async updatePackage(pkg: DependencyUpdate): Promise<void> {
    try {
      reporter.printInfo(`📦 Updating ${pkg.packageName} (${pkg.currentVersion} → ${pkg.latestVersion})`);
      
      // Update the package
      executeNpmCommand(`npm install ${pkg.packageName}@${pkg.latestVersion}`);
      
    } catch (error) {
      reporter.printWarning(`⚠️  Failed to update ${pkg.packageName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a pull request
   */
  private async createPullRequest(branchName: string, packages: DependencyUpdate[]): Promise<PRResult> {
    try {
      const title = this.generatePRTitle(packages);
      const body = this.generatePRBody(packages);
      
      reporter.printInfo('🔀 Creating pull request...');
      
      const response = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        head: branchName,
        base: this.config.baseBranch!,
      });
      
      const prUrl = response.data.html_url;
      reporter.printSuccess(`✅ Pull request created: ${prUrl}`);
      
      // Add labels if specified
      if (this.config.prLabels && this.config.prLabels.length > 0) {
        await this.octokit.issues.addLabels({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: response.data.number,
          labels: this.config.prLabels
        });
        reporter.printInfo(`🏷️  Labels added: ${this.config.prLabels.join(', ')}`);
      }
      // Request reviewers if specified
      if (this.config.prReviewers && this.config.prReviewers.length > 0) {
        await this.octokit.pulls.requestReviewers({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: response.data.number,
          reviewers: this.config.prReviewers
        });
        reporter.printInfo(`👥 Reviewers requested: ${this.config.prReviewers.join(', ')}`);
      }

      return {
        success: true,
        prUrl,
        branchName
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create pull request: ${errorMessage}`);
    }
  }

  /**
   * Generate commit message
   */
  private generateCommitMessage(packages: DependencyUpdate[]): string {
    const packageList = packages.map(pkg => 
      `${pkg.packageName}@${pkg.latestVersion}`
    ).join(', ');
    
    return `chore: update dependencies\n\nUpdated: ${packageList}`;
  }

  /**
   * Generate PR title
   */
  private generatePRTitle(packages: DependencyUpdate[]): string {
    const count = packages.length;
    const types = [...new Set(packages.map(pkg => pkg.updateType))];
    
    if (types.length === 1) {
      return `chore: update ${count} ${types[0]} dependencies`;
    } else {
      return `chore: update ${count} dependencies`;
    }
  }

  /**
   * Generate PR body
   */
  private generatePRBody(packages: DependencyUpdate[]): string {
    const packageTable = packages.map(pkg => 
      `| ${pkg.packageName} | ${pkg.currentVersion} | ${pkg.latestVersion} | ${pkg.updateType} | ${pkg.severity} |`
    ).join('\n');
    
    return `## 🔄 Automated Dependency Updates

This PR was automatically generated by [package-detector](https://www.npmjs.com/package/package-detector).

### 📦 Updated Packages

| Package | Current | Latest | Type | Severity |
|---------|---------|--------|------|----------|
${packageTable}

### 🔍 What Changed

${packages.map(pkg => 
  `- **${pkg.packageName}**: ${pkg.currentVersion} → ${pkg.latestVersion} (${pkg.updateType} update)`
).join('\n')}

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
  private getUpdateType(current: string, latest: string): 'patch' | 'minor' | 'major' {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (latestParts[0] > currentParts[0]) return 'major';
    if (latestParts[1] > currentParts[1]) return 'minor';
    return 'patch';
  }

  /**
   * Determine severity based on update type
   */
  private getSeverity(updateType: 'patch' | 'minor' | 'major'): 'low' | 'medium' | 'high' {
    switch (updateType) {
      case 'patch': return 'low';
      case 'minor': return 'medium';
      case 'major': return 'high';
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo() {
    try {
      const response = await this.octokit.repos.get({
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
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if user has write access to the repository
   */
  async checkWriteAccess(): Promise<boolean> {
    try {
      const response = await this.octokit.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });
      
      return response.data.permissions?.push === true;
    } catch (error) {
      return false;
    }
  }
} 