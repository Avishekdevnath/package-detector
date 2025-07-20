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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const options = parseArguments();
            // Show help if requested
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
