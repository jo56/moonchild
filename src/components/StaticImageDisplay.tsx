import React from 'react';
import './GifDisplay.css'; // Reuse the same CSS as GifDisplay

interface StaticImageItem {
  id: string;
  name: string;
  path: string;
}

interface StaticImageDisplayProps {
  image: StaticImageItem;
  index: number;
  onClick: () => void;
}

const StaticImageDisplay: React.FC<StaticImageDisplayProps> = ({ image, index, onClick }) => {
  return (
    <div 
      className={`gif-container ${index % 2 === 0 ? 'left-align' : 'right-align'}`}
      style={{
        animationDelay: `${index * 0.5}s`
      }}
    >
      <div className="gif-wrapper" onClick={onClick}>
        <img 
          src={image.path} 
          alt={image.name}
          className="gif-image"
          loading="lazy"
        />
        <div className="gif-overlay">
          <h3 className="gif-title">{image.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default StaticImageDisplay;