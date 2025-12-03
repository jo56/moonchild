<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MusicTrack } from '../types';

  export let tracks: MusicTrack[];
  export let onLayoutToggle: () => void;
  export let viewMode: 'list' | 'stack' | 'large-list' | 'pinterest' | 'irregular' | 'pics-only';
  export let currentTrack: MusicTrack | null;
  export let isPlaying: boolean;
  export let onTrackPlay: (track: MusicTrack) => void;
  export let isVisible: boolean = true;
  export let mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  export let onDismiss: () => void = () => {};
  export let teleportTrigger: number = 0;
  export let onPlayingChange: (playing: boolean) => void = () => {};

  let position = { x: typeof window !== 'undefined' ? window.innerWidth - 180 : 800, y: 20 };
  let hasBeenMoved = false;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let lastTeleportTrigger = 0;
  let playerRef: HTMLDivElement;
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let audioBufferCache = new Map<string, AudioBuffer>();
  let fallbackAudio: HTMLAudioElement | null = null;
  let useFallbackAudio = false;
  let preloadedAudioCache = new Map<string, HTMLAudioElement>();
  const volume = 0.7;

  // Check if device is mobile with detailed detection
  const isMobileDevice = (): boolean => {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobile = mobileRegex.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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
      errorType: error.constructor?.name,
      isMobile: isMobileDevice(),
      audioContextState: audioContext?.state,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    };

    console.error('Mobile Audio Error:', errorInfo);

    if (typeof window !== 'undefined') {
      (window as any).lastMobileAudioError = errorInfo;
    }
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

  const getMobileAudioPath = (path: string) => {
    if (isMobileDevice() && path.endsWith('.ogg')) {
      return path.replace('.ogg', '.m4a');
    }
    return path;
  };

  // Reactive symbol that updates when viewMode changes
  $: viewModeSymbol = (() => {
    switch (viewMode) {
      case 'list': return '⧪';
      case 'stack': return '▦';
      case 'large-list': return '◈';
      case 'irregular': return '⧻';
      case 'pics-only': return '⧮';
      case 'pinterest': return '☰';
      default: return '☰';
    }
  })();

  // Mobile audio context activation - needed for iOS/mobile browsers
  const activateAudioContext = async (): Promise<boolean> => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = volume;
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const isRunning = audioContext.state === 'running';
      console.log('AudioContext activation result:', {
        state: audioContext.state,
        isRunning,
        isMobile: isMobileDevice()
      });

      return isRunning;
    } catch (error) {
      logMobileAudioError('AudioContext activation', error);
      return false;
    }
  };

  // Preload HTML5 audio for mobile devices
  const preloadMobileAudio = (track: MusicTrack) => {
    const audioPath = getMobileAudioPath(track.path);

    if (preloadedAudioCache.has(audioPath)) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = volume;
    audio.crossOrigin = 'anonymous';
    audio.src = audioPath;
    audio.load();

    preloadedAudioCache.set(audioPath, audio);
    console.log(`Preloading mobile audio: ${audioPath}`);
  };

  // Preload track for Web Audio API
  const preloadTrack = async (track: MusicTrack) => {
    const audioPath = getMobileAudioPath(track.path);
    if (audioBufferCache.has(audioPath)) return;

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

      const decodedBuffer = await audioContext!.decodeAudioData(arrayBuffer);
      console.log(`Successfully decoded audio for ${audioPath}, duration: ${decodedBuffer.duration}s`);

      audioBufferCache.set(audioPath, decodedBuffer);
    } catch (error) {
      logMobileAudioError('preloading', error, { audioPath, trackName: track.name });

      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        console.error('This audio format is not supported on this device. Consider using MP3 or AAC format for mobile compatibility.');
      }
    }
  };

  async function initAudio() {
    const isMobile = isMobileDevice();

    if (isMobile) {
      // For mobile, preload HTML5 audio elements
      tracks.forEach(track => preloadMobileAudio(track));
    } else {
      // For desktop, preload Web Audio API buffers
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          gainNode = audioContext.createGain();
          gainNode.connect(audioContext.destination);
          gainNode.gain.value = volume;
        }

        const preloadPromises = tracks.map(track => preloadTrack(track));
        await Promise.all(preloadPromises);
      } catch (err) {
        console.warn('Web Audio API not available, using fallback:', err);
        useFallbackAudio = true;
      }
    }
  }

  // Initialize fallback HTML5 audio element
  const initFallbackAudio = (audioPath: string) => {
    if (fallbackAudio) {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    }

    const audio = new Audio(audioPath);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    fallbackAudio = audio;
    return audio;
  };

  // Play using fallback HTML5 audio
  const playFallbackAudio = async (audioPath: string): Promise<boolean> => {
    try {
      const audio = initFallbackAudio(audioPath);

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
    if (fallbackAudio) {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    }
  };

  async function playTrack(track: MusicTrack) {
    const audioPath = getMobileAudioPath(track.path);

    // Stop current playback
    if (sourceNode) {
      sourceNode.stop();
      sourceNode = null;
    }
    stopFallbackAudio();

    if (useFallbackAudio || isMobileDevice()) {
      // For mobile, use preloaded audio for instant playback
      let audio = preloadedAudioCache.get(audioPath);

      if (!audio) {
        audio = new Audio(audioPath);
        audio.loop = true;
        audio.volume = volume;
        audio.load();
      } else {
        audio.currentTime = 0;
        audio.volume = volume;
      }

      try {
        await audio.play();
        fallbackAudio = audio;
        console.log('Mobile HTML5 audio started successfully');
      } catch (err) {
        console.error('Mobile audio failed:', err);
        await playFallbackAudio(audioPath);
      }
    } else {
      // Desktop - use Web Audio API with cached buffers
      const cachedBuffer = audioBufferCache.get(audioPath);
      if (cachedBuffer && audioContext && gainNode) {
        const success = await activateAudioContext();

        if (!success) {
          console.warn('AudioContext activation failed, switching to fallback');
          useFallbackAudio = true;
          await playFallbackAudio(audioPath);
          return;
        }

        if (audioContext.state === 'running') {
          sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = cachedBuffer;
          sourceNode.loop = true;
          sourceNode.connect(gainNode);
          sourceNode.start(0);
        }
      }
    }
  }

  function stopPlayback() {
    if (sourceNode) {
      sourceNode.stop();
      sourceNode = null;
    }
    stopFallbackAudio();
  }

  async function handleTrackClick(track: MusicTrack) {
    const audioPath = getMobileAudioPath(track.path);
    console.log(`Track clicked: ${track.name} (${audioPath})`);

    if (isMobileDevice()) {
      console.log('Mobile device detected, using preloaded HTML5 audio');
      useFallbackAudio = true;

      try {
        stopPlayback();

        let audio = preloadedAudioCache.get(audioPath);

        if (!audio) {
          console.log('Audio not preloaded, creating new one');
          audio = new Audio(audioPath);
          audio.loop = true;
          audio.volume = volume;
          audio.load();
        } else {
          audio.currentTime = 0;
          audio.volume = volume;
        }

        await audio.play();
        fallbackAudio = audio;

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
  }

  function handleMouseDown(e: MouseEvent) {
    if (isMobileDevice()) return;
    isDragging = true;
    dragStart = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const playerElement = playerRef;
    if (playerElement) {
      const rect = playerElement.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      position = {
        x: Math.max(-50, Math.min(newX, maxX + 50)),
        y: Math.max(-50, Math.min(newY, maxY + 50))
      };
    }
  }

  function handleMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    hasBeenMoved = true;

    // Dismiss if dragged far off any edge
    const dismissThreshold = 50;

    if (position.x < -dismissThreshold ||
        position.x > window.innerWidth - dismissThreshold ||
        position.y < -dismissThreshold ||
        position.y > window.innerHeight - dismissThreshold) {
      onDismiss();
    }
  }

  function handleResize() {
    position = {
      ...position,
      x: Math.min(position.x, window.innerWidth - 220)
    };
  }

  // Teleport to mouse when teleportTrigger changes (only when it actually increases)
  $: if (teleportTrigger > lastTeleportTrigger && mousePosition.x > 0 && !isDragging) {
    lastTeleportTrigger = teleportTrigger;
    position = {
      x: Math.max(10, Math.min(mousePosition.x - 100, window.innerWidth - 220)),
      y: Math.max(10, Math.min(mousePosition.y - 50, window.innerHeight - 100))
    };
  }

  // React to track and playing state changes
  $: if (currentTrack && isPlaying) {
    playTrack(currentTrack);
  } else if (!isPlaying) {
    stopPlayback();
  }

  // Update volume on audio elements
  $: {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
    if (fallbackAudio) {
      fallbackAudio.volume = volume;
    }
  }

  onMount(() => {
    initAudio();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    stopPlayback();

    // Clean up preloaded audio
    preloadedAudioCache.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    preloadedAudioCache.clear();

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('resize', handleResize);
  });
</script>

{#if isVisible}
  <div
    bind:this={playerRef}
    class="music-player"
    class:dragging={isDragging}
    class:positioned={hasBeenMoved}
    style={hasBeenMoved && !isMobileDevice() ? `left: ${position.x}px; top: ${position.y}px;` : ''}
    on:mousedown={handleMouseDown}
    role="presentation"
  >
    <div class="track-list">
      {#each tracks as track}
        <button
          class="track-item"
          class:active={currentTrack?.id === track.id && isPlaying}
          on:click={() => handleTrackClick(track)}
          on:mousedown|stopPropagation
        >
          <span class="track-controls">
            {currentTrack?.id === track.id && isPlaying ? '■' : '▶'}
          </span>
        </button>
      {/each}
    </div>
    <div class="layout-toggle">
      <button class="toggle-btn" on:click={onLayoutToggle} on:mousedown|stopPropagation>
        {viewModeSymbol}
      </button>
    </div>
  </div>
{/if}

<style>
  .music-player {
    position: fixed;
    width: 110px;
    background: #051025;
    border: none;
    border-radius: 0;
    padding: 4px;
    z-index: 1000;
    font-family: 'Courier New', monospace;
    cursor: default;
    user-select: none;
  }

  @media (min-width: 769px) {
    .music-player:not(.dragging):not(.positioned) {
      position: fixed;
      top: 20px;
      right: 60px;
      left: auto !important;
    }
  }

  .music-player.dragging {
    cursor: grabbing;
    opacity: 0.9;
  }

  .music-player:hover {
    background: #051025;
  }

  .track-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
    margin-bottom: 4px;
    width: 100%;
  }

  .track-item {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 32px;
    background: #0a1628;
    border: none;
    border-radius: 0;
    cursor: pointer;
    transition: opacity 0.2s ease;
    font-size: 16px;
    color: #06B6D4;
    z-index: 1001;
    position: relative;
  }

  .track-item:hover {
    opacity: 0.8;
  }

  .track-item.active {
    background: #0a1628;
    opacity: 1;
    border: 1px solid #0a1628;
  }

  .track-controls {
    font-size: 14px;
    color: #06B6D4;
    font-weight: bold;
  }

  .layout-toggle {
    margin-bottom: 0;
    border-top: none;
    padding-top: 0;
    position: relative;
  }

  .toggle-btn {
    width: 102px;
    height: 32px;
    background: #0a1628;
    border: none;
    border-radius: 0;
    color: #06B6D4;
    font-size: 18px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    transition: opacity 0.2s ease;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    outline: none;
  }

  .toggle-btn:hover {
    opacity: 0.8;
  }

  .toggle-btn:focus {
    outline: none;
  }

  @media (max-width: 768px) {
    .music-player {
      position: relative !important;
      top: auto !important;
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      width: 160px;
      margin: 20px 0 30px 0 !important;
      display: block !important;
      padding: 8px;
      z-index: 1000;
      overflow: visible !important;
      background: #051025 !important;
    }

    .track-list {
      gap: 6px;
      margin-bottom: 8px;
    }

    .track-item {
      width: 68px;
      height: 36px;
      font-size: 18px;
    }

    .layout-toggle {
      display: block !important;
      margin-bottom: 0 !important;
      width: 100% !important;
    }

    .toggle-btn {
      width: 144px;
      height: 36px;
      font-size: 20px;
      outline: none;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  }
</style>
