import { createContext } from 'react';

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

export interface AppContextType {
  state: AppState;
  initializeApp: () => Promise<void>;
  addTimelineItem: (item: Omit<TimelineItem, 'id' | 'timestamp'>) => void;
  updateCaptureSettings: (settings: Partial<CaptureSettings>) => void;
  setMediaStream: (stream: MediaStream | null) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  isInitialized: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);