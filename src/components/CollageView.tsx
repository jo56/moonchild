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
  draggedElement: HTMLDivElement | null;
}

interface CanvasSize {
  width: number;
  height: number;
}

const CollageView: React.FC<CollageViewProps> = ({ gifs, onGifClick, variant }) => {
  const [orderedGifs, setOrderedGifs] = useState<GifItem[]>(gifs);
  const [customPositions, setCustomPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: Math.max(window.innerWidth * 10, 10000),
    height: Math.max(window.innerHeight * 10, 10000)
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    isDragging: false,
    startPos: null,
    currentPos: null,
    offset: null,
    draggedElement: null
  });

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  // Update orderedGifs when gifs prop changes
  useEffect(() => {
    setOrderedGifs(gifs);
  }, [gifs]);

  // Auto-expand canvas when items are dragged near edges (ONLY for large variant - layout1.png)
  const expandCanvasIfNeeded = (position: { x: number; y: number }) => {
    if (variant !== 'large') return;

    const expandThreshold = 300; // Threshold from canvas edge
    const expandAmount = 2000; // Expand by this amount

    let newWidth = canvasSize.width;
    let newHeight = canvasSize.height;

    console.log('Checking canvas expansion for position:', position, 'Canvas size:', canvasSize);

    // Expand to the right if we're within threshold of right edge
    if (position.x > canvasSize.width - expandThreshold) {
      newWidth = canvasSize.width + expandAmount;
      console.log('Expanding right, new width:', newWidth);
    }

    // Expand down if we're within threshold of bottom edge
    if (position.y > canvasSize.height - expandThreshold) {
      newHeight = canvasSize.height + expandAmount;
      console.log('Expanding down, new height:', newHeight);
    }

    // Also expand if we're dragging beyond current canvas bounds
    if (position.x > canvasSize.width) {
      newWidth = Math.max(newWidth, position.x + expandAmount);
      console.log('Expanding beyond right edge, new width:', newWidth);
    }

    if (position.y > canvasSize.height) {
      newHeight = Math.max(newHeight, position.y + expandAmount);
      console.log('Expanding beyond bottom edge, new height:', newHeight);
    }

    if (newWidth !== canvasSize.width || newHeight !== canvasSize.height) {
      console.log('Expanding canvas from', canvasSize.width, 'x', canvasSize.height, 'to', newWidth, 'x', newHeight);
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
        // Completely remove positioning classes during drag to avoid CSS conflicts
        if (dragState.draggedItem === index) {
          return `large-item ${baseClass}`;
        }
        // Don't apply specific positioning classes if item has custom position
        if (hasCustomPosition) {
          return `large-item custom-positioned`;
        }
        return `large-item large-item-${index + 1}`;
      case 'stack': return `stack-item stack-item-${index + 1} ${baseClass}`;
      default: return '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (variant !== 'large') return;
    e.preventDefault();

    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Calculate offset from mouse to element's top-left corner
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate position relative to the document/canvas
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const newX = e.clientX - containerRect.left + scrollLeft - offsetX;
      const newY = e.clientY - containerRect.top + scrollTop - offsetY;

      // Always ensure canvas is large enough for current drag position
      const buffer = 500; // Extra space beyond drag position
      let newCanvasWidth = Math.max(canvasSize.width, newX + buffer);
      let newCanvasHeight = Math.max(canvasSize.height, newY + buffer);

      // Immediately update DOM if canvas needs to grow
      if (newCanvasWidth > canvasSize.width || newCanvasHeight > canvasSize.height) {
        const grid = container.querySelector('.collage-grid') as HTMLElement;
        if (grid) {
          grid.style.width = newCanvasWidth + 'px';
          grid.style.height = newCanvasHeight + 'px';
        }

        // Update React state
        setCanvasSize({ width: newCanvasWidth, height: newCanvasHeight });
      }

      // Auto-scroll to follow the dragged item
      const scrollMargin = 100; // Start scrolling when within 100px of viewport edge
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Check if we need to scroll horizontally (consistent speed)
      const mouseXInViewport = e.clientX - containerRect.left;
      if (mouseXInViewport > containerWidth - scrollMargin) {
        // Scroll right
        container.scrollLeft += 12;
      } else if (mouseXInViewport < scrollMargin) {
        // Scroll left
        container.scrollLeft -= 12;
      }

      // Check if we need to scroll vertically (consistent speed)
      const mouseYInViewport = e.clientY - containerRect.top;
      if (mouseYInViewport > containerHeight - scrollMargin) {
        // Scroll down
        container.scrollTop += 12;
      } else if (mouseYInViewport < scrollMargin) {
        // Scroll up
        container.scrollTop -= 12;
      }

      // Use absolute positioning so it stays in the background
      element.style.setProperty('position', 'absolute', 'important');
      element.style.setProperty('left', newX + 'px', 'important');
      element.style.setProperty('top', newY + 'px', 'important');
      element.style.setProperty('z-index', '9999', 'important');
      element.style.setProperty('transform', 'none', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
    };

    const handleMouseUp = () => {
      // Reset pointer events
      element.style.setProperty('pointer-events', 'auto', 'important');

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


  const getDragStyle = (index: number): React.CSSProperties => {
    // Simple - no complex state management
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
        zIndex: 10
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
        {orderedGifs.map((gif, index) => {
          const isDragged = dragState.draggedItem === index;
          const dragStyle = getDragStyle(index);

          return (
            <div
              key={gif.id}
              className={`collage-item ${getItemClass(index)}`}
              style={{
                ...dragStyle,
                ...(isDragged && variant === 'large' ? {
                  position: 'absolute !important',
                  left: `${dragStyle.left} !important`,
                  top: `${dragStyle.top} !important`,
                  zIndex: 1000,
                  transform: 'none !important',
                  width: 'auto !important',
                  height: 'auto !important',
                  right: 'auto !important',
                  bottom: 'auto !important'
                } : {}),
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                console.log('Element clicked!', { index, gif: gif.id });
                handleClick(e, gif);
              }}
              onMouseDown={(e) => {
                console.log('Element mousedown!', { index, gif: gif.id });
                handleMouseDown(e, index);
              }}
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
          );
        })}
      </div>
    </div>
  );
};

export default CollageView;