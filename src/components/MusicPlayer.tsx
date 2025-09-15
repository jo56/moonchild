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

  // HTML5 Audio fallback for mobile
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [useFallbackAudio, setUseFallbackAudio] = useState(false);
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());


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
      const audioPath = getMobileAudioPath(track.path);
      if (audioBufferCacheRef.current.has(audioPath)) return;

      // Check if the browser supports this audio format
      if (!checkAudioSupport(audioPath)) {
        console.warn(`Browser does not support audio format for ${audioPath}`);
        return;
      }

      try {
        console.log(`Preloading track: ${audioPath}`);
        const response = await fetch(audioPath);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`Fetched ${arrayBuffer.byteLength} bytes for ${audioPath}`);

        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        console.log(`Successfully decoded audio for ${audioPath}, duration: ${audioBuffer.duration}s`);

        audioBufferCacheRef.current.set(audioPath, audioBuffer);
      } catch (error) {
        logMobileAudioError('preloading', error, { audioPath, trackName: track.name });

        if (error instanceof DOMException && error.name === 'NotSupportedError') {
          console.error('This audio format is not supported on this device. Consider using MP3 or AAC format for mobile compatibility.');
        }
      }
    };

    // Preload HTML5 audio for mobile devices
    const preloadMobileAudio = (track: MusicTrack) => {
      const audioPath = getMobileAudioPath(track.path);

      if (preloadedAudioRef.current.has(audioPath)) return;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = volume;
      audio.crossOrigin = 'anonymous';

      // Set the source and start loading
      audio.src = audioPath;
      audio.load();

      // Store the preloaded audio
      preloadedAudioRef.current.set(audioPath, audio);

      console.log(`Preloading mobile audio: ${audioPath}`);
    };

    const preloadAllTracks = async () => {
      const isMobile = isMobileDevice();

      if (isMobile) {
        // For mobile, preload HTML5 audio elements
        tracks.forEach(track => preloadMobileAudio(track));
      } else {
        // For desktop, preload Web Audio API buffers
        await initAudioContext();
        const preloadPromises = tracks.map(track => preloadTrack(track));
        await Promise.all(preloadPromises);
      }
    };

    if (tracks.length > 0) {
      preloadAllTracks();
    }
  }, [tracks, volume]);

  // Track selection effect - use cached buffers for instant playback
  useEffect(() => {
    // Stop any current playback immediately and synchronously
    if (useFallbackAudio) {
      stopFallbackAudio();
    } else if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    if (currentTrack) {
      const audioPath = getMobileAudioPath(currentTrack.path);

      if (useFallbackAudio) {
        // For fallback audio, just prepare the path - playback is handled in play/pause effect
        if (isPlaying) {
          playFallbackAudio(audioPath).catch(error => {
            console.error('Failed to start fallback audio on track change:', error);
          });
        }
      } else {
        // Use cached buffer for instant playback with Web Audio API
        const cachedBuffer = audioBufferCacheRef.current.get(audioPath);
        if (cachedBuffer) {
          audioBufferRef.current = cachedBuffer;

          // If we should be playing, start playback
          if (isPlaying && audioContextRef.current && gainNodeRef.current) {
            const startTrackPlayback = async () => {
              // Ensure AudioContext is activated for mobile
              const success = await activateAudioContext();

              if (!success) {
                console.warn('AudioContext activation failed on track change, switching to fallback');
                setUseFallbackAudio(true);
                await playFallbackAudio(audioPath);
                return;
              }

              // Verify AudioContext is running and we still have the same track
              if (audioContextRef.current!.state === 'running' &&
                  audioBufferRef.current === cachedBuffer &&
                  currentTrack && isPlaying) {
                const source = audioContextRef.current!.createBufferSource();
                source.buffer = cachedBuffer;
                source.loop = true;
                source.connect(gainNodeRef.current!);
                sourceNodeRef.current = source;
                source.start(0);
              }
            };

            startTrackPlayback();
          }
        }
      }
    } else {
      // Clear buffer when no track selected
      audioBufferRef.current = null;
    }

    return () => {
      if (useFallbackAudio) {
        stopFallbackAudio();
      } else if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
    };
  }, [currentTrack, isPlaying, useFallbackAudio]);

  // Mobile audio context activation - needed for iOS/mobile browsers
  const activateAudioContext = async (): Promise<boolean> => {
    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
      }

      // Try to resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const isRunning = audioContextRef.current.state === 'running';
      console.log('AudioContext activation result:', {
        state: audioContextRef.current.state,
        isRunning,
        isMobile: isMobileDevice()
      });


      return isRunning;
    } catch (error) {
      logMobileAudioError('AudioContext activation', error);
      return false;
    }
  };

  // Check if device is mobile with detailed detection
  const isMobileDevice = (): boolean => {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobile = mobileRegex.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Log for debugging
    if (isMobile || isTouchDevice) {
      console.log('Mobile device detected:', {
        userAgent: navigator.userAgent,
        isMobile,
        isTouchDevice,
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        screenWidth: screen.width,
        windowWidth: window.innerWidth
      });
    }

    return isMobile || isTouchDevice;
  };

  // Enhanced error logging for mobile debugging
  const logMobileAudioError = (context: string, error: any, additionalInfo?: any) => {
    const errorInfo = {
      context,
      error: error.message || error,
      errorType: error.constructor.name,
      isMobile: isMobileDevice(),
      audioContextState: audioContextRef.current?.state,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    };

    console.error('Mobile Audio Error:', errorInfo);

    // Store error info for debugging
    if (typeof window !== 'undefined') {
      (window as any).lastMobileAudioError = errorInfo;
    }
  };

  // Convert audio path to mobile-friendly format (m4a) if on mobile
  const getMobileAudioPath = (originalPath: string): string => {
    if (isMobileDevice() && originalPath.endsWith('.ogg')) {
      return originalPath.replace('.ogg', '.m4a');
    }
    return originalPath;
  };

  // Check if browser supports the audio format
  const checkAudioSupport = (audioPath: string): boolean => {
    const audio = new Audio();
    const extension = audioPath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'ogg':
        return audio.canPlayType('audio/ogg') !== '';
      case 'mp3':
        return audio.canPlayType('audio/mpeg') !== '';
      case 'wav':
        return audio.canPlayType('audio/wav') !== '';
      case 'aac':
        return audio.canPlayType('audio/aac') !== '';
      case 'm4a':
        return audio.canPlayType('audio/mp4') !== '';
      default:
        return false;
    }
  };

  // Initialize fallback HTML5 audio element
  const initFallbackAudio = (audioPath: string) => {
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioPath);
    audio.loop = true;
    audio.volume = volume;

    // Add mobile-specific attributes
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    fallbackAudioRef.current = audio;

    return audio;
  };

  // Play using fallback HTML5 audio
  const playFallbackAudio = async (audioPath: string): Promise<boolean> => {
    try {
      const audio = initFallbackAudio(audioPath);

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });

      await audio.play();
      console.log('Fallback HTML5 audio started successfully');
      return true;
    } catch (error) {
      logMobileAudioError('fallback audio playback', error, { audioPath });
      return false;
    }
  };

  // Stop fallback audio
  const stopFallbackAudio = () => {
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.currentTime = 0;
    }
  };

  // Use the prop function instead of local playTrack
  const handleTrackClick = async (track: MusicTrack) => {
    const audioPath = getMobileAudioPath(track.path);
    console.log(`Track clicked: ${track.name} (${audioPath})`);

    // For mobile devices, use preloaded audio for instant playback
    const isMobile = isMobileDevice();
    if (isMobile) {
      console.log('Mobile device detected, using preloaded HTML5 audio');
      setUseFallbackAudio(true);

      try {
        // Stop current audio
        if (fallbackAudioRef.current) {
          fallbackAudioRef.current.pause();
          fallbackAudioRef.current.currentTime = 0;
        }

        // Get preloaded audio or create new one
        let audio = preloadedAudioRef.current.get(audioPath);

        if (!audio) {
          // Fallback: create new audio if not preloaded
          console.log('Audio not preloaded, creating new one');
          audio = new Audio(audioPath);
          audio.loop = true;
          audio.volume = volume;
          audio.load();
        } else {
          // Reset preloaded audio
          audio.currentTime = 0;
          audio.volume = volume;
        }

        // Play immediately - this should be instant with preloaded audio
        await audio.play();

        // Store the active audio element
        fallbackAudioRef.current = audio;

        console.log('Mobile HTML5 audio started successfully');
        onTrackPlay(track);
        return;
      } catch (error) {
        console.error('Mobile audio failed:', error);
        alert('Unable to play audio. Please ensure your browser allows audio playback.');
        return;
      }
    }

    // Desktop - use Web Audio API
    try {
      await activateAudioContext();
      onTrackPlay(track);
    } catch (error) {
      console.error('Desktop audio failed:', error);
    }
  };

  // Handle play/pause state changes
  useEffect(() => {
    if (!isPlaying) {
      // Stop playback when paused
      if (useFallbackAudio && fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
      } else if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      return;
    }

    if (isPlaying && currentTrack) {
      // Start playback
      if (useFallbackAudio && fallbackAudioRef.current) {
        // Resume HTML5 audio
        fallbackAudioRef.current.play().catch(error => {
          console.error('Failed to resume fallback audio:', error);
        });
      } else if (audioBufferRef.current && !sourceNodeRef.current && !useFallbackAudio) {
        // Use Web Audio API for desktop
        const startPlayback = async () => {
          const success = await activateAudioContext();
          if (!success) {
            console.warn('AudioContext activation failed');
            return;
          }

          if (!isPlaying || sourceNodeRef.current) {
            return;
          }

          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBufferRef.current!;
          source.loop = true;
          source.connect(gainNodeRef.current!);
          sourceNodeRef.current = source;
          source.start(0);
        };

        startPlayback();
      }
    }
  }, [isPlaying, currentTrack, useFallbackAudio]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
        fallbackAudioRef.current = null;
      }
      // Clean up preloaded audio
      preloadedAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      preloadedAudioRef.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);





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