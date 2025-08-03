import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Reddit Media Saver')).toBeInTheDocument();
  });

  it('renders the app description', () => {
    render(<App />);
    expect(
      screen.getByText(
        /Download and organize your saved Reddit content locally/
      )
    ).toBeInTheDocument();
  });

  it('shows browser mode warning when not in Electron', () => {
    // Mock window.electronAPI as undefined
    Object.defineProperty(window, 'electronAPI', {
      value: undefined,
      writable: true,
    });

    render(<App />);
    expect(screen.getByText(/Running in browser mode/)).toBeInTheDocument();
  });

  it('shows Electron status when in Electron', () => {
    // Mock window.electronAPI
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

    render(<App />);
    expect(screen.getByText(/Running in Electron/)).toBeInTheDocument();
  });
});
