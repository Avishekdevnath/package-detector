# Package Detector

A fast and comprehensive Node.js CLI tool to analyze your project's package.json and detect various package-related issues.

## Features

- 🔍 **Unused Package Detection**: Find packages that are not imported anywhere in your code
- 🔧 **Infrastructure Package Recognition**: Distinguish between truly unused packages and infrastructure packages (build tools, testing frameworks, etc.)
- ⚠️ **Outdated Package Detection**: Check for packages that have newer versions available
- 💡 **Duplicate Package Detection**: Find duplicate packages in your dependency tree
- 🏋️ **Heavy Package Detection**: Identify large packages that might impact your bundle size
- ⚡ **High Performance**: Optimized with caching, parallel processing, and efficient algorithms

## Performance Optimizations

The package detector is built with performance in mind:

### 🚀 **File Scanning Optimizations**
- **Caching**: File content and import extraction results are cached to avoid repeated processing
- **Efficient Directory Traversal**: Uses Set-based lookups for excluded directories (O(1) vs O(n))
- **Depth Limiting**: Prevents stack overflow on deeply nested directories
- **Batch Processing**: Processes multiple files efficiently

### ⚡ **Import Detection Optimizations**
- **Pre-compiled Regex**: Regular expressions are compiled once and reused
- **Early Termination**: Stops searching as soon as a package is found to be used
- **Batch Package Checking**: Checks multiple packages against pre-extracted imports
- **Memory Efficient**: Uses Set data structures for O(1) lookups

### 🌐 **API Call Optimizations**
- **Parallel Processing**: Heavy package detection uses parallel API calls (3 at a time)
- **Caching**: Bundlephobia API results are cached to avoid repeated calls
- **Rate Limiting**: Intelligent delays between API calls to respect rate limits
- **Timeout Handling**: Proper timeout and error handling for network requests

### 📊 **Memory Management**
- **Cache Clearing**: Automatic cache clearing between runs for fresh analysis
- **Efficient Data Structures**: Uses Maps and Sets for optimal performance
- **Garbage Collection Friendly**: Minimal object creation and proper cleanup

## Installation

### Global Installation
```bash
npm install -g package-detector
```

### Using npx (Recommended)
```bash
npx package-detector --help
```

## Usage

```bash
# Run all detectors (default)
npx package-detector
npx package-detector --all

# Run specific detectors
npx package-detector --unused
npx package-detector --outdated
npx package-detector --duplicates
npx package-detector --heavy

# Run multiple detectors
npx package-detector --unused --outdated

# Show help
npx package-detector --help
```

## Output Examples

### Unused Packages Detection
```
🔍 Package Detector Analysis Report
==================================================
ℹ️  Info: Scanning project files for imports...
ℹ️  Info: Found 13 project files to analyze
ℹ️  Info: Found 6 infrastructure packages (needed for project but not imported)
✅ No truly unused packages found! Only infrastructure packages detected.

🔧 Infrastructure Packages (needed for project but not imported):
  • typescript - Infrastructure package: Build tool - needed for TypeScript compilation
  • jest - Infrastructure package: Testing framework - needed for running tests
  • ts-jest - Infrastructure package: TypeScript testing - needed for Jest TypeScript support

==================================================
📊 Summary:
  Total issues found: 6
  Truly unused packages: 0
  Infrastructure packages: 6
```

### Heavy Packages Detection
```
🏋️  Heavy Packages:
  • typescript - Very large package: 945.4 KB (gzipped)
  • ts-node - Medium package: 78.7 KB (gzipped)
```

## Configuration

The tool automatically detects your project structure and doesn't require configuration. It:

- Scans for files with extensions: `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`
- Excludes common directories: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `.nuxt`, `.cache`
- Recognizes infrastructure packages like build tools, testing frameworks, and type definitions

## Performance Benchmarks

On a typical project with:
- 50+ dependencies
- 100+ source files
- 10+ directories

**Before optimizations:**
- Unused package detection: ~5-10 seconds
- Heavy package detection: ~30-60 seconds (sequential API calls)

**After optimizations:**
- Unused package detection: ~1-3 seconds (80% faster)
- Heavy package detection: ~10-20 seconds (70% faster with parallel calls)

## Development

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/avishekdevnath/package-detector.git
cd package-detector

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

### Available Scripts
```bash
npm run build      # Build the TypeScript project
npm run test       # Run all tests
npm run dev        # Run in development mode
npm run clean      # Clean build artifacts
npm start          # Run the CLI
```

### Project Structure
```
package-detector/
├── bin/
│   └── index.ts           # CLI Entry point
├── src/
│   ├── analyzer.ts        # Unused package detection
│   ├── heavyChecker.ts    # Bundlephobia integration
│   ├── outdatedChecker.ts # Outdated package detection
│   ├── duplicateChecker.ts# Duplicate package detection
│   ├── reporter.ts        # CLI output with chalk
│   └── utils.ts           # Shared utilities
├── tests/
│   ├── analyzer.test.ts   # Analyzer tests
│   ├── reporter.test.ts   # Reporter tests
│   └── utils.test.ts      # Utils tests
├── package.json
├── tsconfig.json
└── README.md
```

## Publishing to npm

### First Time Setup
```bash
# Login to npm
npm login

# Build the project
npm run build

# Publish
npm publish
```

### Updating the Package
```bash
# Update version in package.json
npm version patch  # or minor, major

# Build and publish
npm run build
npm publish
```

### Publishing Scoped vs Unscoped Packages
- **Unscoped** (current): `package-detector` - Clean, memorable name
- **Scoped**: `@username/package-detector` - Prevents naming conflicts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

**Avishek Devnath**
- GitHub: [@avishekdevnath](https://github.com/avishekdevnath)
- NPM: [package-detector](https://www.npmjs.com/package/package-detector)

---

⭐ If you find this tool helpful, please give it a star on GitHub!
