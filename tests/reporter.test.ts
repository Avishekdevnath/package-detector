import { Reporter, DetectionResult } from '../src/reporter';

// Mock chalk directly in this test file
jest.mock('chalk', () => {
  // Create a proper chalk mock that supports chaining
  const createChalkMock = () => {
    const mockFn = jest.fn((text: string) => text) as any;
    mockFn.bold = jest.fn((text: string) => text);
    return mockFn;
  };

  const mockChalk = {
    red: createChalkMock(),
    green: createChalkMock(),
    blue: createChalkMock(),
    yellow: createChalkMock(),
    magenta: createChalkMock(),
    cyan: createChalkMock(),
    gray: createChalkMock(),
    bold: {
      red: jest.fn((text: string) => text),
      green: jest.fn((text: string) => text),
      blue: jest.fn((text: string) => text),
      yellow: jest.fn((text: string) => text),
      magenta: jest.fn((text: string) => text),
      cyan: jest.fn((text: string) => text),
    }
  };

  // Support all chaining patterns
  mockChalk.red.bold = jest.fn((text: string) => text);
  mockChalk.green.bold = jest.fn((text: string) => text);
  mockChalk.blue.bold = jest.fn((text: string) => text);
  mockChalk.yellow.bold = jest.fn((text: string) => text);
  mockChalk.magenta.bold = jest.fn((text: string) => text);
  mockChalk.cyan.bold = jest.fn((text: string) => text);

  return {
    default: mockChalk
  };
});

describe('Reporter', () => {
  let reporter: Reporter;

  beforeEach(() => {
    reporter = new Reporter();
  });

  describe('Result Management', () => {
    it('should add single result', () => {
      const result: DetectionResult = {
        type: 'unused',
        packageName: 'test-package',
        message: 'Test message',
        severity: 'medium'
      };

      reporter.addResult(result);
      const results = reporter.getResults();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(result);
    });

    it('should add multiple results', () => {
      const results: DetectionResult[] = [
        {
          type: 'unused',
          packageName: 'package1',
          message: 'Message 1',
          severity: 'low'
        },
        {
          type: 'outdated',
          packageName: 'package2',
          message: 'Message 2',
          severity: 'high'
        }
      ];

      reporter.addResults(results);
      const storedResults = reporter.getResults();

      expect(storedResults).toHaveLength(2);
      expect(storedResults).toEqual(results);
    });

    it('should clear results', () => {
      const result: DetectionResult = {
        type: 'unused',
        packageName: 'test-package',
        message: 'Test message',
        severity: 'medium'
      };

      reporter.addResult(result);
      expect(reporter.getResults()).toHaveLength(1);

      reporter.clearResults();
      expect(reporter.getResults()).toHaveLength(0);
    });

    it('should return copy of results', () => {
      const result: DetectionResult = {
        type: 'unused',
        packageName: 'test-package',
        message: 'Test message',
        severity: 'medium'
      };

      reporter.addResult(result);
      const results = reporter.getResults();

      // Modify the returned array
      results.push({
        type: 'outdated',
        packageName: 'another-package',
        message: 'Another message',
        severity: 'high'
      });

      // Original results should not be affected
      expect(reporter.getResults()).toHaveLength(1);
    });
  });

  describe('Output Methods', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should print header', () => {
      reporter.printHeader();
      expect(console.log).toHaveBeenCalledWith('🔍 Package Detector Analysis Report');
      expect(console.log).toHaveBeenCalledWith('='.repeat(50));
    });

    it('should print help', () => {
      reporter.printHelp();
      expect(console.log).toHaveBeenCalledWith('📖 Package Detector Usage:');
      expect(console.log).toHaveBeenCalledWith('  npx package-detector [options]');
    });

    it('should print error message', () => {
      const errorMessage = 'Test error message';
      reporter.printError(errorMessage);
      expect(console.log).toHaveBeenCalledWith(`❌ Error: ${errorMessage}`);
    });

    it('should print warning message', () => {
      const warningMessage = 'Test warning message';
      reporter.printWarning(warningMessage);
      expect(console.log).toHaveBeenCalledWith(`⚠️  Warning: ${warningMessage}`);
    });

    it('should print info message', () => {
      const infoMessage = 'Test info message';
      reporter.printInfo(infoMessage);
      expect(console.log).toHaveBeenCalledWith(`ℹ️  Info: ${infoMessage}`);
    });

    it('should print success message', () => {
      const successMessage = 'Test success message';
      reporter.printSuccess(successMessage);
      expect(console.log).toHaveBeenCalledWith(`✅ ${successMessage}`);
    });
  });

  describe('Results Display', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should display no issues when no results', () => {
      reporter.printResults();
      expect(console.log).toHaveBeenCalledWith('✅ No issues detected! Your package.json looks clean.');
    });

    it('should display unused packages', () => {
      const unusedResult: DetectionResult = {
        type: 'unused',
        packageName: 'unused-package',
        message: 'Not imported anywhere',
        severity: 'medium'
      };

      reporter.addResult(unusedResult);
      reporter.printResults();

      expect(console.log).toHaveBeenCalledWith('❌ Unused Packages:');
      expect(console.log).toHaveBeenCalledWith('  • unused-package - Not imported anywhere');
    });

    it('should display outdated packages', () => {
      const outdatedResult: DetectionResult = {
        type: 'outdated',
        packageName: 'outdated-package',
        message: 'Current: 1.0.0, Latest: 2.0.0',
        severity: 'high'
      };

      reporter.addResult(outdatedResult);
      reporter.printResults();

      expect(console.log).toHaveBeenCalledWith('⚠️  Outdated Packages:');
      expect(console.log).toHaveBeenCalledWith('  • outdated-package - Current: 1.0.0, Latest: 2.0.0');
    });

    it('should display duplicate packages', () => {
      const duplicateResult: DetectionResult = {
        type: 'duplicate',
        packageName: 'duplicate-package',
        message: 'Multiple versions found',
        severity: 'medium'
      };

      reporter.addResult(duplicateResult);
      reporter.printResults();

      expect(console.log).toHaveBeenCalledWith('💡 Duplicate Packages:');
      expect(console.log).toHaveBeenCalledWith('  • duplicate-package - Multiple versions found');
    });

    it('should display heavy packages', () => {
      const heavyResult: DetectionResult = {
        type: 'heavy',
        packageName: 'heavy-package',
        message: 'Large package: 500 KB',
        severity: 'high'
      };

      reporter.addResult(heavyResult);
      reporter.printResults();

      expect(console.log).toHaveBeenCalledWith('🏋️  Heavy Packages:');
      expect(console.log).toHaveBeenCalledWith('  • heavy-package - Large package: 500 KB');
    });

    it('should display summary with correct counts', () => {
      const results: DetectionResult[] = [
        { type: 'unused', packageName: 'p1', message: 'msg1', severity: 'low' },
        { type: 'unused', packageName: 'p2', message: 'msg2', severity: 'medium' },
        { type: 'outdated', packageName: 'p3', message: 'msg3', severity: 'high' },
        { type: 'duplicate', packageName: 'p4', message: 'msg4', severity: 'medium' },
        { type: 'heavy', packageName: 'p5', message: 'msg5', severity: 'high' }
      ];

      reporter.addResults(results);
      reporter.printResults();

      expect(console.log).toHaveBeenCalledWith('📊 Summary:');
      expect(console.log).toHaveBeenCalledWith('  Total issues found: 5');
      expect(console.log).toHaveBeenCalledWith('  Unused packages: 2');
      expect(console.log).toHaveBeenCalledWith('  Outdated packages: 1');
      expect(console.log).toHaveBeenCalledWith('  Duplicate packages: 1');
      expect(console.log).toHaveBeenCalledWith('  Heavy packages: 1');
    });
  });
}); 