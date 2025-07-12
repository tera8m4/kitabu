import { useState } from 'react';
import Timeline from '../components/Timeline';
import { useApp } from '../store/useApp';
import { screenshotUtils } from '../utils/screenshot';

const Home = () => {
  const { state, addTimelineItem } = useApp();
  const [isCapturing, setIsCapturing] = useState(false);

  const handleTakeScreenshot = async () => {
    if (!state.mediaStream) {
      alert('Please start screen capture first from the landing page');
      return;
    }

    setIsCapturing(true);
    try {
      const screenshot = await screenshotUtils.captureFromStream(
        state.mediaStream,
        {
          format: state.captureSettings.format,
          quality: state.captureSettings.quality
        }
      );

      addTimelineItem({
        image: screenshot,
        text: 'OCR text will be extracted here'
      });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      alert('Failed to take screenshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Timeline with Screenshots and OCR</h1>
        <button
          onClick={handleTakeScreenshot}
          disabled={isCapturing || !state.mediaStream}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: isCapturing ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isCapturing || !state.mediaStream ? 'not-allowed' : 'pointer'
          }}
        >
          {isCapturing ? 'Taking Screenshot...' : '📸 Take Screenshot'}
        </button>
      </div>
      <Timeline items={state.timelineItems} />
    </div>
  );
};

export default Home;
