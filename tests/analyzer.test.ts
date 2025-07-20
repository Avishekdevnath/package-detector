import { detectUnusedPackages } from '../src/analyzer';
import { reporter } from '../src/reporter';
import { getAllDependencies, findProjectFiles, isPackageUsed } from '../src/utils';

// Mock dependencies
jest.mock('../src/reporter');
jest.mock('../src/utils');

const mockReporter = reporter as jest.Mocked<typeof reporter>;
const mockGetAllDependencies = getAllDependencies as jest.MockedFunction<typeof getAllDependencies>;
const mockFindProjectFiles = findProjectFiles as jest.MockedFunction<typeof findProjectFiles>;
const mockIsPackageUsed = isPackageUsed as jest.MockedFunction<typeof isPackageUsed>;

describe('Analyzer - Unused Package Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReporter.clearResults.mockImplementation(() => {});
    mockReporter.addResults.mockImplementation(() => {});
    mockReporter.printInfo.mockImplementation(() => {});
    mockReporter.printSuccess.mockImplementation(() => {});
    mockReporter.printError.mockImplementation(() => {});
  });

  it('should detect unused packages successfully', async () => {
    // Mock dependencies
    const mockDependencies = {
      'used-package': '^1.0.0',
      'unused-package': '^2.0.0',
      'another-unused': '^3.0.0',
      'dev-unused': '^4.0.0'
    };

    // Mock project files
    const mockFiles = ['src/index.js', 'src/utils.js'];

    // Mock package usage
    mockGetAllDependencies.mockReturnValue(mockDependencies);
    mockFindProjectFiles.mockReturnValue(mockFiles);
    mockIsPackageUsed
      .mockReturnValueOnce(true)  // used-package
      .mockReturnValueOnce(false) // unused-package
      .mockReturnValueOnce(false) // another-unused
      .mockReturnValueOnce(false); // dev-unused

    await detectUnusedPackages();

    expect(mockReporter.printInfo).toHaveBeenCalledWith('Scanning project files for imports...');
    expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 2 project files to analyze');
    expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 3 unused packages');

    expect(mockReporter.addResults).toHaveBeenCalledWith([
      {
        type: 'unused',
        packageName: 'unused-package',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      },
      {
        type: 'unused',
        packageName: 'another-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      },
      {
        type: 'unused',
        packageName: 'dev-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      }
    ]);
  });

  it('should handle projects with no unused packages', async () => {
    const mockDependencies = {
      'used-package': '^1.0.0'
    };

    const mockFiles = ['src/index.js'];

    mockGetAllDependencies.mockReturnValue(mockDependencies);
    mockFindProjectFiles.mockReturnValue(mockFiles);
    mockIsPackageUsed.mockReturnValue(true); // All packages are used

    await detectUnusedPackages();

    expect(mockReporter.printSuccess).toHaveBeenCalledWith('All packages are being used');
    expect(mockReporter.addResults).not.toHaveBeenCalled();
  });

  it('should handle projects with no dependencies', async () => {
    mockGetAllDependencies.mockReturnValue({});
    mockFindProjectFiles.mockReturnValue([]);

    await detectUnusedPackages();

    expect(mockReporter.printInfo).toHaveBeenCalledWith('No dependencies found in package.json');
    expect(mockReporter.addResults).not.toHaveBeenCalled();
  });

  it('should handle projects with no project files', async () => {
    const mockDependencies = {
      'some-package': '^1.0.0'
    };

    mockGetAllDependencies.mockReturnValue(mockDependencies);
    mockFindProjectFiles.mockReturnValue([]);

    await detectUnusedPackages();

    expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 0 project files to analyze');
    expect(mockReporter.printSuccess).toHaveBeenCalledWith('All packages are being used');
  });

  it('should handle scoped packages correctly', async () => {
    const mockDependencies = {
      '@scope/used-package': '^1.0.0',
      '@scope/unused-package': '^2.0.0'
    };

    const mockFiles = ['src/index.js'];

    mockGetAllDependencies.mockReturnValue(mockDependencies);
    mockFindProjectFiles.mockReturnValue(mockFiles);
    mockIsPackageUsed
      .mockReturnValueOnce(true)  // @scope/used-package
      .mockReturnValueOnce(false); // @scope/unused-package

    await detectUnusedPackages();

    expect(mockReporter.addResults).toHaveBeenCalledWith([
      {
        type: 'unused',
        packageName: '@scope/unused-package',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      }
    ]);
  });

  it('should handle mixed dependency types', async () => {
    const mockDependencies = {
      'prod-used': '^1.0.0',
      'prod-unused': '^2.0.0',
      'dev-used': '^3.0.0',
      'dev-unused': '^4.0.0',
      'peer-used': '^5.0.0',
      'peer-unused': '^6.0.0',
      'opt-used': '^7.0.0',
      'opt-unused': '^8.0.0'
    };

    const mockFiles = ['src/index.js'];

    mockGetAllDependencies.mockReturnValue(mockDependencies);
    mockFindProjectFiles.mockReturnValue(mockFiles);
    mockIsPackageUsed
      .mockReturnValueOnce(true)   // prod-used
      .mockReturnValueOnce(false)  // prod-unused
      .mockReturnValueOnce(true)   // dev-used
      .mockReturnValueOnce(false)  // dev-unused
      .mockReturnValueOnce(true)   // peer-used
      .mockReturnValueOnce(false)  // peer-unused
      .mockReturnValueOnce(true)   // opt-used
      .mockReturnValueOnce(false); // opt-unused

    await detectUnusedPackages();

    expect(mockReporter.addResults).toHaveBeenCalledWith([
      {
        type: 'unused',
        packageName: 'prod-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      },
      {
        type: 'unused',
        packageName: 'dev-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      },
      {
        type: 'unused',
        packageName: 'peer-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      },
      {
        type: 'unused',
        packageName: 'opt-unused',
        message: 'Not imported anywhere in the project',
        severity: 'medium'
      }
    ]);
  });

  it('should handle errors gracefully', async () => {
    mockGetAllDependencies.mockImplementation(() => {
      throw new Error('Failed to read package.json');
    });

    await detectUnusedPackages();

    expect(mockReporter.printError).toHaveBeenCalledWith(
      'Failed to detect unused packages: Failed to read package.json'
    );
  });
});
