<script lang="ts">
  import { onMount } from 'svelte';
  import type { MediaItem } from '../types';

  export let media: MediaItem[];
  export let onMediaClick: (mediaItem: MediaItem) => void;

  interface MediaWithHeight extends MediaItem {
    height: number;
    loaded: boolean;
  }

  let mediaWithHeights: MediaWithHeight[] = [];
  let columns = 3;
  let containerRef: HTMLDivElement;
  let mounted = false;

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function loadMediaHeight(mediaItem: MediaItem): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const columnWidth = 280;
        const calculatedHeight = columnWidth * aspectRatio;
        resolve(Math.max(200, Math.min(500, calculatedHeight)));
      };
      img.onerror = () => resolve(300);
      img.src = mediaItem.path;
    });
  }

  function calculateColumns() {
    if (!containerRef) return;

    const containerWidth = containerRef.offsetWidth;
    const minColumnWidth = 300;
    const gap = 20;

    const possibleColumns = Math.floor((containerWidth + gap) / (minColumnWidth + gap));
    const newColumns = Math.max(1, Math.min(possibleColumns, 4));

    columns = newColumns;
  }

  async function loadAllMedia() {
    const shuffledMedia = shuffleArray(media);
    const mediaPromises = shuffledMedia.map(async (item) => {
      const height = await loadMediaHeight(item);
      return {
        ...item,
        height,
        loaded: true
      };
    });

    const loadedMedia = await Promise.all(mediaPromises);
    mediaWithHeights = loadedMedia;
  }

  function getColumnItems(columnIndex: number) {
    return mediaWithHeights.filter((_, index) => index % columns === columnIndex);
  }

  function handleMediaClick(mediaItem: MediaItem) {
    onMediaClick(mediaItem);
  }

  // Only load media after component is mounted to ensure proper timing
  $: if (mounted && media && media.length > 0) {
    loadAllMedia().then(() => {
      // Recalculate columns after media loads to ensure proper layout
      calculateColumns();
    });
  }

  onMount(() => {
    mounted = true;
    calculateColumns();

    const handleResize = () => {
      calculateColumns();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

<div class="pinterest-gallery" bind:this={containerRef}>
  <div class="pinterest-columns" style="--columns: {columns}">
    {#each Array(columns) as _, columnIndex}
      <div class="pinterest-column">
        {#each getColumnItems(columnIndex) as item (item.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="pinterest-item"
            style="height: {item.height}px"
            on:click={() => handleMediaClick(item)}
          >
            <div class="pinterest-media-wrapper">
              <img
                src={item.path}
                alt=""
                class="pinterest-media"
                loading="lazy"
              />
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .pinterest-gallery {
    width: 100%;
    padding: 20px;
    padding-right: 40px;
    margin: 0 auto;
    max-width: 1400px;
  }

  .pinterest-columns {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }

  .pinterest-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .pinterest-item {
    position: relative;
    border-radius: 0;
    overflow: hidden;
    cursor: pointer;
    opacity: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .pinterest-item:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .pinterest-media-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .pinterest-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
    filter: brightness(0.9) contrast(1.1);
  }

  .pinterest-item:hover .pinterest-media {
    transform: scale(1.1);
    filter: brightness(1) contrast(1.2);
  }

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 1200px) {
    .pinterest-gallery {
      padding: 15px;
      padding-right: 35px;
    }

    .pinterest-columns {
      gap: 15px;
    }

    .pinterest-column {
      gap: 15px;
    }
  }

  @media (max-width: 768px) {
    .pinterest-gallery {
      padding: 10px 20px;
      margin: 0 auto;
    }

    .pinterest-columns {
      gap: 10px;
    }

    .pinterest-column {
      gap: 10px;
    }

    .pinterest-item {
      border-radius: 0;
    }
  }

  @media (max-width: 480px) {
    .pinterest-gallery {
      padding: 10px 15px;
      margin: 0 auto;
    }

    .pinterest-columns {
      flex-direction: column;
    }

    .pinterest-item {
      border-radius: 0;
    }
  }
</style>
