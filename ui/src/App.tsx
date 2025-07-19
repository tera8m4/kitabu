import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Home from './pages/Home';
import About from './pages/About';
import './App.css'
import Settings from './pages/Settings';
import { ToastProvider } from './store/ToastContext';

function App() {
  return (
    <Router>
      <ToastProvider>
        <AppProvider>
          <div className="app">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={
                <ProtectedRoute>
                  <Navigation />
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Navigation />
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/about" element={
                <ProtectedRoute>
                  <Navigation />
                  <About />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </AppProvider>
      </ToastProvider>
    </Router>
  )
}

export default App
