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
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onTrackPlay: (track: MusicTrack) => void;
  onPlayingChange: (playing: boolean) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  tracks,
  onLayoutToggle,
  viewMode,
  isVisible = true,
  mousePosition,
  onDismiss,
  teleportTrigger,
  currentTrack,
  isPlaying,
  onTrackPlay,
  onPlayingChange
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 180, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const [volume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);


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


  // Web Audio API setup for gapless looping
  useEffect(() => {
    const initAudioContext = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
      }
    };

    const loadAudioBuffer = async (url: string) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };

    if (currentTrack) {
      initAudioContext().then(() => {
        loadAudioBuffer(currentTrack.path);
      });
    }

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [currentTrack, volume]);

  // Use the prop function instead of local playTrack
  const handleTrackClick = (track: MusicTrack) => {
    onTrackPlay(track);
  };

  // Gapless playback control
  useEffect(() => {
    const playGapless = () => {
      if (!audioContextRef.current || !audioBufferRef.current || !gainNodeRef.current) return;

      // Stop current source if playing
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }

      // Create new source for gapless looping
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true;
      source.connect(gainNodeRef.current);

      sourceNodeRef.current = source;
      source.start(0);
    };

    const stopPlayback = () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };

    if (currentTrack && isPlaying && audioBufferRef.current) {
      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().then(playGapless);
      } else {
        playGapless();
      }
    } else if (!isPlaying) {
      stopPlayback();
    }

    return () => {
      if (!isPlaying && sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);




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
                onClick={() => handleTrackClick(track)}
              >
                <div className="track-controls">
                  {currentTrack?.id === track.id && isPlaying ? '■' : '▶'}
                </div>
              </div>
            ))}
          </div>

          <div className="layout-toggle">
            <button className="toggle-btn" onClick={onLayoutToggle}>
              {viewMode === 'list' ? '⧪' : 
               viewMode === 'stack' ? '▦' : 
               viewMode === 'large-list' ? '◈' : 
               viewMode === 'irregular' ? '⧻' : 
               viewMode === 'pics-only' ? '⧮' : 
               viewMode === 'pinterest' ? '☰' : '☰'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicPlayer;