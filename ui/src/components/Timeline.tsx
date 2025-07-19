import './Timeline.css';
import type { TimelineItem } from '../store/context';
import { TimelineItem as TimelineItemComponent } from './TimelineItem';

const Timeline = ({ items = [] }: { items: TimelineItem[] }) => {
  return (
    <div className="timeline">
      {items.map((item, index) => (
        <TimelineItemComponent key={item.id || index} item={item} index={index} />
      ))}
    </div>
  );
};

export default Timeline;
