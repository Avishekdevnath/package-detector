#!/usr/bin/env node
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
const reporter_1 = require("../src/reporter");
const analyzer_1 = require("../src/analyzer");
const outdatedChecker_1 = require("../src/outdatedChecker");
const duplicateChecker_1 = require("../src/duplicateChecker");
const heavyChecker_1 = require("../src/heavyChecker");
const githubCLI_1 = require("../src/githubCLI");
function runAllDetectors() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Running all package detectors...');
        // Clear results before starting
        reporter_1.reporter.clearResults();
        yield (0, analyzer_1.detectUnusedPackages)();
        yield (0, outdatedChecker_1.detectOutdatedPackages)();
        yield (0, duplicateChecker_1.detectDuplicatePackages)();
        yield (0, heavyChecker_1.detectHeavyPackages)();
    });
}
function parseArguments() {
    var _a, _b;
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
        githubToken: getArgValue('--token') || githubCLI_1.GitHubCLI.getGitHubToken() || undefined,
        githubOwner: getArgValue('--owner'),
        githubBaseBranch: getArgValue('--branch') || 'main',
        githubAnalyze: args.includes('--analyze'),
        githubUpdate: args.includes('--update'),
        githubLabels: (_a = getArgValue('--labels')) === null || _a === void 0 ? void 0 : _a.split(',').map(s => s.trim()).filter(Boolean),
        githubReviewers: (_b = getArgValue('--reviewers')) === null || _b === void 0 ? void 0 : _b.split(',').map(s => s.trim()).filter(Boolean),
        githubCommitMessage: getArgValue('--commit-message')
    };
}
function getArgValue(argName) {
    const args = process.argv.slice(2);
    const index = args.indexOf(argName);
    if (index !== -1 && index + 1 < args.length) {
        return args[index + 1];
    }
    return undefined;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const options = parseArguments();
            // Handle GitHub integration first
            if (options.github) {
                // Show GitHub help if help is requested
                if (options.help) {
                    reporter_1.reporter.printGitHubHelp();
                    return;
                }
                if (options.githubAnalyze) {
                    // Analyze GitHub repository
                    const repo = options.githubRepo;
                    if (!repo) {
                        reporter_1.reporter.printError('❌ Repository is required for GitHub analysis. Use --repo option.');
                        return;
                    }
                    const parsedRepo = githubCLI_1.GitHubCLI.parseRepository(repo);
                    if (!parsedRepo) {
                        reporter_1.reporter.printError('❌ Invalid repository format. Use owner/repo or GitHub URL.');
                        return;
                    }
                    yield githubCLI_1.GitHubCLI.analyzeDependencies({
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
                        reporter_1.reporter.printError('❌ Repository is required for GitHub updates. Use --repo option.');
                        return;
                    }
                    const parsedRepo = githubCLI_1.GitHubCLI.parseRepository(repo);
                    if (!parsedRepo) {
                        reporter_1.reporter.printError('❌ Invalid repository format. Use owner/repo or GitHub URL.');
                        return;
                    }
                    if (!options.githubToken) {
                        reporter_1.reporter.printError('❌ GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
                        return;
                    }
                    yield githubCLI_1.GitHubCLI.createUpdatePR({
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
                reporter_1.reporter.printGitHubHelp();
                return;
            }
            // Show help if requested (for non-GitHub commands)
            if (options.help) {
                reporter_1.reporter.printHelp();
                return;
            }
            // Print header
            reporter_1.reporter.printHeader();
            // Run selected detectors
            if (options.all) {
                yield runAllDetectors();
            }
            else {
                // Clear results before starting individual detectors
                reporter_1.reporter.clearResults();
                if (options.unused)
                    yield (0, analyzer_1.detectUnusedPackages)();
                if (options.outdated)
                    yield (0, outdatedChecker_1.detectOutdatedPackages)();
                if (options.duplicates)
                    yield (0, duplicateChecker_1.detectDuplicatePackages)();
                if (options.heavy)
                    yield (0, heavyChecker_1.detectHeavyPackages)();
            }
            // Print results
            reporter_1.reporter.printResults();
        }
        catch (error) {
            reporter_1.reporter.printError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });
}
// Handle process termination
process.on('SIGINT', () => {
    console.log('\n');
    reporter_1.reporter.printInfo('Process interrupted by user');
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    reporter_1.reporter.printError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    reporter_1.reporter.printError(`Unhandled rejection: ${reason}`);
    process.exit(1);
});
// Run the main function
if (require.main === module) {
    main().catch((error) => {
        reporter_1.reporter.printError(`Failed to run package detector: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
