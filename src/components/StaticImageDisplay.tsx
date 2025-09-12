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
    >
      <div className="gif-wrapper" onClick={onClick}>
        <img 
          src={image.path} 
          alt=""
          className="gif-image"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default StaticImageDisplay;