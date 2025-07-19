import { createContext } from 'react';
import type { CaptureSettings } from '../services/screenshot';

export interface TimelineItem {
  id: string;
  image: Blob;
  text: string;
  timestamp: Date;
  audio?: Blob;
}

interface AppState {
  isLoading: boolean;
  timelineItems: TimelineItem[];
  captureSettings: CaptureSettings;
  mediaStream: MediaStream | null;
  error: string | null;
}

export interface AppContextType {
  state: AppState;
  initializeApp: () => Promise<void>;
  addTimelineItem: (item: Omit<TimelineItem, 'id' | 'timestamp'>) => void;
  updateTimelineItem: (id: string, updates: Partial<TimelineItem>) => void;
  updateCaptureSettings: (settings: Partial<CaptureSettings>) => void;
  setMediaStream: (stream: MediaStream | null) => void;
  isInitialized: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface ToastContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
