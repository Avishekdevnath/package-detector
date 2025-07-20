#!/usr/bin/env node

import { reporter } from '../src/reporter';
import { detectUnusedPackages } from '../src/analyzer';
import { detectOutdatedPackages } from '../src/outdatedChecker';
import { detectDuplicatePackages } from '../src/duplicateChecker';
import { detectHeavyPackages } from '../src/heavyChecker';

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
} {
  const args = process.argv.slice(2);
  
  return {
    unused: args.includes('--unused'),
    outdated: args.includes('--outdated'),
    duplicates: args.includes('--duplicates'),
    heavy: args.includes('--heavy'),
    all: args.includes('--all') || args.length === 0,
    help: args.includes('--help') || args.includes('-h')
  };
}

async function main(): Promise<void> {
  try {
    const options = parseArguments();

    // Show help if requested
    if (options.help) {
      reporter.printHelp();
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
