"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reporter = exports.Reporter = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Reporter {
    constructor() {
        this.results = [];
    }
    addResult(result) {
        this.results.push(result);
    }
    addResults(results) {
        this.results.push(...results);
    }
    clearResults() {
        this.results = [];
    }
    printHeader() {
        console.log(chalk_1.default.bold.blue('\n🔍 Package Detector Analysis Report'));
        console.log(chalk_1.default.gray('='.repeat(50)));
    }
    printResults() {
        if (this.results.length === 0) {
            console.log(chalk_1.default.green('✅ No issues detected! Your package.json looks clean.'));
            return;
        }
        const unused = this.results.filter(r => r.type === 'unused');
        const outdated = this.results.filter(r => r.type === 'outdated');
        const duplicates = this.results.filter(r => r.type === 'duplicate');
        const heavy = this.results.filter(r => r.type === 'heavy');
        // Print unused packages
        if (unused.length > 0) {
            console.log(chalk_1.default.red.bold('\n❌ Unused Packages:'));
            unused.forEach(result => {
                console.log(chalk_1.default.red(`  • ${result.packageName} - ${result.message}`));
            });
        }
        // Print outdated packages
        if (outdated.length > 0) {
            console.log(chalk_1.default.yellow.bold('\n⚠️  Outdated Packages:'));
            outdated.forEach(result => {
                console.log(chalk_1.default.yellow(`  • ${result.packageName} - ${result.message}`));
            });
        }
        // Print duplicate packages
        if (duplicates.length > 0) {
            console.log(chalk_1.default.blue.bold('\n💡 Duplicate Packages:'));
            duplicates.forEach(result => {
                console.log(chalk_1.default.blue(`  • ${result.packageName} - ${result.message}`));
            });
        }
        // Print heavy packages
        if (heavy.length > 0) {
            console.log(chalk_1.default.magenta.bold('\n🏋️  Heavy Packages:'));
            heavy.forEach(result => {
                console.log(chalk_1.default.magenta(`  • ${result.packageName} - ${result.message}`));
            });
        }
        this.printSummary();
    }
    printSummary() {
        const total = this.results.length;
        const unused = this.results.filter(r => r.type === 'unused').length;
        const outdated = this.results.filter(r => r.type === 'outdated').length;
        const duplicates = this.results.filter(r => r.type === 'duplicate').length;
        const heavy = this.results.filter(r => r.type === 'heavy').length;
        console.log(chalk_1.default.gray('\n' + '='.repeat(50)));
        console.log(chalk_1.default.bold('📊 Summary:'));
        console.log(chalk_1.default.gray(`  Total issues found: ${total}`));
        if (unused > 0)
            console.log(chalk_1.default.red(`  Unused packages: ${unused}`));
        if (outdated > 0)
            console.log(chalk_1.default.yellow(`  Outdated packages: ${outdated}`));
        if (duplicates > 0)
            console.log(chalk_1.default.blue(`  Duplicate packages: ${duplicates}`));
        if (heavy > 0)
            console.log(chalk_1.default.magenta(`  Heavy packages: ${heavy}`));
    }
    printError(message) {
        console.log(chalk_1.default.red.bold(`❌ Error: ${message}`));
    }
    printWarning(message) {
        console.log(chalk_1.default.yellow.bold(`⚠️  Warning: ${message}`));
    }
    printInfo(message) {
        console.log(chalk_1.default.blue.bold(`ℹ️  Info: ${message}`));
    }
    printSuccess(message) {
        console.log(chalk_1.default.green.bold(`✅ ${message}`));
    }
    printHelp() {
        console.log(chalk_1.default.cyan.bold('\n📖 Package Detector Usage:'));
        console.log(chalk_1.default.gray('  npx package-detector [options]'));
        console.log(chalk_1.default.gray('\nOptions:'));
        console.log(chalk_1.default.gray('  --unused      Detect unused packages'));
        console.log(chalk_1.default.gray('  --outdated    Detect outdated packages'));
        console.log(chalk_1.default.gray('  --duplicates  Detect duplicate packages'));
        console.log(chalk_1.default.gray('  --heavy       Detect heavy packages'));
        console.log(chalk_1.default.gray('  --all         Run all detectors (default)'));
        console.log(chalk_1.default.gray('  --help        Show this help message'));
    }
}
exports.Reporter = Reporter;
// Export a default instance
exports.reporter = new Reporter();
