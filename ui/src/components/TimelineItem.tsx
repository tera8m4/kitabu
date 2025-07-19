import { useState, useContext } from 'react';
import type { TimelineItem as TimelineItemType } from '../store/context';
import { AppContext } from '../store/context';
import { AudioPlayer } from './AudioPlayer';
import { AnkiService } from '../services/anki';
import { useToastContext } from '../store/useToastContext';

interface TimelineItemProps {
  item: TimelineItemType;
  index: number;
}

export const TimelineItem = ({ item, index }: TimelineItemProps) => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('TimelineItem must be used within an AppProvider');
  }

  const { updateTimelineItem } = context;
  const { showSuccess, showError } = useToastContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSendAudioToAnki = (item: TimelineItemType) => {
    showError('Send audio is not implemented: ' + item.id);
  };

  const handleSendScreenshotToAnki = async (item: TimelineItemType) => {
    AnkiService.getInstance().sendScreenshotToAnki(item.image)
      .then(note => {
        showSuccess(`Picture for note ${note} was updated`);
      })
      .catch(err => {
        showError(`Failed to update. ${err.toString()}`)
      })
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleEditSave = () => {
    updateTimelineItem(item.id, { text: editText });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="timeline-item">
      <div className="timeline-content">
        <div className="timeline-image">
          <img src={URL.createObjectURL(item.image)} alt={`Screenshot ${index + 1}`} />
        </div>
        <div className="timeline-text">
          {isEditing ? (
            <div className="edit-text-container">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div className="edit-buttons">
                <button onClick={handleEditSave} className="save-button">Save</button>
                <button onClick={handleEditCancel} className="cancel-button">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="text-display">
              <p onClick={handleEditStart} style={{ cursor: 'pointer' }} title="Click to edit">
                {item.text}
              </p>
            </div>
          )}
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
            className="anki-button"
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
  );
};
