import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../store/context';
import type { CropRectangle } from '../services/screenshot';
import './Settings.css';

const Settings = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('Settings must be used within an AppProvider');
  }

  const { state, updateCaptureSettings } = context;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRectangle | null>(
    state.captureSettings.cropRectangle || null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (state.mediaStream && videoRef.current) {
      videoRef.current.srcObject = state.mediaStream;
      videoRef.current.play();
      videoRef.current.onloadedmetadata = () => {
        capturePreview();
      };
    }
  }, [state.mediaStream]);

  useEffect(() => {
    if (cropRect) {
      updateCaptureSettings({ cropRectangle: cropRect });
    }
  }, [cropRect]);

  const capturePreview = () => {
    if (!state.mediaStream || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0);

    if (cropRect) {
      ctx!.strokeStyle = '#ff0000';
      ctx!.lineWidth = 2;
      ctx!.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    setDragStart(coords);
    setIsDragging(true);
    setCropRect({ ...coords, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;
    
    const coords = getCanvasCoordinates(e);
    const width = coords.x - dragStart.x;
    const height = coords.y - dragStart.y;
    
    setCropRect({
      x: width >= 0 ? dragStart.x : coords.x,
      y: height >= 0 ? dragStart.y : coords.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
    
    capturePreview();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setDragStart(null);
  };

  const clearCropSettings = () => {
    setCropRect(null);
    updateCaptureSettings({ cropRectangle: undefined });
    capturePreview();
  };

  if (!state.mediaStream) {
    return (
      <div className="settings">
        <h1>Settings</h1>
        <p>Please initialize screen capture first to configure crop settings.</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <h1>Settings</h1>
      
      <div className="settings-section">
        <h2>Crop Rectangle</h2>
        <p>Drag on the preview to select a crop area. Changes are applied automatically.</p>
        
        <div className="preview-container">
          <video 
            ref={videoRef}
            style={{ display: 'none' }}
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="preview-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              cursor: 'crosshair'
            }}
          />
        </div>

        <div className="crop-controls">
          <button onClick={clearCropSettings} className="btn-secondary">
            Clear Crop
          </button>
        </div>

        {cropRect && (
          <div className="crop-info">
            <p>Selected area: {Math.round(cropRect.width)} × {Math.round(cropRect.height)} pixels</p>
            <p>Position: ({Math.round(cropRect.x)}, {Math.round(cropRect.y)})</p>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Capture Settings</h2>
        <div className="setting-group">
          <label>
            Format:
            <select 
              value={state.captureSettings.format}
              onChange={(e) => updateCaptureSettings({ 
                format: e.target.value as 'image/png' | 'image/jpeg' | 'image/webp' 
              })}
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>
        </div>
        
        <div className="setting-group">
          <label>
            Quality: {Math.round(state.captureSettings.quality * 100)}%
            <input 
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={state.captureSettings.quality}
              onChange={(e) => updateCaptureSettings({ quality: parseFloat(e.target.value) })}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;