import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem } from '../types';
import './PinterestGallery.css';

interface PinterestGalleryProps {
  media: MediaItem[];
  onMediaClick: (mediaItem: MediaItem) => void;
}

interface MediaWithHeight extends MediaItem {
  height: number;
  loaded: boolean;
}

const PinterestGallery: React.FC<PinterestGalleryProps> = ({ media, onMediaClick }) => {
  const [mediaWithHeights, setMediaWithHeights] = useState<MediaWithHeight[]>([]);
  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateColumns = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const minColumnWidth = 300;
    const gap = 20;
    
    const possibleColumns = Math.floor((containerWidth + gap) / (minColumnWidth + gap));
    const newColumns = Math.max(1, Math.min(possibleColumns, 4));
    
    setColumns(newColumns);
  }, []);

  const loadMediaHeight = useCallback((mediaItem: MediaItem): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const columnWidth = 280; // Base width for calculations
        const calculatedHeight = columnWidth * aspectRatio;
        resolve(Math.max(200, Math.min(500, calculatedHeight)));
      };
      img.onerror = () => resolve(300); // Default height on error
      img.src = mediaItem.path;
    });
  }, []);

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  useEffect(() => {
    const loadAllMedia = async () => {
      const shuffledMedia = shuffleArray(media);
      const mediaPromises = shuffledMedia.map(async (item) => {
        const height = await loadMediaHeight(item);
        return {
          ...item,
          height,
          loaded: true
        };
      });

      const loadedMedia = await Promise.all(mediaPromises);
      setMediaWithHeights(loadedMedia);
    };

    loadAllMedia();
  }, [media, loadMediaHeight, shuffleArray]);

  useEffect(() => {
    calculateColumns();
    
    const handleResize = () => {
      calculateColumns();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateColumns]);

  const getColumnItems = (columnIndex: number) => {
    return mediaWithHeights.filter((_, index) => index % columns === columnIndex);
  };

  const handleMediaClick = (mediaItem: MediaItem) => {
    onMediaClick(mediaItem);
  };

  return (
    <div className="pinterest-gallery" ref={containerRef}>
      <div className="pinterest-columns" style={{ '--columns': columns } as React.CSSProperties}>
        {Array.from({ length: columns }, (_, columnIndex) => (
          <div key={columnIndex} className="pinterest-column">
            {getColumnItems(columnIndex).map((item) => (
              <div 
                key={item.id}
                className="pinterest-item"
                style={{
                  height: `${item.height}px`
                }}
                onClick={() => handleMediaClick(item)}
              >
                <div className="pinterest-media-wrapper">
                  <img 
                    src={item.path} 
                    alt=""
                    className="pinterest-media"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinterestGallery;