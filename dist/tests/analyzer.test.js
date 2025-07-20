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
const analyzer_1 = require("../src/analyzer");
const reporter_1 = require("../src/reporter");
const utils_1 = require("../src/utils");
// Mock the modules
jest.mock('../src/reporter');
jest.mock('../src/utils');
const mockReporter = reporter_1.reporter;
const mockGetAllDependencies = utils_1.getAllDependencies;
const mockFindProjectFiles = utils_1.findProjectFiles;
const mockBatchCheckPackageUsage = utils_1.batchCheckPackageUsage;
describe('Analyzer - Unused Package Detection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReporter.clearResults.mockImplementation(() => { });
        mockReporter.addResults.mockImplementation(() => { });
        mockReporter.printInfo.mockImplementation(() => { });
        mockReporter.printSuccess.mockImplementation(() => { });
        mockReporter.printError.mockImplementation(() => { });
    });
    it('should detect unused packages successfully', () => __awaiter(void 0, void 0, void 0, function* () {
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
        mockBatchCheckPackageUsage.mockReturnValue({
            'used-package': true,
            'unused-package': false,
            'another-unused': false,
            'dev-unused': false
        });
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.printInfo).toHaveBeenCalledWith('Scanning project files for imports...');
        expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 2 project files to analyze');
        expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 3 truly unused packages');
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
    }));
    it('should handle projects with no unused packages', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockDependencies = {
            'used-package': '^1.0.0'
        };
        const mockFiles = ['src/index.js'];
        mockGetAllDependencies.mockReturnValue(mockDependencies);
        mockFindProjectFiles.mockReturnValue(mockFiles);
        mockBatchCheckPackageUsage.mockReturnValue({
            'used-package': true
        });
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.printSuccess).toHaveBeenCalledWith('✅ No unused packages found! All dependencies are being used.');
        expect(mockReporter.addResults).not.toHaveBeenCalled();
    }));
    it('should handle projects with no dependencies', () => __awaiter(void 0, void 0, void 0, function* () {
        mockGetAllDependencies.mockReturnValue({});
        mockFindProjectFiles.mockReturnValue([]);
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.printInfo).toHaveBeenCalledWith('No dependencies found in package.json');
        expect(mockReporter.addResults).not.toHaveBeenCalled();
    }));
    it('should handle projects with no project files', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockDependencies = {
            'some-package': '^1.0.0'
        };
        mockGetAllDependencies.mockReturnValue(mockDependencies);
        mockFindProjectFiles.mockReturnValue([]);
        mockBatchCheckPackageUsage.mockReturnValue({
            'some-package': false
        });
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 0 project files to analyze');
        expect(mockReporter.printInfo).toHaveBeenCalledWith('Found 1 truly unused packages');
        expect(mockReporter.addResults).toHaveBeenCalledWith([
            {
                type: 'unused',
                packageName: 'some-package',
                message: 'Not imported anywhere in the project',
                severity: 'medium'
            }
        ]);
    }));
    it('should handle scoped packages correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockDependencies = {
            '@scope/used-package': '^1.0.0',
            '@scope/unused-package': '^2.0.0'
        };
        const mockFiles = ['src/index.js'];
        mockGetAllDependencies.mockReturnValue(mockDependencies);
        mockFindProjectFiles.mockReturnValue(mockFiles);
        mockBatchCheckPackageUsage.mockReturnValue({
            '@scope/used-package': true,
            '@scope/unused-package': false
        });
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.addResults).toHaveBeenCalledWith([
            {
                type: 'unused',
                packageName: '@scope/unused-package',
                message: 'Not imported anywhere in the project',
                severity: 'medium'
            }
        ]);
    }));
    it('should handle mixed dependency types', () => __awaiter(void 0, void 0, void 0, function* () {
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
        mockBatchCheckPackageUsage.mockReturnValue({
            'prod-used': true,
            'prod-unused': false,
            'dev-used': true,
            'dev-unused': false,
            'peer-used': true,
            'peer-unused': false,
            'opt-used': true,
            'opt-unused': false
        });
        yield (0, analyzer_1.detectUnusedPackages)();
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
    }));
    it('should handle errors gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
        mockGetAllDependencies.mockImplementation(() => {
            throw new Error('Failed to read package.json');
        });
        yield (0, analyzer_1.detectUnusedPackages)();
        expect(mockReporter.printError).toHaveBeenCalledWith('Failed to detect unused packages: Failed to read package.json');
    }));
});
