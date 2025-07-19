import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ToastContainer';
import { ToastContext } from './context';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  );
};


