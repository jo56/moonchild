import React, { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types';
import './IrregularCollage.css';

interface IrregularCollageProps {
  media: MediaItem[];
  onMediaClick: (mediaItem: MediaItem) => void;
}

interface PositionedMedia extends MediaItem {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  naturalWidth: number;
  naturalHeight: number;
  loaded: boolean;
}

const IrregularCollage: React.FC<IrregularCollageProps> = ({ media, onMediaClick }) => {
  const [positionedMedia, setPositionedMedia] = useState<PositionedMedia[]>([]);
  const [containerHeight, setContainerHeight] = useState(3000);

  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const loadImageDimensions = useCallback((mediaItem: MediaItem): Promise<{naturalWidth: number, naturalHeight: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ naturalWidth: 400, naturalHeight: 400 }); // Default fallback
      };
      img.src = mediaItem.path;
    });
  }, []);

  const generatePositions = useCallback(async () => {
    const shuffled = shuffleArray(media);
    const containerWidth = window.innerWidth - 60;
    const positions: PositionedMedia[] = [];
    const occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];

    // Load all image dimensions first
    const mediaWithDimensions = await Promise.all(
      shuffled.map(async (item) => {
        const dimensions = await loadImageDimensions(item);
        return { ...item, ...dimensions };
      })
    );

    const isOverlapping = (x: number, y: number, width: number, height: number, buffer = 5) => {
      return occupiedAreas.some(area => 
        x < area.x + area.width + buffer &&
        x + width + buffer > area.x &&
        y < area.y + area.height + buffer &&
        y + height + buffer > area.y
      );
    };

    let currentY = 10;
    let rowMaxHeight = 0;

    mediaWithDimensions.forEach((item) => {
      // Calculate size maintaining aspect ratio but making them large
      const aspectRatio = item.naturalWidth / item.naturalHeight;
      let displayWidth, displayHeight;

      // Base the size on a target area but maintain aspect ratio
      const targetArea = 200000 + Math.random() * 150000; // Large area for overwhelming effect
      const baseSize = Math.sqrt(targetArea);

      if (aspectRatio > 1) {
        // Landscape
        displayWidth = Math.min(baseSize * Math.sqrt(aspectRatio), containerWidth * 0.8);
        displayHeight = displayWidth / aspectRatio;
      } else {
        // Portrait or square
        displayHeight = Math.min(baseSize / Math.sqrt(aspectRatio), 800);
        displayWidth = displayHeight * aspectRatio;
      }

      const rotation = (Math.random() - 0.5) * 20; // -10 to +10 degrees
      
      let x, y;
      let attempts = 0;
      const maxAttempts = 40;

      do {
        if (attempts % 20 === 0 && attempts > 0) {
          // Move to next row if we can't find space
          currentY += rowMaxHeight + 15;
          rowMaxHeight = 0;
        }

        // Pack images very close together horizontally
        x = Math.random() * Math.max(10, containerWidth - displayWidth - 20) + 10;
        y = currentY + Math.random() * 50; // Less vertical randomness for tighter packing
        attempts++;
      } while (isOverlapping(x, y, displayWidth, displayHeight, 5) && attempts < maxAttempts);

      // Update row height tracking
      const bottomY = y + displayHeight;
      if (bottomY > currentY + rowMaxHeight) {
        rowMaxHeight = bottomY - currentY;
      }

      occupiedAreas.push({ x, y, width: displayWidth, height: displayHeight });

      positions.push({
        ...item,
        x,
        y,
        width: displayWidth,
        height: displayHeight,
        rotation,
        zIndex: Math.floor(Math.random() * 15) + 1,
        opacity: 1,
        loaded: true
      });
    });

    // Calculate total height needed
    const maxY = Math.max(...positions.map(p => p.y + p.height));
    setContainerHeight(maxY + 50);
    
    return positions;
  }, [media, shuffleArray, loadImageDimensions]);

  useEffect(() => {
    const loadPositions = async () => {
      const positions = await generatePositions();
      setPositionedMedia(positions);
    };

    loadPositions();
  }, [generatePositions]);

  useEffect(() => {
    const handleResize = async () => {
      const positions = await generatePositions();
      setPositionedMedia(positions);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generatePositions]);

  return (
    <div className="irregular-collage" style={{ height: `${containerHeight}px` }}>
      {positionedMedia.map((item, index) => (
        <div
          key={item.id}
          className={`collage-media ${item.type === 'gif' ? 'is-gif' : 'is-image'}`}
          style={{
            position: 'absolute',
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${item.width}px`,
            height: `${item.height}px`,
            transform: `rotate(${item.rotation}deg)`,
            zIndex: item.zIndex,
            opacity: 1
          }}
          onClick={() => onMediaClick(item)}
        >
          <img
            src={item.path}
            alt=""
            className="collage-image"
            loading="lazy"
            draggable={false}
          />
          <div className="collage-overlay">
            <div className="media-type-badge">{item.type.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IrregularCollage;