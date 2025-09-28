
import React, { useEffect, useState } from 'react';

interface ErrorToastProps {
  error: string | null;
  onClose: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Allow time for the exit animation before clearing the error
        setTimeout(onClose, 300); 
      }, 2500); // Show for 2.5 seconds
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [error, onClose]);

  if (!error && !isVisible) {
    return null;
  }

  const animationClass = isVisible ? 'animate-toast-enter' : 'animate-toast-exit';

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
       <style>{`
        @keyframes toast-enter {
          from { opacity: 0; transform: translateY(-20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        .animate-toast-enter { animation: toast-enter 0.3s ease-out forwards; }
        .animate-toast-exit { animation: toast-exit 0.3s ease-in forwards; }
      `}</style>
      <div
        className={`bg-red-500/90 backdrop-blur-sm text-white font-bold px-6 py-3 rounded-full shadow-2xl shadow-red-500/30 border border-red-400 ${animationClass}`}
      >
        {error}
      </div>
    </div>
  );
};

export default ErrorToast;