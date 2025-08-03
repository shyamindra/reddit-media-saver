import '@testing-library/jest-dom';

// Mock Electron API for tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    redditAuth: jest.fn(),
    downloadContent: jest.fn(),
    getSavedContent: jest.fn(),
    selectDirectory: jest.fn(),
    saveFile: jest.fn(),
    onMainProcessMessage: jest.fn(),
    onDownloadProgress: jest.fn(),
    onAuthStatus: jest.fn(),
  },
  writable: true,
});
