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
  zIndex: number;
  opacity: number;
  naturalWidth: number;
  naturalHeight: number;
  loaded: boolean;
}

const IrregularCollage: React.FC<IrregularCollageProps> = ({ media, onMediaClick }) => {
  const [positionedMedia, setPositionedMedia] = useState<PositionedMedia[]>([]);
  const [containerHeight, setContainerHeight] = useState(3000);
  const [containerWidth, setContainerWidth] = useState(3000);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    const containerWidth = window.innerWidth * 3; // Allow 3x window width for horizontal scrolling
    const positions: PositionedMedia[] = [];
    const occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];

    // Load all image dimensions first
    const mediaWithDimensions = await Promise.all(
      shuffled.map(async (item) => {
        const dimensions = await loadImageDimensions(item);
        return { ...item, ...dimensions };
      })
    );

    // Calculate sizes first, then sort by area (largest first for better packing)
    const itemsWithSizes = mediaWithDimensions.map(item => {
      const aspectRatio = item.naturalWidth / item.naturalHeight;
      let displayWidth, displayHeight;

      // Create different size categories for more variety
      const sizeCategory = Math.random();
      let targetArea, maxDimension;
      
      if (sizeCategory < 0.15) {
        // Extra large showcase images (15%) - reduced from 600k-1M to 300k-500k
        targetArea = 300000 + Math.random() * 200000;
        maxDimension = containerWidth * 0.4;
      } else if (sizeCategory < 0.35) {
        // Large images (20%) - reduced from 400k-600k to 200k-350k
        targetArea = 200000 + Math.random() * 150000;
        maxDimension = containerWidth * 0.3;
      } else if (sizeCategory < 0.65) {
        // Medium images (30%) - reduced slightly
        targetArea = 150000 + Math.random() * 100000;
        maxDimension = containerWidth * 0.25;
      } else if (sizeCategory < 0.85) {
        // Small-medium images (20%)
        targetArea = 80000 + Math.random() * 70000;
        maxDimension = containerWidth * 0.2;
      } else {
        // Small accent images (15%)
        targetArea = 40000 + Math.random() * 60000;
        maxDimension = containerWidth * 0.12;
      }

      const baseSize = Math.sqrt(targetArea);

      if (aspectRatio > 1.5) {
        displayWidth = Math.min(baseSize * 1.4, maxDimension);
        displayHeight = displayWidth / aspectRatio;
      } else if (aspectRatio > 0.75) {
        if (aspectRatio > 1) {
          displayWidth = Math.min(baseSize, maxDimension);
          displayHeight = displayWidth / aspectRatio;
        } else {
          displayHeight = Math.min(baseSize, maxDimension * 0.8);
          displayWidth = displayHeight * aspectRatio;
        }
      } else {
        displayHeight = Math.min(baseSize * 1.3, maxDimension * 1.2);
        displayWidth = displayHeight * aspectRatio;
      }

      displayWidth = Math.max(displayWidth, 100);
      displayHeight = Math.max(displayHeight, 100);

      return {
        ...item,
        displayWidth,
        displayHeight,
        area: displayWidth * displayHeight
      };
    });

    // Sort by area (largest first) for better packing
    const sortedItems = itemsWithSizes.sort((a, b) => b.area - a.area);

    const isOverlapping = (x: number, y: number, width: number, height: number) => {
      return occupiedAreas.some(area => {
        const overlapX = Math.max(0, Math.min(x + width, area.x + area.width) - Math.max(x, area.x));
        const overlapY = Math.max(0, Math.min(y + height, area.y + area.height) - Math.max(y, area.y));
        const overlapArea = overlapX * overlapY;
        const thisArea = width * height;
        const otherArea = area.width * area.height;
        
        // Allow overlapping up to 15% of the smaller image's area
        const maxAllowedOverlap = Math.min(thisArea, otherArea) * 0.15;
        return overlapArea > maxAllowedOverlap;
      });
    };

    // Find the best position for an item using a more systematic approach with overlapping allowed
    const findBestPosition = (width: number, height: number) => {
      const gridSize = 15; // Slightly larger grid since we allow overlapping
      const maxWidth = containerWidth - width - 10;
      const currentMaxHeight = Math.max(800, ...occupiedAreas.map(area => area.y + area.height)) + 400;
      
      // Try to place as high and left as possible, allowing slight overlaps
      for (let y = 5; y < currentMaxHeight; y += gridSize) {
        for (let x = 5; x < maxWidth; x += gridSize) {
          if (!isOverlapping(x, y, width, height)) {
            return { x, y };
          }
        }
      }
      
      // Secondary pass: try with some randomization for more organic placement
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = Math.random() * (maxWidth - 10) + 5;
        const y = Math.random() * currentMaxHeight + 5;
        if (!isOverlapping(x, y, width, height)) {
          return { x, y };
        }
      }
      
      // Fallback: place at bottom
      const maxY = Math.max(0, ...occupiedAreas.map(area => area.y + area.height));
      return { x: 5 + Math.random() * 100, y: maxY + 10 };
    };

    sortedItems.forEach((item) => {
      // Use pre-calculated sizes
      const displayWidth = item.displayWidth;
      const displayHeight = item.displayHeight;

      // Find the best position using systematic grid-based approach
      const position = findBestPosition(displayWidth, displayHeight);

      occupiedAreas.push({ x: position.x, y: position.y, width: displayWidth, height: displayHeight });

      positions.push({
        ...item,
        x: position.x,
        y: position.y,
        width: displayWidth,
        height: displayHeight,
        zIndex: Math.floor(Math.random() * 25) + 1, // Wider z-index range for better layering
        opacity: 1,
        loaded: true
      });
    });

    // Calculate total dimensions needed
    const maxY = Math.max(...positions.map(p => p.y + p.height));
    const maxX = Math.max(...positions.map(p => p.x + p.width));
    setContainerHeight(maxY + 50);
    setContainerWidth(Math.max(maxX + 50, window.innerWidth));
    
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

  // Viewport navigation handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on the background, not on an image
    if ((e.target as HTMLElement).classList.contains('irregular-collage')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y });
      e.preventDefault();
    }
  }, [viewportOffset]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    
    // Constrain viewport to prevent over-scrolling
    const maxOffsetX = Math.min(0, window.innerWidth - containerWidth);
    const maxOffsetY = Math.min(0, window.innerHeight - containerHeight);
    
    setViewportOffset({
      x: Math.max(maxOffsetX, Math.min(0, newOffset.x)),
      y: Math.max(maxOffsetY, Math.min(0, newOffset.y))
    });
  }, [isDragging, dragStart, containerWidth, containerHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for viewport navigation
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="irregular-collage-viewport" style={{ width: '100vw', height: '100vh', overflow: 'auto', position: 'relative', background: '#0a1628' }}>
      <div 
        className="irregular-collage" 
        style={{ 
          height: `${containerHeight}px`,
          width: `${containerWidth}px`,
          transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
      {positionedMedia.map((item) => (
        <div
          key={item.id}
          className={`collage-media ${item.type === 'gif' ? 'is-gif' : 'is-image'}`}
          style={{
            position: 'absolute',
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${item.width}px`,
            height: `${item.height}px`,
            zIndex: item.zIndex,
            opacity: 1
          }}
          onClick={(e) => {
            e.stopPropagation();
            onMediaClick(item);
          }}
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
    </div>
  );
};

export default IrregularCollage;