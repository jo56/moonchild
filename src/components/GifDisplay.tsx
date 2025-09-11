import React from 'react';
import { GifItem } from '../types';
import './GifDisplay.css';

interface GifDisplayProps {
  gif: GifItem;
  index: number;
  onClick: () => void;
}

const GifDisplay: React.FC<GifDisplayProps> = ({ gif, index, onClick }) => {
  return (
    <div 
      className={`gif-container ${index % 2 === 0 ? 'left-align' : 'right-align'}`}
      style={{
        animationDelay: `${index * 0.5}s`
      }}
    >
      <div className="gif-wrapper" onClick={onClick}>
        <img 
          src={gif.path} 
          alt={gif.name}
          className="gif-image"
          loading="lazy"
        />
        <div className="gif-overlay">
          <h3 className="gif-title">{gif.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default GifDisplay;