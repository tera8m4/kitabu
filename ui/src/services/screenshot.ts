export interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureSettings {
  format: 'image/png' | 'image/jpeg' | 'image/webp';
  quality: number;
  autoDownload: boolean;
  frameRate: number;
  intervalSeconds: number;
  cropRectangle?: CropRectangle;
}

export class MediaStreamScreenshotService {
  private mediaStream: MediaStream | null = null;
  private captureSettings: CaptureSettings;

  constructor(mediaStream?: MediaStream | null, captureSettings?: CaptureSettings) {
    this.mediaStream = mediaStream || null;
    this.captureSettings = captureSettings || {
      format: 'image/png',
      quality: 0.9,
      autoDownload: false,
      frameRate: 3,
      intervalSeconds: 1,
    };
  }

  setMediaStream(stream: MediaStream | null) {
    this.mediaStream = stream;
  }

  updateCaptureSettings(settings: CaptureSettings) {
    this.captureSettings = settings;
  }

  async captureScreenshot(fullscreen: boolean = false): Promise<Uint8Array | null> {
    if (!this.mediaStream) return null;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');

      video.srcObject = this.mediaStream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const crop = this.captureSettings.cropRectangle;
      if (crop && !fullscreen) {
        canvas.width = crop.width;
        canvas.height = crop.height;
        ctx?.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buffer => {
              resolve(new Uint8Array(buffer));
            });
          } else {
            resolve(null);
          }
        }, this.captureSettings.format, this.captureSettings.quality);
      });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }

  async captureFullScreenshotAsBase64(): Promise<string | null> {
    const imageData = await this.captureScreenshot(true);
    if (!imageData) return null;

    return new Promise((resolve) => {
      const blob = new Blob([imageData], { type: this.captureSettings.format });
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }
}