import chalk from 'chalk';

export interface DetectionResult {
  type: 'unused' | 'outdated' | 'duplicate' | 'heavy';
  packageName: string;
  message: string;
  severity?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export class Reporter {
  private results: DetectionResult[] = [];

  addResult(result: DetectionResult): void {
    this.results.push(result);
  }

  addResults(results: DetectionResult[]): void {
    this.results.push(...results);
  }

  clearResults(): void {
    this.results = [];
  }

  getResults(): DetectionResult[] {
    return [...this.results];
  }

  printHeader(): void {
    console.log(chalk.blue('\n🔍 Package Detector Analysis Report'));
    console.log(chalk.gray('='.repeat(50)));
  }

  printResults(): void {
    if (this.results.length === 0) {
      console.log(chalk.green('✅ No issues detected! Your package.json looks clean.'));
      return;
    }

    const unused = this.results.filter(r => r.type === 'unused');
    const outdated = this.results.filter(r => r.type === 'outdated');
    const duplicates = this.results.filter(r => r.type === 'duplicate');
    const heavy = this.results.filter(r => r.type === 'heavy');

    // Separate truly unused packages from infrastructure packages
    const trulyUnused = unused.filter(r => !r.metadata?.category || r.metadata.category !== 'infrastructure');
    const infrastructure = unused.filter(r => r.metadata?.category === 'infrastructure');

    // Print truly unused packages
    if (trulyUnused.length > 0) {
      console.log(chalk.red('\n❌ Truly Unused Packages:'));
      trulyUnused.forEach(result => {
        console.log(chalk.red(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print infrastructure packages (always show if they exist)
    if (infrastructure.length > 0) {
      console.log(chalk.cyan('\n🔧 Infrastructure Packages (needed for project but not imported):'));
      infrastructure.forEach(result => {
        console.log(chalk.cyan(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print outdated packages
    if (outdated.length > 0) {
      console.log(chalk.yellow('\n⚠️  Outdated Packages:'));
      outdated.forEach(result => {
        console.log(chalk.yellow(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print duplicate packages
    if (duplicates.length > 0) {
      console.log(chalk.blue('\n💡 Duplicate Packages:'));
      duplicates.forEach(result => {
        console.log(chalk.blue(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print heavy packages
    if (heavy.length > 0) {
      console.log(chalk.magenta('\n🏋️  Heavy Packages:'));
      heavy.forEach(result => {
        console.log(chalk.magenta(`  • ${result.packageName} - ${result.message}`));
      });
    }

    this.printSummary();
  }

  private printSummary(): void {
    const total = this.results.length;
    const unused = this.results.filter(r => r.type === 'unused').length;
    const trulyUnused = this.results.filter(r => r.type === 'unused' && (!r.metadata?.category || r.metadata.category !== 'infrastructure')).length;
    const infrastructure = this.results.filter(r => r.type === 'unused' && r.metadata?.category === 'infrastructure').length;
    const outdated = this.results.filter(r => r.type === 'outdated').length;
    const duplicates = this.results.filter(r => r.type === 'duplicate').length;
    const heavy = this.results.filter(r => r.type === 'heavy').length;

    console.log(chalk.gray('\n' + '='.repeat(50)));
    console.log(chalk.cyan('📊 Summary:'));
    console.log(chalk.gray(`  Total issues found: ${total}`));
    
    // Only show unused packages if we have any unused results
    if (unused > 0) {
      console.log(chalk.red(`  Truly unused packages: ${trulyUnused}`));
      if (infrastructure > 0) console.log(chalk.cyan(`  Infrastructure packages: ${infrastructure}`));
    }
    
    if (outdated > 0) console.log(chalk.yellow(`  Outdated packages: ${outdated}`));
    if (duplicates > 0) console.log(chalk.blue(`  Duplicate packages: ${duplicates}`));
    if (heavy > 0) console.log(chalk.magenta(`  Heavy packages: ${heavy}`));
  }

  printError(message: string): void {
    console.log(chalk.red(`❌ Error: ${message}`));
  }

  printWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  Warning: ${message}`));
  }

  printInfo(message: string): void {
    console.log(chalk.blue(`ℹ️  Info: ${message}`));
  }

  printSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  printHelp(): void {
    console.log(chalk.cyan('\n📖 Package Detector Usage:'));
    console.log(chalk.gray('  npx package-detector [options]'));
    console.log(chalk.gray('\nOptions:'));
    console.log(chalk.gray('  --unused      Detect unused packages'));
    console.log(chalk.gray('  --outdated    Detect outdated packages'));
    console.log(chalk.gray('  --duplicates  Detect duplicate packages'));
    console.log(chalk.gray('  --heavy       Detect heavy packages'));
    console.log(chalk.gray('  --all         Run all detectors (default)'));
    console.log(chalk.gray('  --help        Show this help message'));
  }

  printGitHubHelp(): void {
    console.log(chalk.cyan('\n🔗 GitHub Integration Usage:'));
    console.log(chalk.gray('  npx package-detector --github --repo <owner/repo> --analyze'));
    console.log(chalk.gray('  npx package-detector --github --repo <owner/repo> --update --token <GITHUB_TOKEN> [--labels label1,label2] [--reviewers user1,user2] [--commit-message "msg"]'));
    console.log(chalk.gray('\nOptions:'));
    console.log(chalk.gray('  --github         Enable GitHub integration commands'));
    console.log(chalk.gray('  --repo           GitHub repository (owner/repo or URL)'));
    console.log(chalk.gray('  --token          GitHub personal access token (or set GITHUB_TOKEN env variable)'));
    console.log(chalk.gray('  --branch         Base branch (default: main)'));
    console.log(chalk.gray('  --analyze        Analyze repository and show info'));
    console.log(chalk.gray('  --update         Create PR for dependency updates'));
    console.log(chalk.gray('  --labels         Comma-separated PR labels (e.g. dependencies,auto-update)'));
    console.log(chalk.gray('  --reviewers      Comma-separated GitHub usernames to request as reviewers'));
    console.log(chalk.gray('  --commit-message Custom commit message for dependency update commit'));
    console.log(chalk.gray('  --help           Show this help message'));
  }
}

// Export a default instance
export const reporter = new Reporter();
