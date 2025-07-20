// Jest setup file
import { jest } from '@jest/globals';

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

// Also support chalk.bold.blue pattern
mockChalk.bold.blue = jest.fn((text: string) => text);

// Support all the chaining patterns used in the reporter
mockChalk.red.bold = jest.fn((text: string) => text);
mockChalk.green.bold = jest.fn((text: string) => text);
mockChalk.blue.bold = jest.fn((text: string) => text);
mockChalk.yellow.bold = jest.fn((text: string) => text);
mockChalk.magenta.bold = jest.fn((text: string) => text);
mockChalk.cyan.bold = jest.fn((text: string) => text);

jest.mock('chalk', () => ({
  default: mockChalk
}));

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