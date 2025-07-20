// Jest setup file
import { jest } from '@jest/globals';

// Mock console.log to capture output in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

// Global test timeout
jest.setTimeout(10000); 