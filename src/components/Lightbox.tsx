import React, { useEffect, useState } from 'react';
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
  const [isZoomed, setIsZoomed] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          if (isZoomed) {
            setIsZoomed(false);
          } else {
            onClose();
          }
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
  }, [isOpen, isZoomed, onClose, onNext, onPrevious]);

  // Reset zoom when gif changes
  useEffect(() => {
    setIsZoomed(false);
  }, [gif]);

  if (!isOpen || !gif) return null;

  return (
    <div 
      className="lightbox-overlay" 
      onClick={isZoomed ? () => setIsZoomed(false) : onClose}
    >
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-content">
          <img 
            src={gif.path} 
            alt={gif.name}
            className={`lightbox-image ${isZoomed ? 'zoomed' : ''}`}
            onClick={() => setIsZoomed(!isZoomed)}
            style={{ cursor: 'zoom-in' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Lightbox;