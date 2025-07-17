import './Timeline.css';
import type { TimelineItem } from '../store/context';
import { AudioPlayer } from './AudioPlayer';

const Timeline = ({ items = [] }: { items: TimelineItem[] }) => {
  const handleSendAudioToAnki = (item: TimelineItem) => {
    // TODO: Implement Anki audio integration
    console.log('Sending audio to Anki:', item.text);
  };

  const handleSendScreenshotToAnki = (item: TimelineItem) => {
    // TODO: Implement Anki screenshot integration
    console.log('Sending screenshot to Anki:', item.image);
  };

  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div key={item.id || index} className="timeline-item">
          <div className="timeline-content">
            <div className="timeline-image">
              <img src={item.image} alt={`Screenshot ${index + 1}`} />
            </div>
            <div className="timeline-text">
              <p>{item.text}</p>
              {item.audio && <AudioPlayer audioBlob={item.audio} />}
              {item.timestamp && (
                <small style={{ color: '#666', fontSize: '12px' }}>
                  {new Date(item.timestamp).toLocaleString()}
                </small>
              )}
            </div>
            <div className="timeline-actions">
              <button 
                onClick={() => handleSendAudioToAnki(item)}
                className="anki-button audio-button"
              >
                Send sentence audio to Anki
              </button>
              <button 
                onClick={() => handleSendScreenshotToAnki(item)}
                className="anki-button screenshot-button"
              >
                Send screenshot to Anki
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
