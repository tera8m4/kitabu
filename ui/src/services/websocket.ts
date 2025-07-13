import * as flatbuffers from 'flatbuffers';
import {
  Message, MessageData, InitializationMessage, 
  ResponseScreenShot, OCRMessage,
  ImageFormat
} from '../schemas/protocol';
import { MediaStreamScreenshotService } from './screenshot';

export type MessageHandler = {
  onOCRMessage?: (text: string) => void;
  onError?: (error: Error) => void;
};

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler = {};

  constructor(private url: string, private screenshotService: MediaStreamScreenshotService) {}

  setMessageHandler(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  async connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      
      ws.onopen = () => {
        ws.binaryType = 'arraybuffer';
        ws.onmessage = this.handleMessage.bind(this);
        this.sendInitializationMessage(ws);
        this.ws = ws;
        resolve(ws);
      };
      
      ws.onerror = () => reject(new Error('Failed to connect to WebSocket server'));
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  }

  private sendInitializationMessage(ws: WebSocket) {
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
  }

  sendScreenshotResponse(imageData: Uint8Array) {
    if (!this.ws) return;

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
    this.ws.send(builder.asUint8Array());
  }

  private async handleMessage(event: MessageEvent) {
    try {
      const buffer = new Uint8Array(event.data);
      const bb = new flatbuffers.ByteBuffer(buffer);
      const message = Message.getRootAsMessage(bb);
      const messageType = message.dataType();

      switch (messageType) {
        case MessageData.RequestScreenshot: {
          const imageData = await this.screenshotService.captureScreenshot();
          if (imageData) {
            this.sendScreenshotResponse(imageData);
          }
          break;
        }
        case MessageData.OCRMessage: {
          const ocr = new OCRMessage();
          message.data(ocr);
          const ocrText = ocr.text();
          
          if (ocrText && this.messageHandler.onOCRMessage) {
            this.messageHandler.onOCRMessage(ocrText);
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      if (this.messageHandler.onError) {
        this.messageHandler.onError(error as Error);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getWebSocket(): WebSocket | null {
    return this.ws;
  }
}