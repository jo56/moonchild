import React, { useEffect } from 'react';
import { GifItem } from '../types';
import './Lightbox.css';

interface LightboxProps {
  gif: GifItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ gif, isOpen, onClose, onNext, onPrevious }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, onNext, onPrevious]);

  if (!isOpen || !gif) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-content">
          <img 
            src={gif.path} 
            alt={gif.name}
            className="lightbox-image"
          />
        </div>
      </div>
    </div>
  );
};

export default Lightbox;