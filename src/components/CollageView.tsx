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
  const [customPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [imageZIndices, setImageZIndices] = useState<Record<string, number>>({});
  const [nextZIndex, setNextZIndex] = useState(100); // Start at 100 to allow room below
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: Math.max(window.innerWidth * 10, 10000),
    height: Math.max(window.innerHeight * 10, 10000)
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState] = useState<DragState>({
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

    // Check if we should trigger background drag instead of image drag
    if (e.button !== 0 || e.shiftKey) {
      handleBackgroundMouseDown(e);
      return;
    }

    e.preventDefault();
    e.stopPropagation(); // Prevent background drag when dragging an image

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
      element.style.setProperty('z-index', '10000', 'important'); // Higher z-index for dragged item
      element.style.setProperty('transform', 'none', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
    };

    const handleMouseUp = () => {
      // Get the GIF ID for this element
      const gifId = orderedGifs[index].id;

      // Assign this image the next highest z-index (bringing it to front permanently)
      const newZIndex = nextZIndex;
      setImageZIndices(prev => ({
        ...prev,
        [gifId]: newZIndex
      }));
      setNextZIndex(prev => prev + 1);

      // Reset pointer events and set the new z-index
      element.style.setProperty('pointer-events', 'auto', 'important');
      element.style.setProperty('z-index', newZIndex.toString(), 'important');

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // Allow background dragging for large variant from anywhere
    if (variant !== 'large') return;

    // Allow background dragging when:
    // 1. Right-clicking anywhere
    // 2. Left-clicking on background (not on images)
    // 3. Left-clicking with Shift key held (overrides image dragging)
    const target = e.target as HTMLElement;
    const isImageElement = target.classList.contains('collage-image') || target.classList.contains('collage-item');

    const shouldBackgroundDrag =
      e.button !== 0 || // Right click or middle click
      !isImageElement || // Click on background
      e.shiftKey; // Shift + left click to force background drag

    if (!shouldBackgroundDrag) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;
    const startX = e.clientX;
    const startY = e.clientY;

    // Set cursor to grabbing
    container.style.cursor = 'grabbing';

    const handleBackgroundMouseMove = (e: MouseEvent) => {
      // Calculate movement delta
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Apply movement directly (positive delta = move canvas in that direction)
      container.scrollLeft = startScrollLeft - deltaX;
      container.scrollTop = startScrollTop - deltaY;
    };

    const handleBackgroundMouseUp = () => {
      // Reset cursor
      container.style.cursor = 'grab';

      document.removeEventListener('mousemove', handleBackgroundMouseMove);
      document.removeEventListener('mouseup', handleBackgroundMouseUp);
    };

    document.addEventListener('mousemove', handleBackgroundMouseMove);
    document.addEventListener('mouseup', handleBackgroundMouseUp);
  };


  const getDragStyle = (index: number): React.CSSProperties => {
    const gif = orderedGifs[index];
    const customPos = customPositions[gif.id];
    const zIndex = imageZIndices[gif.id];

    // If has a custom stored position (large variant only)
    if (customPos && variant === 'large') {
      return {
        position: 'absolute' as const,
        left: `${customPos.x}px`,
        top: `${customPos.y}px`,
        zIndex: zIndex || 1, // Use stored z-index or default to 1
        transform: 'none',
        width: 'auto',
        height: 'auto'
      };
    }

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
        zIndex: 10,
        cursor: 'grab'
      } : {}}
      onMouseDown={variant === 'large' ? handleBackgroundMouseDown : undefined}
      onContextMenu={variant === 'large' ? (e) => e.preventDefault() : undefined}
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
        onMouseDown={handleBackgroundMouseDown}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
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
                  position: 'absolute' as const,
                  left: dragStyle.left,
                  top: dragStyle.top,
                  zIndex: 1000,
                  transform: 'none',
                  width: 'auto',
                  height: 'auto',
                  right: 'auto',
                  bottom: 'auto'
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