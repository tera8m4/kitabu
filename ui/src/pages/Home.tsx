import React, { useEffect } from 'react';
import Timeline from '../components/Timeline';
import { useApp } from '../store/AppContext';

const Home = () => {
  const { state } = useApp();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Timeline with Screenshots and OCR</h1>
      <Timeline items={state.timelineItems} />
    </div>
  );
};

export default Home;
