import React, { createContext, useContext, useState, } from 'react';
import { useNavigate } from 'react-router-dom';

export interface TimelineItem {
  id: string;
  image: string;
  text: string;
  timestamp: Date;
}

interface CaptureSettings {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number;
  autoDownload: boolean;
  frameRate: number;
  intervalSeconds: number;
}

interface AppState {
  isLoading: boolean;
  timelineItems: TimelineItem[];
  captureSettings: CaptureSettings;
  mediaStream: MediaStream | null;
  websocket: WebSocket | null;
  error: string | null;
}

interface AppContextType {
  state: AppState;
  initializeApp: () => Promise<void>;
  addTimelineItem: (item: Omit<TimelineItem, 'id' | 'timestamp'>) => void;
  updateCaptureSettings: (settings: Partial<CaptureSettings>) => void;
  setMediaStream: (stream: MediaStream | null) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const WebsocketURL = `ws://localhost:49156`;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    isLoading: false,
    timelineItems: [],
    captureSettings: {
      format: 'image/jpeg',
      quality: 0.9,
      autoDownload: true,
      frameRate: 3,
      intervalSeconds: 1,
    },
    mediaStream: null,
    websocket: null,
    error: null,
  });

  // Derived state
  const isInitialized = state.mediaStream !== null && state.websocket !== null;
  const navigate = useNavigate();

  const initializeApp = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Connect to WebSocket server
      const ws = new WebSocket(WebsocketURL);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = () => reject(new Error('Failed to connect to WebSocket server'));
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });

      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: state.captureSettings.frameRate, max: state.captureSettings.frameRate }
        },
        audio: false
      });

      // Store both stream and websocket in state
      setState(prev => ({
        ...prev,
        isLoading: false,
        mediaStream: stream,
        websocket: ws,
        error: null
      }));

      navigate('/home');
    } catch (error) {
      console.error('Error during initialization:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        if (error.message.includes('WebSocket')) {
          errorMessage = 'Failed to connect to server. Please check if the server is running.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Screen capture permission denied. Please allow screen sharing to continue.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No screen or window available for capture.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  };

  const addTimelineItem = (item: Omit<TimelineItem, 'id' | 'timestamp'>) => {
    const newItem: TimelineItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      timelineItems: [...prev.timelineItems, newItem],
    }));
  };

  const updateCaptureSettings = (settings: Partial<CaptureSettings>) => {
    setState(prev => ({
      ...prev,
      captureSettings: { ...prev.captureSettings, ...settings },
    }));
  };

  const setMediaStream = (stream: MediaStream | null) => {
    setState(prev => ({ ...prev, mediaStream: stream }));
  };

  const setWebSocket = (ws: WebSocket | null) => {
    setState(prev => ({ ...prev, websocket: ws }));
  };

  return (
    <AppContext.Provider value={{
      state,
      initializeApp,
      addTimelineItem,
      updateCaptureSettings,
      setMediaStream,
      setWebSocket,
      isInitialized,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
