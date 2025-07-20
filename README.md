# 🔍 Package Detector

A powerful CLI tool to detect unused packages, outdated dependencies, duplicated modules, and heavy packages in your Node.js projects.

## ✨ Features

- ❌ **Unused Packages**: Detect packages in `package.json` that are not used in your code
- ⬆️ **Outdated Dependencies**: Check for packages that have newer versions available
- 🧑‍🤝‍🧑 **Duplicate Modules**: Find multiple versions of the same package
- 🏋️ **Heavy Packages**: Identify large packages using Bundlephobia API

## 🚀 Installation

### Global Installation
```bash
npm install -g @avishekdevnath/package-detector
```

### Local Development
```bash
git clone https://github.com/avishekdevnath/package-detector.git
cd package-detector
npm install
npm link
```

## 📖 Usage

### Basic Usage
```bash
# Run all detectors (default)
package-detector

# Or explicitly run all
package-detector --all
```

### Specific Detectors
```bash
# Check for unused packages only
package-detector --unused

# Check for outdated packages only
package-detector --outdated

# Check for duplicate packages only
package-detector --duplicates

# Check for heavy packages only
package-detector --heavy
```

### Help
```bash
package-detector --help
```

## 🎨 Output Examples

### All Detectors
```
🔍 Package Detector Analysis Report
==================================================
ℹ️  Info: Running all package detectors...
ℹ️  Info: Scanning project files for imports...
ℹ️  Info: Found 16 project files to analyze
ℹ️  Info: Found 4 unused packages
ℹ️  Info: Checking for outdated packages...
✅ All packages are up to date
ℹ️  Info: Checking for duplicate packages...
✅ No duplicate packages found
ℹ️  Info: Checking for heavy packages using Bundlephobia...
ℹ️  Info: Found 1 heavy packages

❌ Unused Packages:
  • @types/node - Not imported anywhere in the project
  • npm-which - Not imported anywhere in the project
  • typescript - Not imported anywhere in the project
  • webpack - Not imported anywhere in the project

🏋️  Heavy Packages:
  • ts-node - Medium package: 78.7 KB (gzipped)

==================================================
📊 Summary:
  Total issues found: 5
  Unused packages: 4
  Heavy packages: 1
```

### Clean Project
```
🔍 Package Detector Analysis Report
==================================================
ℹ️  Info: Running all package detectors...
ℹ️  Info: Scanning project files for imports...
ℹ️  Info: Found 0 project files to analyze
ℹ️  Info: Checking for outdated packages...
✅ All packages are up to date
ℹ️  Info: Checking for duplicate packages...
✅ No duplicate packages found
ℹ️  Info: Checking for heavy packages using Bundlephobia...
✅ No heavy packages found
✅ No issues detected! Your package.json looks clean.
```

## 🛠️ Development

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
│   └── analyzer.test.ts   # Tests
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts
```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Start the CLI
npm start

# Clean build artifacts
npm run clean
```

### Local Testing
```bash
# Link the package globally for testing
npm link

# Test the CLI
package-detector --help
package-detector --unused
```

## 🔧 Configuration

The tool automatically detects your project's `package.json` and analyzes the current directory. No additional configuration is required.

## 🧪 Testing

Tests are planned for Phase 3 of development. The current version includes placeholder test files.

## 📦 Tech Stack

- **Runtime**: Node.js + TypeScript
- **CLI Output**: chalk
- **Package Resolution**: npm-which
- **Module Analysis**: webpack
- **API Integration**: axios (for Bundlephobia)
- **File System**: fs, path
- **Process Management**: child_process

## 🚧 Development Status

### ✅ Phase 1: Core Setup (Completed)
- [x] Project initialization
- [x] CLI entry point
- [x] Basic reporter with chalk
- [x] Argument parsing
- [x] Help system

### ✅ Phase 2: Detection Modules (Completed)
- [x] Unused package detection
- [x] Outdated package detection
- [x] Duplicate package detection
- [x] Heavy package detection
- [x] Bundlephobia API integration
- [x] Smart result handling (skip unused packages in heavy detection)

### 📋 Phase 3: Testing & Polish (Planned)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimizations
- [ ] Documentation improvements

### 🚀 Phase 4: Publish (Planned)
- [ ] NPM publishing
- [ ] CI/CD setup
- [ ] Release management

## 🔍 How It Works

### Unused Package Detection
- Scans all project files (`.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`)
- Extracts import/require statements using regex patterns
- Compares with `package.json` dependencies
- Identifies packages not used anywhere in the codebase

### Outdated Package Detection
- Uses `npm outdated` command
- Parses JSON and text output formats
- Categorizes by severity (major, minor, patch updates)
- Provides current vs latest version information

### Duplicate Package Detection
- Uses `npm ls` to analyze dependency tree
- Parses package-lock.json as fallback
- Identifies multiple versions of the same package
- Helps resolve dependency conflicts

### Heavy Package Detection
- Integrates with Bundlephobia API
- Checks gzipped bundle sizes
- Categorizes by size thresholds (50KB, 100KB, 500KB)
- Skips packages already detected as unused

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Avishek Devnath**

- GitHub: [@avishekdevnath](https://github.com/avishekdevnath)
- NPM: [@avishekdevnath](https://www.npmjs.com/~avishekdevnath)

## 🙏 Acknowledgments

- [Bundlephobia](https://bundlephobia.com/) for package size data
- [Chalk](https://github.com/chalk/chalk) for beautiful CLI output
- [npm-which](https://github.com/timoxley/npm-which) for package resolution

---

⭐ If you find this tool helpful, please give it a star on GitHub!
