import { useState, useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible && message) return null;

  return (
    <div className={`toast-container animate-slide-up ${!isVisible ? 'fade-out' : ''}`}>
      <div className={`toast-content glass-card toast-${type}`}>
        {type === 'error' && <span className="toast-icon">⚠️</span>}
        {type === 'info' && <span className="toast-icon">ℹ️</span>}
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
}
