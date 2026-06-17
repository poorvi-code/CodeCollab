import React, { useState, useEffect } from 'react';

// Helper to trigger toast from anywhere
export const showToast = (message, type = 'success') => {
  const event = new CustomEvent('show-toast', {
    detail: { message, type, id: Date.now() + Math.random() }
  });
  window.dispatchEvent(event);
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type, id } = e.detail;
      setToasts((prev) => [...prev, { message, type, id }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className="toast" 
          style={{ 
            borderLeftColor: toast.type === 'error' 
              ? 'var(--error)' 
              : toast.type === 'info' 
                ? 'var(--accent-blue)' 
                : 'var(--success)' 
          }}
        >
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
