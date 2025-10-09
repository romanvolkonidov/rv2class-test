// Electron-specific screen sharing component
// This file should be imported in your CustomControlBar.tsx when running in Electron

export interface ElectronSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

export class ElectronScreenShare {
  private static isElectron(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).electronAPI?.isElectron === true;
  }

  /**
   * Get available screen/window sources from Electron
   */
  static async getSources(): Promise<ElectronSource[]> {
    if (!this.isElectron()) {
      throw new Error('Not running in Electron');
    }

    try {
      const sources = await (window as any).electronAPI.getScreenSources();
      return sources;
    } catch (error) {
      console.error('Error getting Electron sources:', error);
      return [];
    }
  }

  /**
   * Get screen share stream with system audio support
   * @param sourceId - The Electron source ID from getSources()
   * @param includeAudio - Whether to capture system audio (only works in Electron!)
   */
  static async getStream(sourceId: string, includeAudio: boolean = true): Promise<MediaStream> {
    if (!this.isElectron()) {
      throw new Error('Not running in Electron');
    }

    try {
      // Get the constraints from Electron main process
      const constraints = await (window as any).electronAPI.getScreenStream(sourceId, includeAudio);
      
      // Use navigator.mediaDevices.getUserMedia with Electron-specific constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      return stream;
    } catch (error) {
      console.error('Error getting Electron stream:', error);
      throw error;
    }
  }

  /**
   * Show Electron-based screen picker UI
   * Returns the selected stream with audio, or null if cancelled
   */
  static async showPicker(includeAudio: boolean = true): Promise<MediaStream | null> {
    if (!this.isElectron()) {
      // Fall back to browser screen share
      try {
        return await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: includeAudio
        });
      } catch (error) {
        console.error('Browser screen share failed:', error);
        return null;
      }
    }

    // Electron-specific picker
    const sources = await this.getSources();
    
    if (sources.length === 0) {
      throw new Error('No screen sources available');
    }

    // TODO: Show a custom UI to let user pick a source
    // For now, we'll use the first screen source
    // You can create a modal component to show thumbnails
    
    // Example: Auto-select first screen (you should show UI instead)
    const selectedSource = sources.find(s => s.name.includes('Entire Screen')) || sources[0];
    
    return await this.getStream(selectedSource.id, includeAudio);
  }
}

// Type declarations for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getScreenSources: () => Promise<ElectronSource[]>;
      getScreenStream: (sourceId: string, includeAudio: boolean) => Promise<any>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
    isElectron?: boolean;
  }
}
