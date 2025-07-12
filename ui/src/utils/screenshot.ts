export interface ScreenshotOptions {
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
  width?: number;
  height?: number;
}

export interface CaptureTarget {
  type: 'screen' | 'window';
  video?: boolean;
  audio?: boolean;
}

export class ScreenshotUtil {
  private static canvas: HTMLCanvasElement | null = null;
  private static ctx: CanvasRenderingContext2D | null = null;

  private static getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
    return this.canvas;
  }

  static async captureFromStream(
    stream: MediaStream,
    options: ScreenshotOptions = {}
  ): Promise<string> {
    const {
      format = 'image/jpeg',
      quality = 0.9,
      width,
      height
    } = options;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.srcObject = null;
        video.remove();
      };

      const captureFrame = () => {
        try {
          const canvas = this.getCanvas();
          const ctx = this.ctx!;

          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          if (videoWidth === 0 || videoHeight === 0) {
            cleanup();
            reject(new Error('Video dimensions are invalid'));
            return;
          }

          canvas.width = width || videoWidth;
          canvas.height = height || videoHeight;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL(format, quality);
          cleanup();
          resolve(dataUrl);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onloadedmetadata = () => {
        video.play().then(() => {
          // Wait a bit for the video to start playing and render a frame
          setTimeout(captureFrame, 100);
        }).catch(reject);
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video stream'));
      };

      // Timeout fallback
      setTimeout(() => {
        cleanup();
        reject(new Error('Screenshot capture timeout'));
      }, 5000);
    });
  }

  static async downloadScreenshot(
    dataUrl: string,
    filename: string = `screenshot-${Date.now()}.jpg`
  ): Promise<void> {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  static async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const screenshotUtils = {
  captureFromStream: (stream: MediaStream, options?: ScreenshotOptions) =>
    ScreenshotUtil.captureFromStream(stream, options),

  download: (dataUrl: string, filename?: string) =>
    ScreenshotUtil.downloadScreenshot(dataUrl, filename),

  toBlob: (dataUrl: string) => ScreenshotUtil.dataUrlToBlob(dataUrl),

  fromBlob: (blob: Blob) => ScreenshotUtil.blobToDataUrl(blob)
};
