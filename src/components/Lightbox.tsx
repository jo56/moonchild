import React, { useEffect, useState, useRef } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imagePositionRef = useRef({ x: 0, y: 0 });
  
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
    setImagePosition({ x: 0, y: 0 });
    imagePositionRef.current = { x: 0, y: 0 };
  }, [gif]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isZoomed) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - imagePositionRef.current.x,
        y: e.clientY - imagePositionRef.current.y
      };
    } else {
      setIsZoomed(true);
    }
  };

  useEffect(() => {
    const updateImageTransform = (x: number, y: number) => {
      if (imageRef.current) {
        imageRef.current.style.transform = `scale(2) translate(${x / 2}px, ${y / 2}px)`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isZoomed) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      imagePositionRef.current = { x: newX, y: newY };
      updateImageTransform(newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Update React state once when dragging stops
      setImagePosition({ ...imagePositionRef.current });
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isZoomed]);

  if (!isOpen || !gif) return null;

  return (
    <div 
      className="lightbox-overlay" 
      onClick={isZoomed ? () => { 
        setIsZoomed(false); 
        setImagePosition({ x: 0, y: 0 }); 
        imagePositionRef.current = { x: 0, y: 0 };
      } : onClose}
    >
      <div 
        ref={containerRef}
        className="lightbox-container" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lightbox-content">
          <img 
            ref={imageRef}
            src={gif.path} 
            alt={gif.name}
            className={`lightbox-image ${isZoomed ? 'zoomed' : ''} ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            style={{ 
              cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transform: isZoomed ? `scale(2) translate(${imagePosition.x / 2}px, ${imagePosition.y / 2}px)` : 'scale(1)',
              willChange: isDragging ? 'transform' : 'auto'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Lightbox;