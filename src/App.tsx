import { useState, useEffect } from 'react'
import './App.css'

// Extend Window interface to include our electronAPI
declare global {
  interface Window {
    electronAPI: {
      redditAuth: (...args: any[]) => Promise<any>;
      downloadContent: (...args: any[]) => Promise<any>;
      getSavedContent: (...args: any[]) => Promise<any>;
      selectDirectory: (...args: any[]) => Promise<any>;
      saveFile: (...args: any[]) => Promise<any>;
      onMainProcessMessage: (callback: (message: string) => void) => void;
      onDownloadProgress: (callback: (progress: any) => void) => void;
      onAuthStatus: (callback: (status: any) => void) => void;
    };
  }
}

function App() {
  const [mainProcessMessage, setMainProcessMessage] = useState<string>('')
  const [isElectron, setIsElectron] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(window.electronAPI !== undefined)
    
    if (window.electronAPI) {
      // Listen for messages from the main process
      window.electronAPI.onMainProcessMessage((message: string) => {
        setMainProcessMessage(message)
      })
    }
  }, [])

  const handleRedditAuth = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.redditAuth()
        console.log('Reddit auth result:', result)
      } catch (error) {
        console.error('Reddit auth error:', error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Reddit Media Saver
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Download and organize your saved Reddit content locally
          </p>
          
          {isElectron ? (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                ✅ Running in Electron
              </div>
              {mainProcessMessage && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  Main Process: {mainProcessMessage}
                </div>
              )}
              <button
                onClick={handleRedditAuth}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Connect to Reddit
              </button>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ Running in browser mode (Electron features not available)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
