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
// Try to use ts-node if available, otherwise fall back to compiled JS
try {
    require('ts-node/register');
}
catch (error) {
    // If ts-node is not available, try to use compiled JavaScript
    console.warn('ts-node not found, trying to use compiled JavaScript...');
}
const reporter_1 = require("../src/reporter");
// Import detector functions (these will be implemented in Phase 2)
// For now, we'll create placeholder functions
function detectUnused() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Checking for unused packages...');
        // TODO: Implement in Phase 2
        reporter_1.reporter.printWarning('Unused package detection not yet implemented');
    });
}
function detectOutdated() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Checking for outdated packages...');
        // TODO: Implement in Phase 2
        reporter_1.reporter.printWarning('Outdated package detection not yet implemented');
    });
}
function detectDuplicates() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Checking for duplicate packages...');
        // TODO: Implement in Phase 2
        reporter_1.reporter.printWarning('Duplicate package detection not yet implemented');
    });
}
function detectHeavy() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Checking for heavy packages...');
        // TODO: Implement in Phase 2
        reporter_1.reporter.printWarning('Heavy package detection not yet implemented');
    });
}
function runAllDetectors() {
    return __awaiter(this, void 0, void 0, function* () {
        reporter_1.reporter.printInfo('Running all package detectors...');
        yield detectUnused();
        yield detectOutdated();
        yield detectDuplicates();
        yield detectHeavy();
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
                if (options.unused)
                    yield detectUnused();
                if (options.outdated)
                    yield detectOutdated();
                if (options.duplicates)
                    yield detectDuplicates();
                if (options.heavy)
                    yield detectHeavy();
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
