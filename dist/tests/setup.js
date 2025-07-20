"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest setup file
const globals_1 = require("@jest/globals");
// Mock console.log to capture output in tests
const originalConsoleLog = console.log;
beforeEach(() => {
    console.log = globals_1.jest.fn();
});
afterEach(() => {
    console.log = originalConsoleLog;
});
// Global test timeout
globals_1.jest.setTimeout(10000);
