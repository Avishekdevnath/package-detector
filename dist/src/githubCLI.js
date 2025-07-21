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
exports.GitHubCLI = void 0;
const githubIntegration_1 = require("./githubIntegration");
const reporter_1 = require("./reporter");
/**
 * GitHub CLI commands for package detector
 */
class GitHubCLI {
    /**
     * Initialize GitHub integration
     */
    static init(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate required config
                if (!config.token) {
                    reporter_1.reporter.printError('❌ GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
                    return null;
                }
                if (!config.owner || !config.repo) {
                    reporter_1.reporter.printError('❌ Repository owner and name are required. Use --owner and --repo options.');
                    return null;
                }
                const githubConfig = {
                    token: config.token,
                    owner: config.owner,
                    repo: config.repo,
                    baseBranch: config.baseBranch || 'main',
                    autoCreatePR: config.autoCreatePR !== false,
                    prTitle: config.prTitle,
                    prBody: config.prBody,
                };
                const integration = new githubIntegration_1.GitHubIntegration(githubConfig);
                // Test connection
                reporter_1.reporter.printInfo('🔗 Testing GitHub connection...');
                yield integration.getRepositoryInfo();
                reporter_1.reporter.printSuccess('✅ GitHub connection successful');
                // Check write access
                const hasWriteAccess = yield integration.checkWriteAccess();
                if (!hasWriteAccess) {
                    reporter_1.reporter.printWarning('⚠️  No write access to repository. PR creation may fail.');
                }
                return integration;
            }
            catch (error) {
                reporter_1.reporter.printError(`❌ Failed to initialize GitHub integration: ${error instanceof Error ? error.message : String(error)}`);
                return null;
            }
        });
    }
    /**
     * Create PR for dependency updates
     */
    static createUpdatePR(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield this.init(config);
            if (!integration)
                return;
            try {
                reporter_1.reporter.printHeader();
                reporter_1.reporter.printInfo('🚀 Starting automated dependency update process...');
                const result = yield integration.analyzeAndCreatePR();
                if (result.success) {
                    if (result.prUrl) {
                        reporter_1.reporter.printSuccess(`✅ Pull request created successfully!`);
                        reporter_1.reporter.printInfo(`🔗 PR URL: ${result.prUrl}`);
                        reporter_1.reporter.printInfo(`🌿 Branch: ${result.branchName}`);
                    }
                    else {
                        reporter_1.reporter.printSuccess('✅ All packages are up to date!');
                    }
                }
                else {
                    reporter_1.reporter.printError(`❌ Failed to create pull request: ${result.error}`);
                }
            }
            catch (error) {
                reporter_1.reporter.printError(`❌ GitHub integration failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Analyze dependencies without creating PR
     */
    static analyzeDependencies(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield this.init(config);
            if (!integration)
                return;
            try {
                reporter_1.reporter.printHeader();
                reporter_1.reporter.printInfo('🔍 Analyzing dependencies for GitHub repository...');
                // Get repository info
                const repoInfo = yield integration.getRepositoryInfo();
                reporter_1.reporter.printInfo(`📁 Repository: ${repoInfo.name}`);
                reporter_1.reporter.printInfo(`📝 Description: ${repoInfo.description || 'No description'}`);
                reporter_1.reporter.printInfo(`💻 Language: ${repoInfo.language || 'Unknown'}`);
                reporter_1.reporter.printInfo(`⭐ Stars: ${repoInfo.stars}`);
                reporter_1.reporter.printInfo(`🍴 Forks: ${repoInfo.forks}`);
                reporter_1.reporter.printInfo(`🐛 Open Issues: ${repoInfo.openIssues}`);
                // Check write access
                const hasWriteAccess = yield integration.checkWriteAccess();
                reporter_1.reporter.printInfo(`✍️  Write Access: ${hasWriteAccess ? '✅ Yes' : '❌ No'}`);
            }
            catch (error) {
                reporter_1.reporter.printError(`❌ Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Get GitHub token from environment or prompt
     */
    static getGitHubToken() {
        // Check environment variables
        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (token)
            return token;
        // Could add interactive prompt here if needed
        return null;
    }
    /**
     * Parse repository from URL or string
     */
    static parseRepository(repoString) {
        // Handle GitHub URLs
        const githubUrlMatch = repoString.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (githubUrlMatch) {
            return {
                owner: githubUrlMatch[1],
                repo: githubUrlMatch[2].replace(/\.git$/, '')
            };
        }
        // Handle owner/repo format
        const ownerRepoMatch = repoString.match(/^([^\/]+)\/([^\/]+)$/);
        if (ownerRepoMatch) {
            return {
                owner: ownerRepoMatch[1],
                repo: ownerRepoMatch[2]
            };
        }
        return null;
    }
}
exports.GitHubCLI = GitHubCLI;
