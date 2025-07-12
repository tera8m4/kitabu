import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/useApp';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isInitialized } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) {
      navigate('/');
    }
  }, [isInitialized, navigate]);

  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;