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
    console.log(chalk.bold.blue('\n🔍 Package Detector Analysis Report'));
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

    // Print unused packages
    if (unused.length > 0) {
      console.log(chalk.red.bold('\n❌ Unused Packages:'));
      unused.forEach(result => {
        console.log(chalk.red(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print outdated packages
    if (outdated.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Outdated Packages:'));
      outdated.forEach(result => {
        console.log(chalk.yellow(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print duplicate packages
    if (duplicates.length > 0) {
      console.log(chalk.blue.bold('\n💡 Duplicate Packages:'));
      duplicates.forEach(result => {
        console.log(chalk.blue(`  • ${result.packageName} - ${result.message}`));
      });
    }

    // Print heavy packages
    if (heavy.length > 0) {
      console.log(chalk.magenta.bold('\n🏋️  Heavy Packages:'));
      heavy.forEach(result => {
        console.log(chalk.magenta(`  • ${result.packageName} - ${result.message}`));
      });
    }

    this.printSummary();
  }

  private printSummary(): void {
    const total = this.results.length;
    const unused = this.results.filter(r => r.type === 'unused').length;
    const outdated = this.results.filter(r => r.type === 'outdated').length;
    const duplicates = this.results.filter(r => r.type === 'duplicate').length;
    const heavy = this.results.filter(r => r.type === 'heavy').length;

    console.log(chalk.gray('\n' + '='.repeat(50)));
    console.log(chalk.bold('📊 Summary:'));
    console.log(chalk.gray(`  Total issues found: ${total}`));
    if (unused > 0) console.log(chalk.red(`  Unused packages: ${unused}`));
    if (outdated > 0) console.log(chalk.yellow(`  Outdated packages: ${outdated}`));
    if (duplicates > 0) console.log(chalk.blue(`  Duplicate packages: ${duplicates}`));
    if (heavy > 0) console.log(chalk.magenta(`  Heavy packages: ${heavy}`));
  }

  printError(message: string): void {
    console.log(chalk.red.bold(`❌ Error: ${message}`));
  }

  printWarning(message: string): void {
    console.log(chalk.yellow.bold(`⚠️  Warning: ${message}`));
  }

  printInfo(message: string): void {
    console.log(chalk.blue.bold(`ℹ️  Info: ${message}`));
  }

  printSuccess(message: string): void {
    console.log(chalk.green.bold(`✅ ${message}`));
  }

  printHelp(): void {
    console.log(chalk.cyan.bold('\n📖 Package Detector Usage:'));
    console.log(chalk.gray('  npx package-detector [options]'));
    console.log(chalk.gray('\nOptions:'));
    console.log(chalk.gray('  --unused      Detect unused packages'));
    console.log(chalk.gray('  --outdated    Detect outdated packages'));
    console.log(chalk.gray('  --duplicates  Detect duplicate packages'));
    console.log(chalk.gray('  --heavy       Detect heavy packages'));
    console.log(chalk.gray('  --all         Run all detectors (default)'));
    console.log(chalk.gray('  --help        Show this help message'));
  }
}

// Export a default instance
export const reporter = new Reporter();
