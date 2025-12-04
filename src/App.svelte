<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GifDisplay from './lib/GifDisplay.svelte';
  import StaticImageDisplay from './lib/StaticImageDisplay.svelte';
  import CollageView from './lib/CollageView.svelte';
  import PinterestGallery from './lib/PinterestGallery.svelte';
  import IrregularCollage from './lib/IrregularCollage.svelte';
  import MusicPlayer from './lib/MusicPlayer.svelte';
  import Lightbox from './lib/Lightbox.svelte';
  import { gifs, musicTracks, combinedMedia, staticImages } from './data';
  import type { GifItem, MediaItem, MusicTrack } from './types';

  let scrollProgress = 0;
  let lightboxGif: GifItem | null = null;
  let isLightboxOpen = false;
  let viewMode: 'list' | 'stack' | 'large-list' | 'pinterest' | 'irregular' | 'pics-only' = 'pinterest';
  let isInitialLoad = true;
  let isMusicPlayerVisible = true;
  let imageRefreshKey = 0;
  let currentTrack: MusicTrack | null = null;
  let isPlaying = false;

  function handleScroll() {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.scrollY / totalHeight) * 100;
    scrollProgress = progress;
  }

  function toggleLayout(direction: 'forward' | 'backward' = 'forward') {
    const nextMode = (() => {
      if (direction === 'backward') {
        switch (viewMode) {
          case 'list': return 'pinterest';
          case 'stack': return 'list';
          case 'irregular': return 'stack';
          case 'pics-only': return 'irregular';
          case 'large-list': return 'pics-only';
          case 'pinterest': return 'large-list';
          default: return 'list';
        }
      } else {
        switch (viewMode) {
          case 'list': return 'stack';
          case 'stack': return 'irregular';
          case 'irregular': return 'pics-only';
          case 'pics-only': return 'large-list';
          case 'large-list': return 'pinterest';
          case 'pinterest': return 'list';
          default: return 'list';
        }
      }
    })();

    viewMode = nextMode;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (isLightboxOpen) return;

    if (e.key === 'Shift') {
      isMusicPlayerVisible = !isMusicPlayerVisible;
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
      toggleLayout('backward');
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
      toggleLayout('forward');
    } else if (e.key === 'r' || e.key === 'R') {
      imageRefreshKey++;
    } else if (e.key >= '1' && e.key <= '4') {
      const trackIndex = parseInt(e.key) - 1;
      if (musicTracks[trackIndex]) {
        playTrack(musicTracks[trackIndex]);
        e.preventDefault();
      }
    }
  }

  function openLightbox(gif: GifItem) {
    lightboxGif = gif;
    isLightboxOpen = true;
  }

  function closeLightbox() {
    isLightboxOpen = false;
    lightboxGif = null;
  }

  function handleMediaClick(mediaItem: MediaItem) {
    openLightbox({ id: mediaItem.id, name: mediaItem.name, path: mediaItem.path });
  }

  function playTrack(track: MusicTrack) {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        isPlaying = false;
        currentTrack = null;
      } else {
        isPlaying = true;
      }
    } else {
      currentTrack = track;
      isPlaying = true;
    }
  }

  onMount(() => {
    if (isInitialLoad) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      isInitialLoad = false;
    }
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div class="app">
  <div class="scroll-progress-bar" style="width: {scrollProgress}%"></div>

  <main class="main-content">
    <MusicPlayer
      tracks={musicTracks}
      onLayoutToggle={() => toggleLayout()}
      {viewMode}
      {currentTrack}
      {isPlaying}
      onTrackPlay={playTrack}
      isVisible={isMusicPlayerVisible}
    />

    {#if viewMode === 'list'}
      {#key imageRefreshKey}
        <section class="gallery-section">
          {#each gifs as gif, index (gif.id)}
            <GifDisplay {gif} {index} onClick={() => openLightbox(gif)} />
          {/each}
        </section>
      {/key}
    {:else if viewMode === 'stack'}
      {#key imageRefreshKey}
        <CollageView gifs={gifs} onGifClick={openLightbox} variant="large" />
      {/key}
    {:else if viewMode === 'pinterest'}
      {#key imageRefreshKey}
        <PinterestGallery media={combinedMedia} onMediaClick={handleMediaClick} />
      {/key}
    {:else if viewMode === 'irregular'}
      {#key imageRefreshKey}
        <IrregularCollage media={combinedMedia} onMediaClick={handleMediaClick} />
      {/key}
    {:else if viewMode === 'pics-only'}
      {#key imageRefreshKey}
        <section class="gallery-section">
          {#each staticImages as image (image.id)}
            <StaticImageDisplay {image} onClick={() => openLightbox({ id: image.id, name: image.name, path: image.path })} />
          {/each}
        </section>
      {/key}
    {:else if viewMode === 'large-list'}
      {#key imageRefreshKey}
        <CollageView gifs={gifs} onGifClick={openLightbox} variant="stack" />
      {/key}
    {/if}
  </main>

  {#if viewMode !== 'pics-only' && viewMode !== 'pinterest'}
    <div class="ambient-effects">
      <div class="floating-particle"></div>
      <div class="floating-particle"></div>
      <div class="floating-particle"></div>
      <div class="floating-particle"></div>
    </div>
  {/if}

  <Lightbox
    gif={lightboxGif}
    isOpen={isLightboxOpen}
    onClose={closeLightbox}
  />
</div>
