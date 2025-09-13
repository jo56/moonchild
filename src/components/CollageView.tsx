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

    // Set up global mouseup handler immediately
    const handleGlobalMouseUp = (upEvent: MouseEvent) => {
      console.log('GLOBAL MouseUp event fired!');

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const finalPos = {
        x: upEvent.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0) - offset.x,
        y: upEvent.clientY - containerRect.top + (containerRef.current?.scrollTop || 0) - offset.y
      };

      console.log('Final position calculated:', finalPos);

      const gifId = gifs[index].id;
      console.log('Saving position for gif:', gifId);

      // Save the final position
      setCustomPositions(prev => {
        const newPositions = {
          ...prev,
          [gifId]: finalPos
        };
        console.log('Updated custom positions:', newPositions);
        return newPositions;
      });

      // Keep the current DOM position and let React take over on next render
      // Don't modify DOM here - React will apply the custom position via getDragStyle

      // Reset drag state
      setDragState({
        draggedItem: null,
        isDragging: false,
        startPos: null,
        currentPos: null,
        offset: null,
        draggedElement: null
      });

      // Remove the global listener
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      console.log('Removed global mouseup listener');
    };

    // Add global mouseup listener
    document.addEventListener('mouseup', handleGlobalMouseUp);
    console.log('Added global mouseup listener');

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
      const currentDragState = dragStateRef.current;
      if (!currentDragState.isDragging || currentDragState.draggedItem === null || variant !== 'large') {
        return;
      }

      console.log('MouseMove triggered!', { isDragging: currentDragState.isDragging, draggedItem: currentDragState.draggedItem });

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate position relative to the expanded canvas including scroll
      const currentPos = {
        x: e.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0),
        y: e.clientY - containerRect.top + (containerRef.current?.scrollTop || 0)
      };

      console.log('Current position:', currentPos);

      // Expand canvas if near edges - NO BOUNDARIES!
      expandCanvasIfNeeded(currentPos);

      // Force direct DOM manipulation as backup
      if (currentDragState.draggedElement && currentDragState.offset) {
        const dragX = currentPos.x - currentDragState.offset.x;
        const dragY = currentPos.y - currentDragState.offset.y;

        console.log('DOM manipulation during drag:', { dragX, dragY });

        currentDragState.draggedElement.style.setProperty('position', 'absolute', 'important');
        currentDragState.draggedElement.style.setProperty('left', `${dragX}px`, 'important');
        currentDragState.draggedElement.style.setProperty('top', `${dragY}px`, 'important');
        currentDragState.draggedElement.style.setProperty('z-index', '1000', 'important');
        currentDragState.draggedElement.style.setProperty('transform', 'none', 'important');
        currentDragState.draggedElement.style.setProperty('width', 'auto', 'important');
        currentDragState.draggedElement.style.setProperty('height', 'auto', 'important');
        currentDragState.draggedElement.style.setProperty('right', 'auto', 'important');
        currentDragState.draggedElement.style.setProperty('bottom', 'auto', 'important');

        console.log('DOM styles applied:', currentDragState.draggedElement.style.left, currentDragState.draggedElement.style.top);
      } else {
        console.log('DOM manipulation skipped:', {
          hasElement: !!currentDragState.draggedElement,
          hasOffset: !!currentDragState.offset
        });
      }

      setDragState(prev => ({
        ...prev,
        currentPos
      }));
    };

    const handleMouseUp = () => {
      console.log('MouseUp event fired!');
      const currentDragState = dragStateRef.current;

      console.log('MouseUp state check:', {
        isDragging: currentDragState.isDragging,
        currentPos: currentDragState.currentPos,
        draggedItem: currentDragState.draggedItem,
        variant
      });

      if (currentDragState.isDragging && currentDragState.currentPos && currentDragState.draggedItem !== null && variant === 'large') {
        const gifId = orderedGifs[currentDragState.draggedItem].id;
        const finalPos = {
          x: currentDragState.currentPos.x - (currentDragState.offset?.x || 0),
          y: currentDragState.currentPos.y - (currentDragState.offset?.y || 0)
        };

        console.log('Mouse up - saving final position:', finalPos);
        console.log('GIF ID:', gifId);

        // Expand canvas based on final position
        expandCanvasIfNeeded(finalPos);

        // Save the final position - NO RESTRICTIONS
        setCustomPositions(prev => {
          const newPositions = {
            ...prev,
            [gifId]: finalPos
          };
          console.log('Updated custom positions:', newPositions);
          return newPositions;
        });

        // Keep the element in place with direct DOM manipulation until React re-renders
        if (currentDragState.draggedElement) {
          console.log('Setting final DOM position:', finalPos);
          currentDragState.draggedElement.style.setProperty('position', 'absolute', 'important');
          currentDragState.draggedElement.style.setProperty('left', `${finalPos.x}px`, 'important');
          currentDragState.draggedElement.style.setProperty('top', `${finalPos.y}px`, 'important');
          currentDragState.draggedElement.style.setProperty('z-index', '1', 'important');
          currentDragState.draggedElement.style.setProperty('transform', 'none', 'important');
          currentDragState.draggedElement.style.setProperty('width', 'auto', 'important');
          currentDragState.draggedElement.style.setProperty('height', 'auto', 'important');
          currentDragState.draggedElement.style.setProperty('right', 'auto', 'important');
          currentDragState.draggedElement.style.setProperty('bottom', 'auto', 'important');
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

      // Always remove listeners on mouseup
      console.log('Removing event listeners on mouseup');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (dragState.isDragging) {
      console.log('Adding event listeners for drag state');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        console.log('Removing event listeners in cleanup');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging]);

  const getDragStyle = (index: number): React.CSSProperties => {
    const gif = orderedGifs[index];
    const customPos = customPositions[gif.id];

    // If currently being dragged (large variant only) - SKIP React styles, let DOM manipulation handle it
    if (dragState.draggedItem === index && dragState.isDragging && variant === 'large') {
      console.log('Skipping React drag style - DOM manipulation active for index:', index);
      return {}; // Return empty to avoid overriding DOM manipulation
    }

    // If has a custom stored position (large variant only)
    if (customPos && variant === 'large') {
      console.log(`Applying custom position for gif ${gif.id}:`, customPos);
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