import './Timeline.css';
import type { TimelineItem } from '../store/context';
import { AudioPlayer } from './AudioPlayer';
import { AnkiService } from '../services/anki';
import { useToastContext } from '../store/useToastContext';

const Timeline = ({ items = [] }: { items: TimelineItem[] }) => {

  const { showSuccess, showError } = useToastContext();
  const handleSendAudioToAnki = (item: TimelineItem) => {
    showError('Send audio is not implemented: ' + item.id);
  };

  const handleSendScreenshotToAnki = async (item: TimelineItem) => {
    AnkiService.getInstance().sendScreenshotToAnki(item.image)
      .then(note => {
        showSuccess(`Picture for note ${note} was updated`);
      })
      .catch(err => {
        showError(`Failed to update. ${err.toString()}`)
      })
  };


  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div key={item.id || index} className="timeline-item">
          <div className="timeline-content">
            <div className="timeline-image">
              <img src={URL.createObjectURL(item.image)} alt={`Screenshot ${index + 1}`} />
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
