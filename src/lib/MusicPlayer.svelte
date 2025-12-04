<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MusicTrack } from '../types';

  interface Props {
    tracks: MusicTrack[];
    onLayoutToggle: () => void;
    viewMode: 'list' | 'stack' | 'large-list' | 'pinterest' | 'irregular' | 'pics-only';
    currentTrack: MusicTrack | null;
    isPlaying: boolean;
    onTrackPlay: (track: MusicTrack) => void;
    isVisible?: boolean;
  }

  let {
    tracks,
    onLayoutToggle,
    viewMode,
    currentTrack,
    isPlaying,
    onTrackPlay,
    isVisible = true
  }: Props = $props();

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
    return isMobile || isTouchDevice;
  };

  // Store last error for debugging (accessible via window.lastMobileAudioError)
  const logMobileAudioError = (context: string, error: any, additionalInfo?: any) => {
    if (typeof window !== 'undefined') {
      (window as any).lastMobileAudioError = {
        context,
        error: error.message || error,
        errorType: error.constructor?.name,
        isMobile: isMobileDevice(),
        audioContextState: audioContext?.state,
        timestamp: new Date().toISOString(),
        ...additionalInfo
      };
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
  let viewModeSymbol = $derived(
    (() => {
      switch (viewMode) {
        case 'list':
          return '⧪';
        case 'stack':
          return '▦';
        case 'large-list':
          return '◈';
        case 'irregular':
          return '⧻';
        case 'pics-only':
          return '⧮';
        case 'pinterest':
          return '☰';
        default:
          return '☰';
      }
    })()
  );

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

      return audioContext.state === 'running';
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
  };

  // Preload track for Web Audio API
  const preloadTrack = async (track: MusicTrack) => {
    const audioPath = getMobileAudioPath(track.path);
    if (audioBufferCache.has(audioPath)) return;

    if (!checkAudioSupport(audioPath)) {
      return;
    }

    try {
      const response = await fetch(audioPath);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await audioContext!.decodeAudioData(arrayBuffer);
      audioBufferCache.set(audioPath, decodedBuffer);
    } catch (error) {
      logMobileAudioError('preloading', error, { audioPath, trackName: track.name });
    }
  };

  async function initAudio() {
    const isMobile = isMobileDevice();

    if (isMobile) {
      // For mobile, preload HTML5 audio elements
      tracks.forEach((track) => preloadMobileAudio(track));
    } else {
      // For desktop, preload Web Audio API buffers
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          gainNode = audioContext.createGain();
          gainNode.connect(audioContext.destination);
          gainNode.gain.value = volume;
        }

        const preloadPromises = tracks.map((track) => preloadTrack(track));
        await Promise.all(preloadPromises);
      } catch {
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
      } catch {
        await playFallbackAudio(audioPath);
      }
    } else {
      // Desktop - use Web Audio API with cached buffers
      const cachedBuffer = audioBufferCache.get(audioPath);
      if (cachedBuffer && audioContext && gainNode) {
        const success = await activateAudioContext();

        if (!success) {
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

    if (isMobileDevice()) {
      useFallbackAudio = true;

      try {
        stopPlayback();

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

        await audio.play();
        fallbackAudio = audio;
        onTrackPlay(track);
        return;
      } catch {
        alert('Unable to play audio. Please ensure your browser allows audio playback.');
        return;
      }
    }

    // Desktop - use Web Audio API
    try {
      await activateAudioContext();
      onTrackPlay(track);
    } catch {
      // Audio activation failed silently
    }
  }

  // React to track and playing state changes
  $effect(() => {
    if (currentTrack && isPlaying) {
      playTrack(currentTrack);
    } else if (!isPlaying) {
      stopPlayback();
    }
  });

  // Update volume on audio elements
  $effect(() => {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
    if (fallbackAudio) {
      fallbackAudio.volume = volume;
    }
  });

  onMount(() => {
    initAudio();
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
  });
</script>

{#if isVisible}
  <div class="music-player" role="presentation">
    <div class="track-list">
      {#each tracks as track}
        <button
          class="track-item"
          class:active={currentTrack?.id === track.id && isPlaying}
          onclick={() => handleTrackClick(track)}
          onmousedown={(e) => e.stopPropagation()}
        >
          <span class="track-controls">
            {currentTrack?.id === track.id && isPlaying ? '■' : '▶'}
          </span>
        </button>
      {/each}
    </div>
    <div class="layout-toggle">
      <button class="toggle-btn" onclick={onLayoutToggle} onmousedown={(e) => e.stopPropagation()}>
        {viewModeSymbol}
      </button>
    </div>
  </div>
{/if}

<style>
  .music-player {
    position: fixed;
    width: 110px;
    background: var(--color-bg-secondary);
    border: none;
    border-radius: 0;
    padding: 4px;
    z-index: var(--z-player);
    font-family: 'Courier New', monospace;
    cursor: default;
    user-select: none;
  }

  @media (min-width: 769px) {
    .music-player:not(.dragging):not(.positioned) {
      position: fixed;
      top: 20px;
      right: 60px;
    }
  }

  .music-player:hover {
    background: var(--color-bg-secondary);
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
    background: var(--color-bg-primary);
    border: none;
    border-radius: 0;
    cursor: pointer;
    transition: opacity var(--transition-fast);
    font-size: 16px;
    color: var(--color-accent);
    z-index: var(--z-player-controls);
    position: relative;
  }

  .track-item:hover {
    opacity: 0.8;
  }

  .track-item.active {
    background: var(--color-bg-primary);
    opacity: 1;
    border: 1px solid var(--color-bg-primary);
  }

  .track-item:focus {
    outline: none;
  }

  .track-controls {
    font-size: 14px;
    color: var(--color-accent);
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
    background: var(--color-bg-primary);
    border: none;
    border-radius: 0;
    color: var(--color-accent);
    font-size: 18px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    transition: opacity var(--transition-fast);
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
      position: relative;
      top: auto;
      left: 50%;
      right: auto;
      transform: translateX(-50%);
      width: 160px;
      margin: 20px 0 30px 0;
      display: block;
      padding: 8px;
      z-index: var(--z-player);
      overflow: visible;
      background: var(--color-bg-secondary);
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
      display: block;
      margin-bottom: 0;
      width: 100%;
    }

    .toggle-btn {
      width: 144px;
      height: 36px;
      font-size: 20px;
      outline: none;
      display: flex;
      justify-content: center;
      align-items: center;
      visibility: visible;
      opacity: 1;
    }
  }
</style>
