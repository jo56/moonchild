import React, { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '../types';
import './MusicPlayer.css';

interface MusicPlayerProps {
  tracks: MusicTrack[];
  onLayoutToggle: () => void;
  viewMode: 'list' | 'stack' | 'large-list' | 'pinterest' | 'irregular' | 'pics-only';
  isVisible?: boolean;
  mousePosition: { x: number; y: number };
  onDismiss: () => void;
  teleportTrigger?: number; // increment this to trigger teleport
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ tracks, onLayoutToggle, viewMode, isVisible = true, mousePosition, onDismiss, teleportTrigger }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 180, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Teleport to mouse when teleportTrigger changes (only if not dragging)
  useEffect(() => {
    if (teleportTrigger && teleportTrigger > 0 && mousePosition.x > 0 && !isDragging) {
      setPosition({
        x: Math.max(10, Math.min(mousePosition.x - 100, window.innerWidth - 220)),
        y: Math.max(10, Math.min(mousePosition.y - 50, window.innerHeight - 100))
      });
    }
  }, [teleportTrigger]); // Only depend on teleportTrigger

  // Update position on window resize to maintain relative positioning
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        ...prev,
        x: Math.min(prev.x, window.innerWidth - 220)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  const playTrack = (track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && currentTrack && isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };



  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't start dragging if clicking on interactive elements
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.closest('button') || 
        target.closest('input') ||
        target.classList.contains('track-item') ||
        target.classList.contains('volume-control') ||
        target.classList.contains('progress-bar') ||
        target.classList.contains('volume-slider')) {
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep player within viewport bounds (original working logic)
      const playerElement = playerRef.current;
      if (playerElement) {
        const rect = playerElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        setPosition({
          x: Math.max(-50, Math.min(newX, maxX + 50)), // Allow slight offscreen for dismissal
          y: Math.max(-50, Math.min(newY, maxY + 50))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Simple dismissal logic - if dragged far off any edge
      const dismissThreshold = 50;
      
      if (position.x < -dismissThreshold ||  // dragged left
          position.x > window.innerWidth - dismissThreshold ||  // dragged right
          position.y < -dismissThreshold ||  // dragged up
          position.y > window.innerHeight - dismissThreshold) { // dragged down
        onDismiss();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  return (
    <>
      <audio 
        ref={audioRef} 
        src={currentTrack?.path} 
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {isVisible && (
        <div 
          ref={playerRef}
          className={`music-player ${isDragging ? 'dragging' : ''}`}
          style={{ 
            left: position.x, 
            top: position.y,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="track-list">
            {tracks.map((track) => (
              <div 
                key={track.id}
                className={`track-item ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => playTrack(track)}
              >
                <div className="track-controls">
                  {currentTrack?.id === track.id && isPlaying ? '■' : '▶'}
                </div>
              </div>
            ))}
          </div>

          <div className="layout-toggle">
            <button className="toggle-btn" onClick={onLayoutToggle}>
              {viewMode === 'list' ? '⧪' : viewMode === 'stack' ? '⧮' : '☰'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;