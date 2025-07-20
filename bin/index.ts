#!/usr/bin/env node

import { reporter } from '../src/reporter';
import { detectUnusedPackages } from '../src/analyzer';
import { detectOutdatedPackages } from '../src/outdatedChecker';
import { detectDuplicatePackages } from '../src/duplicateChecker';
import { detectHeavyPackages } from '../src/heavyChecker';
import { GitHubCLI } from '../src/githubCLI';

async function runAllDetectors(): Promise<void> {
  reporter.printInfo('Running all package detectors...');
  
  // Clear results before starting
  reporter.clearResults();
  
  await detectUnusedPackages();
  await detectOutdatedPackages();
  await detectDuplicatePackages();
  await detectHeavyPackages();
}

function parseArguments(): { 
  unused: boolean; 
  outdated: boolean; 
  duplicates: boolean; 
  heavy: boolean; 
  all: boolean; 
  help: boolean;
  github: boolean;
  githubRepo?: string;
  githubToken?: string;
  githubOwner?: string;
  githubBaseBranch?: string;
  githubAnalyze: boolean;
  githubUpdate: boolean;
  githubLabels?: string[];
  githubReviewers?: string[];
  githubCommitMessage?: string;
} {
  const args = process.argv.slice(2);
  return {
    unused: args.includes('--unused'),
    outdated: args.includes('--outdated'),
    duplicates: args.includes('--duplicates'),
    heavy: args.includes('--heavy'),
    all: args.includes('--all') || args.length === 0,
    help: args.includes('--help') || args.includes('-h'),
    github: args.includes('--github'),
    githubRepo: getArgValue('--repo'),
    githubToken: getArgValue('--token') || GitHubCLI.getGitHubToken() || undefined,
    githubOwner: getArgValue('--owner'),
    githubBaseBranch: getArgValue('--branch') || 'main',
    githubAnalyze: args.includes('--analyze'),
    githubUpdate: args.includes('--update'),
    githubLabels: getArgValue('--labels')?.split(',').map(s => s.trim()).filter(Boolean),
    githubReviewers: getArgValue('--reviewers')?.split(',').map(s => s.trim()).filter(Boolean),
    githubCommitMessage: getArgValue('--commit-message')
  };
}

function getArgValue(argName: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(argName);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

async function main(): Promise<void> {
  try {
    const options = parseArguments();

    // Show help if requested
    if (options.help) {
      reporter.printHelp();
      return;
    }

    // Handle GitHub integration
    if (options.github) {
      if (options.githubAnalyze) {
        // Analyze GitHub repository
        const repo = options.githubRepo;
        if (!repo) {
          reporter.printError('❌ Repository is required for GitHub analysis. Use --repo option.');
          return;
        }
        
        const parsedRepo = GitHubCLI.parseRepository(repo);
        if (!parsedRepo) {
          reporter.printError('❌ Invalid repository format. Use owner/repo or GitHub URL.');
          return;
        }
        
        await GitHubCLI.analyzeDependencies({
          token: options.githubToken,
          owner: parsedRepo.owner,
          repo: parsedRepo.repo,
          baseBranch: options.githubBaseBranch
        });
        return;
      }
      
      if (options.githubUpdate) {
        // Create PR for dependency updates
        const repo = options.githubRepo;
        if (!repo) {
          reporter.printError('❌ Repository is required for GitHub updates. Use --repo option.');
          return;
        }
        
        const parsedRepo = GitHubCLI.parseRepository(repo);
        if (!parsedRepo) {
          reporter.printError('❌ Invalid repository format. Use owner/repo or GitHub URL.');
          return;
        }
        
        if (!options.githubToken) {
          reporter.printError('❌ GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
          return;
        }
        
        await GitHubCLI.createUpdatePR({
          token: options.githubToken,
          owner: parsedRepo.owner,
          repo: parsedRepo.repo,
          baseBranch: options.githubBaseBranch,
          prLabels: options.githubLabels,
          prReviewers: options.githubReviewers,
          commitMessage: options.githubCommitMessage
        });
        return;
      }
      
      // Default GitHub command - show help
      reporter.printGitHubHelp();
      return;
    }

    // Print header
    reporter.printHeader();

    // Run selected detectors
    if (options.all) {
      await runAllDetectors();
    } else {
      // Clear results before starting individual detectors
      reporter.clearResults();
      
      if (options.unused) await detectUnusedPackages();
      if (options.outdated) await detectOutdatedPackages();
      if (options.duplicates) await detectDuplicatePackages();
      if (options.heavy) await detectHeavyPackages();
    }

    // Print results
    reporter.printResults();

  } catch (error) {
    reporter.printError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n');
  reporter.printInfo('Process interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  reporter.printError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  reporter.printError(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    reporter.printError(`Failed to run package detector: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
