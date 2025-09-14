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
  onTrackPlay
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 180, y: 20 });
  const [hasBeenMoved, setHasBeenMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const [volume] = useState(0.7);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());


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

  // Preload all audio files for instant playback
  useEffect(() => {
    const initAudioContext = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
      }
    };

    const preloadTrack = async (track: MusicTrack) => {
      if (audioBufferCacheRef.current.has(track.path)) return;

      try {
        const response = await fetch(track.path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        audioBufferCacheRef.current.set(track.path, audioBuffer);
      } catch (error) {
        console.error(`Error preloading ${track.path}:`, error);
      }
    };

    const preloadAllTracks = async () => {
      await initAudioContext();

      // Preload all tracks in parallel
      const preloadPromises = tracks.map(track => preloadTrack(track));
      await Promise.all(preloadPromises);
    };

    if (tracks.length > 0) {
      preloadAllTracks();
    }
  }, [tracks, volume]);

  // Track selection effect - use cached buffers for instant playback
  useEffect(() => {
    // Stop any current playback
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    if (currentTrack) {
      // Use cached buffer for instant playback
      const cachedBuffer = audioBufferCacheRef.current.get(currentTrack.path);
      if (cachedBuffer) {
        audioBufferRef.current = cachedBuffer;

        // If we should be playing, start immediately
        if (isPlaying && audioContextRef.current && gainNodeRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }

          const source = audioContextRef.current.createBufferSource();
          source.buffer = cachedBuffer;
          source.loop = true;
          source.connect(gainNodeRef.current);
          sourceNodeRef.current = source;
          source.start(0);
        }
      }
    } else {
      // Clear buffer when no track selected
      audioBufferRef.current = null;
    }

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [currentTrack, isPlaying]);

  // Use the prop function instead of local playTrack
  const handleTrackClick = (track: MusicTrack) => {
    onTrackPlay(track);
  };

  // Handle play/pause state changes
  useEffect(() => {
    if (!isPlaying && sourceNodeRef.current) {
      // Stop playback when paused
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    } else if (isPlaying && audioBufferRef.current && !sourceNodeRef.current) {
      // Start playback if we have buffer but no active source
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = true;
      source.connect(gainNodeRef.current!);
      sourceNodeRef.current = source;
      source.start(0);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);





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
      setHasBeenMoved(true); // Mark as moved after any drag

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
          className={`music-player ${isDragging ? 'dragging' : ''} ${hasBeenMoved ? 'positioned' : ''}`}
          style={{
            ...(hasBeenMoved ? {
              left: position.x,
              top: position.y
            } : {}),
            cursor: 'default'
          }}
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