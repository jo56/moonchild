import React from 'react';
import { GifItem } from '../types';
import './CollageView.css';

interface CollageViewProps {
  gifs: GifItem[];
  onGifClick: (gif: GifItem) => void;
  variant: 'large' | 'stack';
}

const CollageView: React.FC<CollageViewProps> = ({ gifs, onGifClick, variant }) => {
  const getContainerClass = () => {
    switch (variant) {
      case 'large': return 'large-collage';
      case 'stack': return 'stack-collage';
      default: return '';
    }
  };

  const getItemClass = (index: number) => {
    switch (variant) {
      case 'large': return `large-item large-item-${index + 1}`;
      case 'stack': return `stack-item stack-item-${index + 1}`;
      default: return '';
    }
  };

  return (
    <div className={`collage-container ${getContainerClass()}`}>
      <div className="collage-grid">
        {gifs.map((gif, index) => (
          <div 
            key={gif.id}
            className={`collage-item ${getItemClass(index)}`}
            onClick={() => onGifClick(gif)}
          >
            <img 
              src={gif.path} 
              alt={gif.name}
              className="collage-image"
              loading="lazy"
            />
            <div className="collage-overlay">
              <h3 className="collage-title">{gif.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollageView;