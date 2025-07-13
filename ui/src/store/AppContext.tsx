import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, type TimelineItem } from './context';
import * as flatbuffers from 'flatbuffers';
import {
  Message, MessageData, InitializationMessage, 
  ResponseScreenShot, OCRMessage,
  ImageFormat} from '../schemas/protocol';

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

  // Use ref to store current state for closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Derived state
  const isInitialized = state.mediaStream !== null && state.websocket !== null;
  const navigate = useNavigate();

  const sendInitializationMessage = (ws: WebSocket) => {
    const builder = new flatbuffers.Builder(1024);

    const initMessageOffset = InitializationMessage.createInitializationMessage(builder);

    const messageOffset = Message.createMessage(
      builder,
      BigInt(Date.now()),
      MessageData.InitializationMessage,
      initMessageOffset
    );

    builder.finish(messageOffset);
    ws.send(builder.asUint8Array());
  };

  const captureScreenshotData = async (): Promise<Uint8Array | null> => {
    const currentState = stateRef.current;
    if (!currentState.mediaStream) return null;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');

      video.srcObject = currentState.mediaStream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buffer => {
              resolve(new Uint8Array(buffer));
            });
          } else {
            resolve(null);
          }
        }, 'image/png');
      });

    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };

  const sendScreenshotResponse = (imageData: Uint8Array) => {
    const currentState = stateRef.current;
    if (!currentState.websocket) return;

    const builder = new flatbuffers.Builder(imageData.length + 1024);

    const keyOffset = builder.createString('screenshot');
    const imageOffset = ResponseScreenShot.createImageVector(builder, imageData);

    const responseScreenShotOffset = ResponseScreenShot.createResponseScreenShot(
      builder,
      keyOffset,
      ImageFormat.PNG,
      imageOffset
    );

    const responseOffset = Message.createMessage(
      builder,
      BigInt(Date.now()),
      MessageData.ResponseScreenShot,
      responseScreenShotOffset
    );

    builder.finish(responseOffset);
    currentState.websocket.send(builder.asUint8Array());
  };

  const handleScreenshotRequest = async () => {
    const imageData = await captureScreenshotData();
    if (imageData) {
      sendScreenshotResponse(imageData);
    }
  };

  const handleWebSocketMessage = async (event: MessageEvent) => {
    try {
      const buffer = new Uint8Array(event.data);
      const bb = new flatbuffers.ByteBuffer(buffer);
      const message = Message.getRootAsMessage(bb);

      const messageType = message.dataType();
 

      if (messageType === MessageData.RequestScreenshot) {
        await handleScreenshotRequest();
      } else if (messageType === MessageData.OCRMessage) {
        const ocr = new OCRMessage();
        message.data(ocr);
        const ocrText = ocr.text();
        
        if (ocrText) {
          // Capture current screenshot to add with OCR text
          const imageData = await captureScreenshotData();
          if (imageData) {
            // Convert image data to base64 data URL
            const blob = new Blob([imageData], { type: 'image/png' });
            const reader = new FileReader();
            reader.onload = () => {
              const base64Image = reader.result as string;
              
              // Add to timeline with screenshot and OCR text
              const newItem: TimelineItem = {
                id: Date.now().toString(),
                image: base64Image,
                text: ocrText,
                timestamp: new Date(),
              };
              
              setState(prev => ({
                ...prev,
                timelineItems: [...prev.timelineItems, newItem],
              }));
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  const initializeApp = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Connect to WebSocket server
      const ws = new WebSocket(WebsocketURL);

      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          ws.binaryType = 'arraybuffer';
          ws.onmessage = handleWebSocketMessage;
          sendInitializationMessage(ws);
          resolve(undefined);
        };
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

