const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screen sharing with audio support
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  
  getScreenStream: (sourceId, includeAudio) => 
    ipcRenderer.invoke('get-screen-stream', sourceId, includeAudio),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Check if running in Electron
  isElectron: true
});

// Also expose a simpler check
contextBridge.exposeInMainWorld('isElectron', true);
