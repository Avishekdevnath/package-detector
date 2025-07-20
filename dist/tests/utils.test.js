"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/utils");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
// Mock fs and child_process modules
jest.mock('fs');
jest.mock('child_process');
const mockReadFileSync = fs_1.readFileSync;
const mockExistsSync = fs_1.existsSync;
const mockReaddirSync = fs_1.readdirSync;
const mockStatSync = fs_1.statSync;
const mockExecSync = child_process_1.execSync;
describe('Utils', () => {
    beforeEach(() => {
        (0, utils_1.clearCaches)();
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
            const result = (0, utils_1.readPackageJson)();
            expect(result).toEqual(mockPackageJson);
            expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('package.json'), 'utf8');
        });
        it('should throw error when package.json does not exist', () => {
            mockExistsSync.mockReturnValue(false);
            expect(() => (0, utils_1.readPackageJson)()).toThrow('package.json not found');
        });
        it('should throw error when package.json is invalid JSON', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json');
            expect(() => (0, utils_1.readPackageJson)()).toThrow('Failed to parse package.json');
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
            const result = (0, utils_1.getAllDependencies)();
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
            const result = (0, utils_1.getAllDependencies)();
            expect(result).toEqual({ 'dep1': '^1.0.0' });
        });
    });
    describe('findProjectFiles', () => {
        it('should find files with specified extensions', () => {
            const mockItems = ['file1.js', 'file2.ts', 'file3.txt', 'node_modules', 'subdir'];
            mockReaddirSync.mockReturnValue(mockItems);
            mockStatSync.mockImplementation((path) => {
                const name = String(path).split('/').pop() || String(path).split('\\').pop();
                const isDir = name === 'node_modules' || name === 'subdir';
                return {
                    isDirectory: () => isDir,
                    isFile: () => !isDir
                };
            });
            const result = (0, utils_1.findProjectFiles)();
            expect(result.some(path => path.includes('file1.js'))).toBe(true);
            expect(result.some(path => path.includes('file2.ts'))).toBe(true);
            expect(result.some(path => path.includes('file3.txt'))).toBe(false);
            expect(result.some(path => path.includes('node_modules'))).toBe(false);
        });
        it('should exclude specified directories', () => {
            const mockItems = ['src', 'node_modules', '.git'];
            mockReaddirSync.mockReturnValue(mockItems);
            mockStatSync.mockImplementation((path) => {
                const name = String(path).split('/').pop() || String(path).split('\\').pop();
                const isDir = name === 'src' || name === 'node_modules' || name === '.git';
                return {
                    isDirectory: () => isDir,
                    isFile: () => !isDir
                };
            });
            const result = (0, utils_1.findProjectFiles)();
            // Since src is a directory, it should be included in the scan
            // but since it's empty (no files), the result should be empty
            expect(result).toEqual([]);
            expect(result.some(path => path.includes('node_modules'))).toBe(false);
            expect(result.some(path => path.includes('.git'))).toBe(false);
        });
        it('should handle directory with files', () => {
            const mockItems = ['src', 'file1.js', 'file2.ts'];
            mockReaddirSync.mockReturnValue(mockItems);
            mockStatSync.mockImplementation((path) => {
                const name = String(path).split('/').pop() || String(path).split('\\').pop();
                const isDir = name === 'src';
                return {
                    isDirectory: () => isDir,
                    isFile: () => !isDir
                };
            });
            const result = (0, utils_1.findProjectFiles)();
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
            const result = (0, utils_1.extractImports)('test.ts');
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
            const result = (0, utils_1.extractImports)('test.js');
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
            const result = (0, utils_1.extractImports)('nonexistent.ts');
            expect(result).toEqual([]);
            // Restore console.warn
            console.warn = originalWarn;
        });
    });
    describe('executeNpmCommand', () => {
        it('should execute npm command successfully', () => {
            mockExecSync.mockReturnValue('npm output');
            const result = (0, utils_1.executeNpmCommand)('npm test');
            expect(result).toBe('npm output');
            expect(mockExecSync).toHaveBeenCalledWith('npm test', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
        });
        it('should handle npm command with non-zero exit code but valid stdout', () => {
            const error = new Error('Command failed');
            error.stdout = 'npm output with error';
            mockExecSync.mockImplementation(() => {
                throw error;
            });
            const result = (0, utils_1.executeNpmCommand)('npm outdated');
            expect(result).toBe('npm output with error');
        });
        it('should throw error for failed npm command', () => {
            const error = new Error('Command failed');
            error.stderr = 'npm error output';
            mockExecSync.mockImplementation(() => {
                throw error;
            });
            expect(() => (0, utils_1.executeNpmCommand)('npm invalid')).toThrow('npm command failed: npm error output');
        });
    });
    describe('parseNpmOutdated', () => {
        it('should parse npm outdated output correctly', () => {
            const output = `
Package  Current  Wanted  Latest  Location
package1  1.0.0    1.0.1   2.0.0  node_modules/package1
package2  2.0.0    2.0.1   2.1.0  node_modules/package2
      `;
            const result = (0, utils_1.parseNpmOutdated)(output);
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
            const result = (0, utils_1.parseNpmOutdated)('');
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
            const result = (0, utils_1.parseNpmLs)(output);
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
            const result = (0, utils_1.parseNpmLs)('');
            expect(result).toEqual([]);
        });
        it('should handle output with no matching lines', () => {
            const output = `
Some other text
Not a package line
      `;
            const result = (0, utils_1.parseNpmLs)(output);
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
            const result = (0, utils_1.isPackageUsed)('react', projectFiles);
            expect(result).toBe(true);
        });
        it('should detect scoped package usage', () => {
            const projectFiles = ['test.js'];
            const content = "import { Component } from '@mui/material';";
            mockReadFileSync.mockReturnValue(content);
            const result = (0, utils_1.isPackageUsed)('@mui/material', projectFiles);
            expect(result).toBe(true);
        });
        it('should detect sub-module usage', () => {
            const projectFiles = ['test.js'];
            const content = "import utils from 'lodash/utils';";
            mockReadFileSync.mockReturnValue(content);
            const result = (0, utils_1.isPackageUsed)('lodash', projectFiles);
            expect(result).toBe(true);
        });
        it('should return false for unused package', () => {
            const projectFiles = ['test.js'];
            const content = "import React from 'react';";
            mockReadFileSync.mockReturnValue(content);
            const result = (0, utils_1.isPackageUsed)('unused-package', projectFiles);
            expect(result).toBe(false);
        });
        it('should use caching for repeated calls', () => {
            const projectFiles = ['test.js'];
            const content = "import React from 'react';";
            mockReadFileSync.mockReturnValue(content);
            // First call should read file
            const result1 = (0, utils_1.isPackageUsed)('react', projectFiles);
            expect(result1).toBe(true);
            expect(mockReadFileSync).toHaveBeenCalledTimes(1);
            // Second call should use cache
            const result2 = (0, utils_1.isPackageUsed)('react', projectFiles);
            expect(result2).toBe(true);
            expect(mockReadFileSync).toHaveBeenCalledTimes(1); // Still 1, not 2
        });
    });
    describe('Package name utilities', () => {
        it('should remove scope from scoped package name', () => {
            expect((0, utils_1.getPackageNameWithoutScope)('@scope/package')).toBe('package');
            expect((0, utils_1.getPackageNameWithoutScope)('package')).toBe('package');
        });
        it('should detect scoped packages', () => {
            expect((0, utils_1.isScopedPackage)('@scope/package')).toBe(true);
            expect((0, utils_1.isScopedPackage)('package')).toBe(false);
        });
    });
});
