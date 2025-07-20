import { GitHubIntegration, GitHubConfig, PRResult } from './githubIntegration';
import { reporter } from './reporter';

/**
 * GitHub CLI commands for package detector
 */
export class GitHubCLI {
  
  /**
   * Initialize GitHub integration
   */
  static async init(config: Partial<GitHubConfig>): Promise<GitHubIntegration | null> {
    try {
      // Validate required config
      if (!config.token) {
        reporter.printError('❌ GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
        return null;
      }
      
      if (!config.owner || !config.repo) {
        reporter.printError('❌ Repository owner and name are required. Use --owner and --repo options.');
        return null;
      }
      
      const githubConfig: GitHubConfig = {
        token: config.token,
        owner: config.owner,
        repo: config.repo,
        baseBranch: config.baseBranch || 'main',
        autoCreatePR: config.autoCreatePR !== false,
        prTitle: config.prTitle,
        prBody: config.prBody,
      };
      
      const integration = new GitHubIntegration(githubConfig);
      
      // Test connection
      reporter.printInfo('🔗 Testing GitHub connection...');
      await integration.getRepositoryInfo();
      reporter.printSuccess('✅ GitHub connection successful');
      
      // Check write access
      const hasWriteAccess = await integration.checkWriteAccess();
      if (!hasWriteAccess) {
        reporter.printWarning('⚠️  No write access to repository. PR creation may fail.');
      }
      
      return integration;
      
    } catch (error) {
      reporter.printError(`❌ Failed to initialize GitHub integration: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Create PR for dependency updates
   */
  static async createUpdatePR(config: Partial<GitHubConfig>): Promise<void> {
    const integration = await this.init(config);
    if (!integration) return;
    
    try {
      reporter.printHeader();
      reporter.printInfo('🚀 Starting automated dependency update process...');
      
      const result = await integration.analyzeAndCreatePR();
      
      if (result.success) {
        if (result.prUrl) {
          reporter.printSuccess(`✅ Pull request created successfully!`);
          reporter.printInfo(`🔗 PR URL: ${result.prUrl}`);
          reporter.printInfo(`🌿 Branch: ${result.branchName}`);
        } else {
          reporter.printSuccess('✅ All packages are up to date!');
        }
      } else {
        reporter.printError(`❌ Failed to create pull request: ${result.error}`);
      }
      
    } catch (error) {
      reporter.printError(`❌ GitHub integration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze dependencies without creating PR
   */
  static async analyzeDependencies(config: Partial<GitHubConfig>): Promise<void> {
    const integration = await this.init(config);
    if (!integration) return;
    
    try {
      reporter.printHeader();
      reporter.printInfo('🔍 Analyzing dependencies for GitHub repository...');
      
      // Get repository info
      const repoInfo = await integration.getRepositoryInfo();
      reporter.printInfo(`📁 Repository: ${repoInfo.name}`);
      reporter.printInfo(`📝 Description: ${repoInfo.description || 'No description'}`);
      reporter.printInfo(`💻 Language: ${repoInfo.language || 'Unknown'}`);
      reporter.printInfo(`⭐ Stars: ${repoInfo.stars}`);
      reporter.printInfo(`🍴 Forks: ${repoInfo.forks}`);
      reporter.printInfo(`🐛 Open Issues: ${repoInfo.openIssues}`);
      
      // Check write access
      const hasWriteAccess = await integration.checkWriteAccess();
      reporter.printInfo(`✍️  Write Access: ${hasWriteAccess ? '✅ Yes' : '❌ No'}`);
      
    } catch (error) {
      reporter.printError(`❌ Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get GitHub token from environment or prompt
   */
  static getGitHubToken(): string | null {
    // Check environment variables
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) return token;
    
    // Could add interactive prompt here if needed
    return null;
  }
  
  /**
   * Parse repository from URL or string
   */
  static parseRepository(repoString: string): { owner: string; repo: string } | null {
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