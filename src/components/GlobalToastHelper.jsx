import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Toast from './Toast';

export default function GlobalToastHelper() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToast({
        message: location.state.toastMessage,
        type: location.state.toastType || 'info'
      });
      
      // Clean up the route state so it doesn't re-trigger on browser reload
      const stateCopy = { ...location.state };
      delete stateCopy.toastMessage;
      delete stateCopy.toastType;
      // Replace state without adding to history
      navigate(location.pathname, { replace: true, state: Object.keys(stateCopy).length ? stateCopy : null });
    }
  }, [location, navigate]);

  if (!toast) return null;

  return (
    <Toast 
      key={toast.message} // Force re-mount if a new message comes in
      message={toast.message} 
      type={toast.type} 
      onClose={() => setToast(null)} 
    />
  );
}
