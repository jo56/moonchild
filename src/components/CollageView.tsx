import React, { useState, useEffect, useRef } from 'react';
import { GifItem } from '../types';
import './CollageView.css';

interface CollageViewProps {
  gifs: GifItem[];
  onGifClick: (gif: GifItem) => void;
  variant: 'large' | 'stack';
}

interface DragState {
  draggedItem: number | null;
  isDragging: boolean;
  startPos: { x: number; y: number } | null;
  currentPos: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
}

interface CanvasSize {
  width: number;
  height: number;
}

const CollageView: React.FC<CollageViewProps> = ({ gifs, onGifClick, variant }) => {
  const [orderedGifs, setOrderedGifs] = useState<GifItem[]>(gifs);
  const [customPositions, setCustomPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: Math.max(window.innerWidth * 4, 4000),
    height: Math.max(window.innerHeight * 4, 4000)
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    isDragging: false,
    startPos: null,
    currentPos: null,
    offset: null
  });

  // Update orderedGifs when gifs prop changes
  useEffect(() => {
    setOrderedGifs(gifs);
  }, [gifs]);

  // Auto-expand canvas when items are dragged near edges (ONLY for large variant - layout1.png)
  const expandCanvasIfNeeded = (position: { x: number; y: number }) => {
    if (variant !== 'large') return;

    const expandThreshold = 300; // Distance from edge to trigger expansion
    const expandAmount = 1000; // How much to expand by

    let newWidth = canvasSize.width;
    let newHeight = canvasSize.height;

    // Expand horizontally - NO LIMITS
    if (position.x + expandThreshold > canvasSize.width) {
      newWidth = canvasSize.width + expandAmount;
    }
    if (position.x < expandThreshold) {
      newWidth = Math.max(newWidth, canvasSize.width + expandAmount);
    }

    // Expand vertically - NO LIMITS
    if (position.y + expandThreshold > canvasSize.height) {
      newHeight = canvasSize.height + expandAmount;
    }
    if (position.y < expandThreshold) {
      newHeight = Math.max(newHeight, canvasSize.height + expandAmount);
    }

    if (newWidth !== canvasSize.width || newHeight !== canvasSize.height) {
      setCanvasSize({ width: newWidth, height: newHeight });
    }
  };

  const getContainerClass = () => {
    switch (variant) {
      case 'large': return 'large-collage';
      case 'stack': return 'stack-collage';
      default: return '';
    }
  };

  const getItemClass = (index: number) => {
    const baseClass = dragState.draggedItem === index ? 'dragging' : '';
    const gif = orderedGifs[index];
    const hasCustomPosition = customPositions[gif.id];

    switch (variant) {
      case 'large':
        // Don't apply specific positioning classes if item has custom position or is being dragged
        if (hasCustomPosition || dragState.draggedItem === index) {
          return `large-item ${baseClass}`;
        }
        return `large-item large-item-${index + 1} ${baseClass}`;
      case 'stack': return `stack-item stack-item-${index + 1} ${baseClass}`;
      default: return '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (variant !== 'large') return;

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // Calculate position relative to container including scroll
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setDragState({
      draggedItem: index,
      isDragging: true,
      startPos: { x: e.clientX, y: e.clientY },
      currentPos: { x: e.clientX, y: e.clientY },
      offset
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || dragState.draggedItem === null || variant !== 'large') return;

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate position relative to the expanded canvas including scroll
      const currentPos = {
        x: e.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0),
        y: e.clientY - containerRect.top + (containerRef.current?.scrollTop || 0)
      };

      // Expand canvas if near edges - NO BOUNDARIES!
      expandCanvasIfNeeded(currentPos);

      setDragState(prev => ({
        ...prev,
        currentPos
      }));
    };

    const handleMouseUp = () => {
      if (dragState.isDragging && dragState.currentPos && dragState.draggedItem !== null && variant === 'large') {
        const gifId = orderedGifs[dragState.draggedItem].id;
        const finalPos = {
          x: dragState.currentPos.x - (dragState.offset?.x || 0),
          y: dragState.currentPos.y - (dragState.offset?.y || 0)
        };

        // Expand canvas based on final position
        expandCanvasIfNeeded(finalPos);

        // Save the final position - NO RESTRICTIONS
        setCustomPositions(prev => ({
          ...prev,
          [gifId]: finalPos
        }));

        setDragState({
          draggedItem: null,
          isDragging: false,
          startPos: null,
          currentPos: null,
          offset: null
        });
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, dragState.draggedItem]);

  const getDragStyle = (index: number): React.CSSProperties => {
    const gif = orderedGifs[index];
    const customPos = customPositions[gif.id];

    // If currently being dragged (large variant only)
    if (dragState.draggedItem === index && dragState.currentPos && dragState.offset && variant === 'large') {
      const style = {
        position: 'absolute' as const,
        left: dragState.currentPos.x - dragState.offset.x,
        top: dragState.currentPos.y - dragState.offset.y,
        zIndex: 1000,
        pointerEvents: 'none' as const,
        transform: 'none'
      };

      return style;
    }

    // If has a custom stored position (large variant only)
    if (customPos && variant === 'large') {
      const style = {
        position: 'absolute' as const,
        left: customPos.x,
        top: customPos.y,
        zIndex: 1,
        transform: 'none'
      };

      return style;
    }

    // Default positioning - use CSS classes for other variants
    return {};
  };

  const handleClick = (e: React.MouseEvent, gif: GifItem) => {
    // Only allow click if not currently dragging and not in large view
    if (dragState.draggedItem === null && variant !== 'large') {
      onGifClick(gif);
    } else if (variant === 'large') {
      // Prevent click in large view to avoid interference with drag
      e.preventDefault();
    }
  };



  return (
    <div
      ref={containerRef}
      className={`collage-container ${getContainerClass()}`}
      style={variant === 'large' ? {
        overflow: 'auto',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1
      } : {}}
    >
      <div
        className="collage-grid"
        style={variant === 'large' ? {
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          position: 'relative',
          minWidth: '100vw',
          minHeight: '100vh'
        } : {}}
      >
        {orderedGifs.map((gif, index) => (
          <div
            key={gif.id}
            className={`collage-item ${getItemClass(index)}`}
            style={getDragStyle(index)}
            onClick={(e) => handleClick(e, gif)}
            onMouseDown={(e) => handleMouseDown(e, index)}
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