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
}

interface AppContextType {
  state: AppState;
  initializeApp: () => Promise<void>;
  addTimelineItem: (item: Omit<TimelineItem, 'id' | 'timestamp'>) => void;
  updateCaptureSettings: (settings: Partial<CaptureSettings>) => void;
  setMediaStream: (stream: MediaStream | null) => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  });

  // Derived state
  const isInitialized = state.mediaStream !== null;
  const navigate = useNavigate();

  const initializeApp = async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          frameRate: { ideal: state.captureSettings.frameRate, max: state.captureSettings.frameRate }
        },
        audio: false
      });

      // Store the stream in state
      setState(prev => ({
        ...prev,
        isLoading: false,
        mediaStream: stream
      }));

      navigate('/home');
    } catch (error) {
      console.error('Error requesting screen capture:', error);
      setState(prev => ({ ...prev, isLoading: false }));
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

  return (
    <AppContext.Provider value={{
      state,
      initializeApp,
      addTimelineItem,
      updateCaptureSettings,
      setMediaStream,
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
