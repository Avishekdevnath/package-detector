import { 
  readPackageJson, 
  getAllDependencies, 
  findProjectFiles, 
  extractImports, 
  executeNpmCommand, 
  parseNpmOutdated, 
  parseNpmLs, 
  isPackageUsed, 
  getPackageNameWithoutScope, 
  isScopedPackage,
  clearCaches,
  batchCheckPackageUsage
} from '../src/utils';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

// Mock fs and child_process modules
jest.mock('fs');
jest.mock('child_process');

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReaddirSync = readdirSync as jest.MockedFunction<typeof readdirSync>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('Utils', () => {
  beforeEach(() => {
    clearCaches();
    jest.clearAllMocks();
  });

  describe('readPackageJson', () => {
    it('should read and parse package.json successfully', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'test-dep': '^1.0.0'
        }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = readPackageJson();

      expect(result).toEqual(mockPackageJson);
      expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('package.json'), 'utf8');
    });

    it('should throw error when package.json does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => readPackageJson()).toThrow('package.json not found');
    });

    it('should throw error when package.json is invalid JSON', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      expect(() => readPackageJson()).toThrow('Failed to parse package.json');
    });
  });

  describe('getAllDependencies', () => {
    it('should merge all dependency types', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: { 'dep1': '^1.0.0' },
        devDependencies: { 'dev-dep1': '^2.0.0' },
        peerDependencies: { 'peer-dep1': '^3.0.0' },
        optionalDependencies: { 'opt-dep1': '^4.0.0' }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getAllDependencies();

      expect(result).toEqual({
        'dep1': '^1.0.0',
        'dev-dep1': '^2.0.0',
        'peer-dep1': '^3.0.0',
        'opt-dep1': '^4.0.0'
      });
    });

    it('should handle missing dependency types', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: { 'dep1': '^1.0.0' }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getAllDependencies();

      expect(result).toEqual({ 'dep1': '^1.0.0' });
    });
  });

  describe('findProjectFiles', () => {
    it('should find files with specified extensions', () => {
      const mockItems = ['file1.js', 'file2.ts', 'file3.txt', 'node_modules', 'subdir'];
      
      mockReaddirSync.mockReturnValue(mockItems as any);
      mockStatSync.mockImplementation((path: any) => {
        const name = String(path).split('/').pop() || String(path).split('\\').pop();
        const isDir = name === 'node_modules' || name === 'subdir';
        return {
          isDirectory: () => isDir,
          isFile: () => !isDir
        } as any;
      });

      const result = findProjectFiles();

      expect(result.some(path => path.includes('file1.js'))).toBe(true);
      expect(result.some(path => path.includes('file2.ts'))).toBe(true);
      expect(result.some(path => path.includes('file3.txt'))).toBe(false);
      expect(result.some(path => path.includes('node_modules'))).toBe(false);
    });

    it('should exclude specified directories', () => {
      const mockItems = ['src', 'node_modules', '.git'];
      
      mockReaddirSync.mockReturnValue(mockItems as any);
      mockStatSync.mockImplementation((path: any) => {
        const name = String(path).split('/').pop() || String(path).split('\\').pop();
        const isDir = name === 'src' || name === 'node_modules' || name === '.git';
        return {
          isDirectory: () => isDir,
          isFile: () => !isDir
        } as any;
      });

      const result = findProjectFiles();

      // Since src is a directory, it should be included in the scan
      // but since it's empty (no files), the result should be empty
      expect(result).toEqual([]);
      expect(result.some(path => path.includes('node_modules'))).toBe(false);
      expect(result.some(path => path.includes('.git'))).toBe(false);
    });

    it('should handle directory with files', () => {
      const mockItems = ['src', 'file1.js', 'file2.ts'];
      
      mockReaddirSync.mockReturnValue(mockItems as any);
      mockStatSync.mockImplementation((path: any) => {
        const name = String(path).split('/').pop() || String(path).split('\\').pop();
        const isDir = name === 'src';
        return {
          isDirectory: () => isDir,
          isFile: () => !isDir
        } as any;
      });

      const result = findProjectFiles();

      expect(result.some(path => path.includes('file1.js'))).toBe(true);
      expect(result.some(path => path.includes('file2.ts'))).toBe(true);
    });
  });

  describe('extractImports', () => {
    it('should extract ES6 imports', () => {
      const content = `
        import React from 'react';
        import { useState } from 'react';
        import * as utils from './utils';
        import { Component1, Component2 } from './components';
      `;

      mockReadFileSync.mockReturnValue(content);

      const result = extractImports('test.ts');

      expect(result).toContain('react');
      expect(result).toContain('./utils');
      expect(result).toContain('./components');
    });

    it('should extract CommonJS requires', () => {
      const content = `
        const fs = require('fs');
        const path = require("path");
        const utils = require('./utils');
      `;

      mockReadFileSync.mockReturnValue(content);

      const result = extractImports('test.js');

      expect(result).toContain('fs');
      expect(result).toContain('path');
      expect(result).toContain('./utils');
    });

    it('should handle file read errors gracefully', () => {
      // Suppress console warnings for this test
      const originalWarn = console.warn;
      console.warn = jest.fn();
      
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = extractImports('nonexistent.ts');

      expect(result).toEqual([]);
      
      // Restore console.warn
      console.warn = originalWarn;
    });
  });

  describe('executeNpmCommand', () => {
    it('should execute npm command successfully', () => {
      mockExecSync.mockReturnValue('npm output' as any);

      const result = executeNpmCommand('npm test');

      expect(result).toBe('npm output');
      expect(mockExecSync).toHaveBeenCalledWith('npm test', {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle npm command with non-zero exit code but valid stdout', () => {
      const error = new Error('Command failed');
      (error as any).stdout = 'npm output with error';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = executeNpmCommand('npm outdated');

      expect(result).toBe('npm output with error');
    });

    it('should throw error for failed npm command', () => {
      const error = new Error('Command failed');
      (error as any).stderr = 'npm error output';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      expect(() => executeNpmCommand('npm invalid')).toThrow('npm command failed: npm error output');
    });
  });

  describe('parseNpmOutdated', () => {
    it('should parse npm outdated output correctly', () => {
      const output = `
Package  Current  Wanted  Latest  Location
package1  1.0.0    1.0.1   2.0.0  node_modules/package1
package2  2.0.0    2.0.1   2.1.0  node_modules/package2
      `;

      const result = parseNpmOutdated(output);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        package: 'package1',
        current: '1.0.0',
        wanted: '1.0.1',
        latest: '2.0.0',
        location: 'node_modules/package1'
      });
    });

    it('should handle empty output', () => {
      const result = parseNpmOutdated('');
      expect(result).toEqual([]);
    });
  });

  describe('parseNpmLs', () => {
    it('should parse npm ls output correctly', () => {
      const output = `
├── package1@1.0.0
├── package2@2.0.0
└── package3@3.0.0
      `;

      const result = parseNpmLs(output);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'package1',
        version: '1.0.0'
      });
      expect(result[1]).toEqual({
        name: 'package2',
        version: '2.0.0'
      });
      expect(result[2]).toEqual({
        name: 'package3',
        version: '3.0.0'
      });
    });

    it('should handle empty output', () => {
      const result = parseNpmLs('');
      expect(result).toEqual([]);
    });

    it('should handle output with no matching lines', () => {
      const output = `
Some other text
Not a package line
      `;
      const result = parseNpmLs(output);
      expect(result).toEqual([]);
    });

    it('should test simple regex pattern', () => {
      const line = '├── package1@1.0.0';
      const match = line.match(/([^@\s]+)@([^\s]+)/);
      expect(match).toBeTruthy();
      if (match) {
        expect(match[1]).toBe('package1');
        expect(match[2]).toBe('1.0.0');
      }
    });

    it('should test with ASCII characters', () => {
      const line = '|-- package1@1.0.0';
      const match = line.match(/^[|]--\s+([^@]+)@([^\s]+)/);
      expect(match).toBeTruthy();
      if (match) {
        expect(match[1]).toBe('package1');
        expect(match[2]).toBe('1.0.0');
      }
    });
  });

  describe('isPackageUsed', () => {
    it('should detect exact package name match', () => {
      const projectFiles = ['test.js'];
      const content = "import React from 'react';";
      
      mockReadFileSync.mockReturnValue(content);

      const result = isPackageUsed('react', projectFiles);

      expect(result).toBe(true);
    });

    it('should detect scoped package usage', () => {
      const projectFiles = ['test.js'];
      const content = "import { Component } from '@mui/material';";
      
      mockReadFileSync.mockReturnValue(content);

      const result = isPackageUsed('@mui/material', projectFiles);

      expect(result).toBe(true);
    });

    it('should detect sub-module usage', () => {
      const projectFiles = ['test.js'];
      const content = "import utils from 'lodash/utils';";
      
      mockReadFileSync.mockReturnValue(content);

      const result = isPackageUsed('lodash', projectFiles);

      expect(result).toBe(true);
    });

    it('should return false for unused package', () => {
      const projectFiles = ['test.js'];
      const content = "import React from 'react';";
      
      mockReadFileSync.mockReturnValue(content);

      const result = isPackageUsed('unused-package', projectFiles);

      expect(result).toBe(false);
    });

    it('should use caching for repeated calls', () => {
      const projectFiles = ['test.js'];
      const content = "import React from 'react';";
      
      mockReadFileSync.mockReturnValue(content);

      // First call should read file
      const result1 = isPackageUsed('react', projectFiles);
      expect(result1).toBe(true);
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = isPackageUsed('react', projectFiles);
      expect(result2).toBe(true);
      expect(mockReadFileSync).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('Package name utilities', () => {
    it('should remove scope from scoped package name', () => {
      expect(getPackageNameWithoutScope('@scope/package')).toBe('package');
      expect(getPackageNameWithoutScope('package')).toBe('package');
    });

    it('should detect scoped packages', () => {
      expect(isScopedPackage('@scope/package')).toBe(true);
      expect(isScopedPackage('package')).toBe(false);
    });
  });
}); 