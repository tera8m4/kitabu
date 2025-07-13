import './Timeline.css';
import type { TimelineItem } from '../store/context';

const Timeline = ({ items = [] }: { items: TimelineItem[] }) => {
  const reversedItems = [...items].reverse();

  return (
    <div className="timeline">
      {reversedItems.map((item, index) => (
        <div key={item.id || index} className="timeline-item">
          <div className="timeline-content">
            <div className="timeline-image">
              <img src={item.image} alt={`Screenshot ${index + 1}`} />
            </div>
            <div className="timeline-text">
              <p>{item.text}</p>
              {item.timestamp && (
                <small style={{ color: '#666', fontSize: '12px' }}>
                  {new Date(item.timestamp).toLocaleString()}
                </small>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
