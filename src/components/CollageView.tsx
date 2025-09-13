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
    console.log('MouseDown triggered!', { variant, index });

    if (variant !== 'large') {
      console.log('Not large variant, returning');
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // Use a fixed offset to avoid issues with large images positioned off-screen
    // This makes dragging feel more natural - grab from center of image
    const offset = {
      x: 100, // Fixed offset from left edge
      y: 50   // Fixed offset from top edge
    };

    console.log('Mouse down event:', { clientX: e.clientX, clientY: e.clientY });
    console.log('Element rect (current):', rect);
    console.log('Using fixed offset:', offset);

    setDragState({
      draggedItem: index,
      isDragging: true,
      startPos: { x: e.clientX, y: e.clientY },
      currentPos: { x: e.clientX, y: e.clientY },
      offset,
      draggedElement: e.currentTarget as HTMLDivElement
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || dragState.draggedItem === null || variant !== 'large') {
        return;
      }

      console.log('MouseMove triggered!', { isDragging: dragState.isDragging, draggedItem: dragState.draggedItem });

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate position relative to the expanded canvas including scroll
      const currentPos = {
        x: e.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0),
        y: e.clientY - containerRect.top + (containerRef.current?.scrollTop || 0)
      };

      console.log('Mouse event:', { clientX: e.clientX, clientY: e.clientY });
      console.log('Container rect:', containerRect);
      console.log('Scroll values:', { scrollLeft: containerRef.current?.scrollLeft, scrollTop: containerRef.current?.scrollTop });
      console.log('Current position:', currentPos);

      // Expand canvas if near edges - NO BOUNDARIES!
      expandCanvasIfNeeded(currentPos);

      // Force direct DOM manipulation as backup
      if (dragState.draggedElement && dragState.offset) {
        const dragX = currentPos.x - dragState.offset.x;
        const dragY = currentPos.y - dragState.offset.y;

        console.log('DOM manipulation:', { dragX, dragY });

        dragState.draggedElement.style.setProperty('position', 'absolute', 'important');
        dragState.draggedElement.style.setProperty('left', `${dragX}px`, 'important');
        dragState.draggedElement.style.setProperty('top', `${dragY}px`, 'important');
        dragState.draggedElement.style.setProperty('z-index', '1000', 'important');
        dragState.draggedElement.style.setProperty('transform', 'none', 'important');
        dragState.draggedElement.style.setProperty('width', 'auto', 'important');
        dragState.draggedElement.style.setProperty('height', 'auto', 'important');
        dragState.draggedElement.style.setProperty('right', 'auto', 'important');
        dragState.draggedElement.style.setProperty('bottom', 'auto', 'important');

        console.log('Element styles set:', dragState.draggedElement.style.left, dragState.draggedElement.style.top);
        console.log('Element position check:', dragState.draggedElement.getBoundingClientRect());
      }

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

        console.log('Mouse up - saving final position:', finalPos);

        // Expand canvas based on final position
        expandCanvasIfNeeded(finalPos);

        // Save the final position - NO RESTRICTIONS
        setCustomPositions(prev => ({
          ...prev,
          [gifId]: finalPos
        }));

        // Apply final position directly to DOM to ensure it sticks
        if (dragState.draggedElement) {
          dragState.draggedElement.style.setProperty('position', 'absolute', 'important');
          dragState.draggedElement.style.setProperty('left', `${finalPos.x}px`, 'important');
          dragState.draggedElement.style.setProperty('top', `${finalPos.y}px`, 'important');
          dragState.draggedElement.style.setProperty('z-index', '1', 'important');
          dragState.draggedElement.style.setProperty('transform', 'none', 'important');
          dragState.draggedElement.style.setProperty('width', 'auto', 'important');
          dragState.draggedElement.style.setProperty('height', 'auto', 'important');
          dragState.draggedElement.style.setProperty('right', 'auto', 'important');
          dragState.draggedElement.style.setProperty('bottom', 'auto', 'important');
        }

        setDragState({
          draggedItem: null,
          isDragging: false,
          startPos: null,
          currentPos: null,
          offset: null,
          draggedElement: null
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
      const dragX = dragState.currentPos.x - dragState.offset.x;
      const dragY = dragState.currentPos.y - dragState.offset.y;

      console.log('Applying drag style:', { dragX, dragY, index });

      const style = {
        position: 'absolute' as const,
        left: `${dragX}px`,
        top: `${dragY}px`,
        zIndex: 1000,
        pointerEvents: 'none' as const,
        transform: 'none !important',
        width: 'auto !important',
        height: 'auto !important'
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
                  position: 'absolute',
                  left: dragStyle.left,
                  top: dragStyle.top,
                  zIndex: 1000,
                  transform: 'none',
                  width: 'auto',
                  height: 'auto'
                } : {})
              }}
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
          );
        })}
      </div>
    </div>
  );
};

export default CollageView;