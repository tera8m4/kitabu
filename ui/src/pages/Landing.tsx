import { useApp } from '../store/AppContext';

const Landing = () => {
  const { state, initializeApp } = useApp();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1>🖥️ Kitabu</h1>
      <p>Click the button below to start OCR your VN!</p>

      <button
        onClick={initializeApp}
        disabled={state.isLoading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: state.isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: state.isLoading ? 'not-allowed' : 'pointer',
          marginTop: '20px'
        }}
      >
        {state.isLoading ? 'Requesting Screen Access...' : 'Start Screen Capture'}
      </button>

      {state.isLoading && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Please select a screen or window to capture when prompted
          </p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};

export default Landing;
