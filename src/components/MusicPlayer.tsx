import React, { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '../types';
import './MusicPlayer.css';

interface MusicPlayerProps {
  tracks: MusicTrack[];
  onLayoutToggle: () => void;
  viewMode: 'list' | 'stack' | 'large-list';
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ tracks, onLayoutToggle, viewMode }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 180, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;
    
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't start dragging if clicking on interactive elements
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.closest('button') || 
        target.closest('input') ||
        target.classList.contains('track-item') ||
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
      
      // Keep player within viewport bounds
      const playerElement = playerRef.current;
      if (playerElement) {
        const rect = playerElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
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
      <audio 
        ref={audioRef} 
        src={currentTrack?.path} 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
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
  );
};

export default MusicPlayer;