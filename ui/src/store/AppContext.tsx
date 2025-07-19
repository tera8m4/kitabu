import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, type TimelineItem } from './context';
import { WebSocketService } from '../services/websocket';
import { MediaStreamScreenshotService, type CaptureSettings } from '../services/screenshot';


interface AppState {
  isLoading: boolean;
  timelineItems: TimelineItem[];
  captureSettings: CaptureSettings;
  mediaStream: MediaStream | null;
  error: string | null;
}
const WebsocketURL = `ws://localhost:49156`;

const STORAGE_KEY = 'kitabu-settings';

const loadSettingsFromStorage = (): Partial<CaptureSettings> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return {};
  }
};

const saveSettingsToStorage = (settings: CaptureSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultSettings: CaptureSettings = {
    format: 'image/jpeg',
    quality: 0.9,
    autoDownload: true,
    frameRate: 3,
    intervalSeconds: 1,
  };

  const [state, setState] = useState<AppState>({
    isLoading: false,
    timelineItems: [],
    captureSettings: { ...defaultSettings, ...loadSettingsFromStorage() },
    mediaStream: null,
    error: null,
  });

  // Use ref to store current state for closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Service instances
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const screenshotServiceRef = useRef<MediaStreamScreenshotService | null>(null);

  // Derived state
  const isInitialized = state.mediaStream !== null && (wsServiceRef.current?.isConnected() ?? false);
  const navigate = useNavigate();

  const handleOCRMessage = async (ocrText: string) => {
    const image = await screenshotServiceRef.current?.captureFullScreenshot();
    if (image) {
      const newItem: TimelineItem = {
        id: Date.now().toString(),
        image,
        text: ocrText,
        timestamp: new Date(),
      };
      setState(prev => ({
        ...prev,
        timelineItems: [newItem, ...prev.timelineItems],
      }));
    }
  };

  const handleAudioMessage = (audio: Blob) => {
    const timelineItems = stateRef.current.timelineItems;
    if (timelineItems.length === 0) {
      return;
    }

    const id = timelineItems[0].id;
    updateTimelineItem(id, { audio });
  }

  const initializeApp = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request screen capture permission first
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: state.captureSettings.frameRate, max: state.captureSettings.frameRate }
        },
        audio: false
      });

      // Create screenshot service with the stream and settings
      const screenshotService = new MediaStreamScreenshotService(stream, state.captureSettings);
      screenshotServiceRef.current = screenshotService;

      // Initialize WebSocket service with screenshot service
      const wsService = new WebSocketService(WebsocketURL, screenshotService);
      wsService.setMessageHandler({
        onOCRMessage: handleOCRMessage,
        onError: (error) => console.error('WebSocket error:', error),
        onAudio: handleAudioMessage,
      });

      // Connect to WebSocket server
      await wsService.connect();
      wsServiceRef.current = wsService;

      // Store stream in state
      setState(prev => ({
        ...prev,
        isLoading: false,
        mediaStream: stream,
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

  const updateTimelineItem = (id: string, updates: Partial<TimelineItem>) => {
    setState(prev => ({
      ...prev,
      timelineItems: prev.timelineItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const updateCaptureSettings = (settings: Partial<CaptureSettings>) => {
    const newSettings = { ...state.captureSettings, ...settings };
    setState(prev => ({
      ...prev,
      captureSettings: newSettings,
    }));
    screenshotServiceRef.current?.updateCaptureSettings(newSettings);
    saveSettingsToStorage(newSettings);
  };

  const setMediaStream = (stream: MediaStream | null) => {
    setState(prev => ({ ...prev, mediaStream: stream }));
    screenshotServiceRef.current?.setMediaStream(stream);
  };


  return (
    <AppContext.Provider value={{
      state,
      initializeApp,
      addTimelineItem,
      updateTimelineItem,
      updateCaptureSettings,
      setMediaStream,
      isInitialized,
    }}>
      {children}
    </AppContext.Provider>
  );
};

