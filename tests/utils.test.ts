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
  isScopedPackage 
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
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should find files with specified extensions', () => {
      const mockItems = [
        { name: 'file1.js', isDirectory: () => false },
        { name: 'file2.ts', isDirectory: () => false },
        { name: 'file3.txt', isDirectory: () => false },
        { name: 'node_modules', isDirectory: () => true },
        { name: 'subdir', isDirectory: () => true }
      ];

      // Mock the file system operations
      mockReaddirSync.mockReturnValue(mockItems as any);
      mockStatSync.mockImplementation((path: any) => {
        const name = String(path).split('/').pop() || String(path).split('\\').pop();
        const item = mockItems.find(item => item.name === name);
        return {
          isDirectory: () => item?.isDirectory() || false,
          isFile: () => !item?.isDirectory()
        } as any;
      });

      const result = findProjectFiles();

      expect(result).toContain('file1.js');
      expect(result).toContain('file2.ts');
      expect(result).not.toContain('file3.txt');
      expect(result).not.toContain('node_modules');
    });

    it('should exclude specified directories', () => {
      const mockItems = [
        { name: 'src', isDirectory: () => true },
        { name: 'node_modules', isDirectory: () => true },
        { name: '.git', isDirectory: () => true }
      ];

      mockReaddirSync.mockReturnValue(mockItems as any);
      mockStatSync.mockImplementation((path: any) => {
        const name = String(path).split('/').pop() || String(path).split('\\').pop();
        const item = mockItems.find(item => item.name === name);
        return {
          isDirectory: () => item?.isDirectory() || false,
          isFile: () => !item?.isDirectory()
        } as any;
      });

      const result = findProjectFiles();

      expect(result).toContain('src');
      expect(result).not.toContain('node_modules');
      expect(result).not.toContain('.git');
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
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = extractImports('nonexistent.ts');

      expect(result).toEqual([]);
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