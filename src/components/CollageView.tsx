import React, { useState, useEffect } from 'react';
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

const CollageView: React.FC<CollageViewProps> = ({ gifs, onGifClick, variant }) => {
  const [orderedGifs, setOrderedGifs] = useState<GifItem[]>(gifs);
  const [customPositions, setCustomPositions] = useState<Record<string, {x: number, y: number}>>({});
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

  const getContainerClass = () => {
    switch (variant) {
      case 'large': return 'large-collage';
      case 'stack': return 'stack-collage';
      default: return '';
    }
  };

  const getItemClass = (index: number) => {
    const baseClass = dragState.draggedItem === index ? 'dragging' : '';
    
    switch (variant) {
      case 'large': return `large-item large-item-${index + 1} ${baseClass}`;
      case 'stack': return `stack-item stack-item-${index + 1} ${baseClass}`;
      default: return '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (variant !== 'large') return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
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
    
    console.log('Mouse drag start:', index);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || dragState.draggedItem === null) return;
      
      console.log('Mouse move:', e.clientX, e.clientY);
      setDragState(prev => ({
        ...prev,
        currentPos: { x: e.clientX, y: e.clientY }
      }));
    };

    const handleMouseUp = () => {
      if (dragState.isDragging && dragState.currentPos && dragState.draggedItem !== null) {
        const gifId = orderedGifs[dragState.draggedItem].id;
        const finalPos = {
          x: dragState.currentPos.x - (dragState.offset?.x || 0),
          y: dragState.currentPos.y - (dragState.offset?.y || 0)
        };
        
        console.log('Mouse drag end - saving position:', finalPos, 'for gif:', gifId);
        
        // Save the final position
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
    
    // If currently being dragged
    if (dragState.draggedItem === index && dragState.currentPos && dragState.offset) {
      const style = {
        position: 'fixed' as const,
        left: dragState.currentPos.x - dragState.offset.x,
        top: dragState.currentPos.y - dragState.offset.y,
        zIndex: 1000,
        pointerEvents: 'none' as const
      };
      
      console.log('Drag style for item', index, ':', style);
      return style;
    }
    
    // If has a custom stored position
    if (customPos && variant === 'large') {
      const style = {
        position: 'fixed' as const,
        left: customPos.x,
        top: customPos.y,
        zIndex: 1
      };
      
      console.log('Custom position for item', index, ':', style);
      return style;
    }
    
    // Default positioning
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
    <div className={`collage-container ${getContainerClass()}`}>
      <div 
        className="collage-grid"
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