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
  let mousePosition = { x: 0, y: 0 };
  let teleportTrigger = 0;
  let imageRefreshKey = 0;
  let currentTrack: MusicTrack | null = null;
  let isPlaying = false;

  function handleScroll() {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.scrollY / totalHeight) * 100;
    scrollProgress = progress;
  }

  function handleMouseMove(e: MouseEvent) {
    mousePosition = { x: e.clientX, y: e.clientY };
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

    // Scroll to top when switching to stack view
    if (nextMode === 'stack') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Scroll to top when switching to list view
    if (nextMode === 'list') {
      setTimeout(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }

    // Scroll to top when switching to pinterest view
    if (nextMode === 'pinterest') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Scroll to top when switching to irregular collage view
    if (nextMode === 'irregular') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Scroll to top when switching to pics-only view
    if (nextMode === 'pics-only') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Scroll to top when switching to large-list view
    if (nextMode === 'large-list') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  function handleMusicPlayerDismiss() {
    isMusicPlayerVisible = false;
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

  function handlePlayingChange(playing: boolean) {
    isPlaying = playing;
  }

  function showNextGif() {
    if (!lightboxGif) return;
    let currentArray: Array<GifItem | MediaItem>;
    if (viewMode === 'pinterest' || viewMode === 'irregular') {
      currentArray = combinedMedia;
    } else if (viewMode === 'pics-only') {
      currentArray = staticImages;
    } else {
      currentArray = gifs;
    }
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif!.id);
    const nextIndex = (currentIndex + 1) % currentArray.length;
    const nextItem = currentArray[nextIndex];
    lightboxGif = { id: nextItem.id, name: nextItem.name, path: nextItem.path };
  }

  function showPreviousGif() {
    if (!lightboxGif) return;
    let currentArray: Array<GifItem | MediaItem>;
    if (viewMode === 'pinterest' || viewMode === 'irregular') {
      currentArray = combinedMedia;
    } else if (viewMode === 'pics-only') {
      currentArray = staticImages;
    } else {
      currentArray = gifs;
    }
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif!.id);
    const previousIndex = (currentIndex - 1 + currentArray.length) % currentArray.length;
    const prevItem = currentArray[previousIndex];
    lightboxGif = { id: prevItem.id, name: prevItem.name, path: prevItem.path };
  }

  onMount(() => {
    if (isInitialLoad) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      isInitialLoad = false;
    }
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('mousemove', handleMouseMove);
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
      {mousePosition}
      onDismiss={handleMusicPlayerDismiss}
      {teleportTrigger}
      onPlayingChange={handlePlayingChange}
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
          {#each staticImages as image, index (image.id)}
            <StaticImageDisplay {image} {index} onClick={() => openLightbox({ id: image.id, name: image.name, path: image.path })} />
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
    onNext={showNextGif}
    onPrevious={showPreviousGif}
  />
</div>
