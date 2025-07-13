import Timeline from '../components/Timeline';
import { useApp } from '../store/useApp';

const Home = () => {
  const { state } = useApp();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Timeline with Screenshots and OCR</h1>
      </div>
      <Timeline items={state.timelineItems} />
    </div>
  );
};

export default Home;
