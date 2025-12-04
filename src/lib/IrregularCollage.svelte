<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MediaItem } from '../types';
  import { shuffleArray } from './utils';

  interface Props {
    media: MediaItem[];
    onMediaClick: (mediaItem: MediaItem) => void;
  }

  let { media, onMediaClick }: Props = $props();

  interface PositionedMedia extends MediaItem {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    opacity: number;
    naturalWidth: number;
    naturalHeight: number;
    loaded: boolean;
  }

  let positionedMedia = $state<PositionedMedia[]>([]);
  let containerHeight = $state(3000);
  let containerWidth = $state(3000);
  let viewportOffset = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragStart = { x: 0, y: 0 };
  let dragStartPos = { x: 0, y: 0 };
  let hasDragged = false;
  let hoveredItemId = $state<string | null>(null);

  function loadImageDimensions(
    mediaItem: MediaItem
  ): Promise<{ naturalWidth: number; naturalHeight: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ naturalWidth: 400, naturalHeight: 400 });
      };
      img.src = mediaItem.path;
    });
  }

  async function generatePositions() {
    const shuffled = shuffleArray(media);
    const canvasWidth = window.innerWidth * 3;
    const positions: PositionedMedia[] = [];

    const mediaWithDimensions = await Promise.all(
      shuffled.map(async (item) => {
        const dimensions = await loadImageDimensions(item);
        return { ...item, ...dimensions };
      })
    );

    const itemsWithSizes = mediaWithDimensions.map((item) => {
      const aspectRatio = item.naturalWidth / item.naturalHeight;
      let displayWidth, displayHeight;

      const sizeCategory = Math.random();
      let targetArea, maxDimension;

      if (sizeCategory < 0.15) {
        targetArea = 300000 + Math.random() * 200000;
        maxDimension = canvasWidth * 0.4;
      } else if (sizeCategory < 0.35) {
        targetArea = 200000 + Math.random() * 150000;
        maxDimension = canvasWidth * 0.3;
      } else if (sizeCategory < 0.65) {
        targetArea = 150000 + Math.random() * 100000;
        maxDimension = canvasWidth * 0.25;
      } else if (sizeCategory < 0.85) {
        targetArea = 80000 + Math.random() * 70000;
        maxDimension = canvasWidth * 0.2;
      } else {
        targetArea = 40000 + Math.random() * 60000;
        maxDimension = canvasWidth * 0.12;
      }

      const baseSize = Math.sqrt(targetArea);

      if (aspectRatio > 1.5) {
        displayWidth = Math.min(baseSize * 1.4, maxDimension);
        displayHeight = displayWidth / aspectRatio;
      } else if (aspectRatio > 0.75) {
        if (aspectRatio > 1) {
          displayWidth = Math.min(baseSize, maxDimension);
          displayHeight = displayWidth / aspectRatio;
        } else {
          displayHeight = Math.min(baseSize, maxDimension * 0.8);
          displayWidth = displayHeight * aspectRatio;
        }
      } else {
        displayHeight = Math.min(baseSize * 1.3, maxDimension * 1.2);
        displayWidth = displayHeight * aspectRatio;
      }

      displayWidth = Math.max(displayWidth, 100);
      displayHeight = Math.max(displayHeight, 100);

      return {
        ...item,
        displayWidth,
        displayHeight,
        area: displayWidth * displayHeight
      };
    });

    const sortedItems = shuffleArray(itemsWithSizes);

    const occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];

    const isOverlapping = (x: number, y: number, width: number, height: number) => {
      return occupiedAreas.some((area) => {
        const overlapX = Math.max(
          0,
          Math.min(x + width, area.x + area.width) - Math.max(x, area.x)
        );
        const overlapY = Math.max(
          0,
          Math.min(y + height, area.y + area.height) - Math.max(y, area.y)
        );
        const overlapArea = overlapX * overlapY;
        const thisArea = width * height;
        const otherArea = area.width * area.height;

        // Allow overlapping up to 15% of the smaller image's area
        const maxAllowedOverlap = Math.min(thisArea, otherArea) * 0.15;
        return overlapArea > maxAllowedOverlap;
      });
    };

    const findBestPosition = (width: number, height: number) => {
      const gridSize = 15;
      const maxWidth = canvasWidth - width - 10;
      const currentMaxHeight =
        Math.max(800, ...occupiedAreas.map((area) => area.y + area.height)) + 400;

      // Try to place as high and left as possible, allowing slight overlaps
      for (let y = 5; y < currentMaxHeight; y += gridSize) {
        for (let x = 5; x < maxWidth; x += gridSize) {
          if (!isOverlapping(x, y, width, height)) {
            return { x, y };
          }
        }
      }

      // Secondary pass: try with some randomization for more organic placement
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = Math.random() * (maxWidth - 10) + 5;
        const y = Math.random() * currentMaxHeight + 5;
        if (!isOverlapping(x, y, width, height)) {
          return { x, y };
        }
      }

      // Fallback: place at bottom
      const maxY = Math.max(0, ...occupiedAreas.map((area) => area.y + area.height));
      return { x: 5 + Math.random() * 100, y: maxY + 10 };
    };

    sortedItems.forEach((item) => {
      const displayWidth = item.displayWidth;
      const displayHeight = item.displayHeight;

      const position = findBestPosition(displayWidth, displayHeight);

      occupiedAreas.push({
        x: position.x,
        y: position.y,
        width: displayWidth,
        height: displayHeight
      });

      positions.push({
        ...item,
        x: position.x,
        y: position.y,
        width: displayWidth,
        height: displayHeight,
        zIndex: Math.floor(Math.random() * 25) + 1,
        opacity: 1,
        loaded: true
      });
    });

    const maxY = Math.max(...positions.map((p) => p.y + p.height));
    const maxX = Math.max(...positions.map((p) => p.x + p.width));
    containerHeight = maxY + 50;
    containerWidth = Math.max(maxX + 50, window.innerWidth);

    return positions;
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = { x: e.clientX - viewportOffset.x, y: e.clientY - viewportOffset.y };
    dragStartPos = { x: e.clientX, y: e.clientY };
    hasDragged = false;
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const deltaX = Math.abs(e.clientX - dragStartPos.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.y);
    if (deltaX > 5 || deltaY > 5) {
      hasDragged = true;
    }

    const newOffset = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    const maxOffsetX = Math.min(0, window.innerWidth - containerWidth);
    const maxOffsetY = Math.min(0, window.innerHeight - containerHeight);

    viewportOffset = {
      x: Math.max(maxOffsetX, Math.min(0, newOffset.x)),
      y: Math.max(maxOffsetY, Math.min(0, newOffset.y))
    };
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleMediaClick(e: MouseEvent, item: MediaItem) {
    if (!hasDragged) {
      e.stopPropagation();
      onMediaClick(item);
    }
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  let handleResize: () => Promise<void>;

  onMount(() => {
    generatePositions().then((positions) => {
      positionedMedia = positions;
    });

    handleResize = async () => {
      const positions = await generatePositions();
      positionedMedia = positions;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    if (handleResize) {
      window.removeEventListener('resize', handleResize);
    }
    document.body.style.cursor = '';
  });

  $effect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
  });
</script>

<div class="irregular-collage-viewport">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="irregular-collage"
    style="height: {containerHeight}px; width: {containerWidth}px; transform: translate({viewportOffset.x}px, {viewportOffset.y}px); cursor: {isDragging
      ? 'grabbing'
      : 'grab'}"
    onmousedown={handleMouseDown}
    oncontextmenu={handleContextMenu}
    role="presentation"
  >
    {#each positionedMedia as item (item.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="collage-media {item.type === 'gif' ? 'is-gif' : 'is-image'}"
        style="position: absolute; left: {item.x}px; top: {item.y}px; width: {item.width}px; height: {item.height}px; z-index: {hoveredItemId === item.id ? 9999 : item.zIndex}; opacity: 1"
        onmousedown={handleMouseDown}
        onclick={(e) => handleMediaClick(e, item)}
        onmouseenter={() => hoveredItemId = item.id}
        onmouseleave={() => hoveredItemId = null}
        role="button"
        tabindex="0"
      >
        <img src={item.path} alt="" class="collage-image" loading="lazy" draggable={false} />
        <div class="collage-overlay">
          <div class="media-type-badge">{item.type.toUpperCase()}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .irregular-collage-viewport {
    width: 100vw;
    height: 100vh;
    overflow: auto;
    position: relative;
    background: var(--color-bg-primary);
  }

  .irregular-collage {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    min-height: 100vh;
    padding: 0;
    background: transparent;
    transition: transform 0.1s ease-out;
    user-select: none;
  }

  .collage-media {
    cursor: pointer;
    transition: all var(--transition-smooth);
    border-radius: 0;
    overflow: hidden;
    box-shadow: var(--shadow-card);
    border: none;
  }

  .irregular-collage .collage-media:hover {
    transform: none;
    box-shadow: var(--shadow-card);
    z-index: var(--z-player);
  }

  .collage-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    transition: all var(--transition-medium);
    filter: brightness(0.95) contrast(1.1);
  }

  .irregular-collage .collage-media:hover .collage-image {
    filter: brightness(0.95) contrast(1.1);
  }

  .collage-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, 0.1) 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
    opacity: 0;
    transition: opacity var(--transition-medium);
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 12px;
  }

  .irregular-collage .collage-media:hover .collage-overlay {
    opacity: 0;
  }

  .media-type-badge {
    background: rgba(138, 43, 226, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.5px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transform: translateY(10px);
    transition: transform var(--transition-medium) 0.1s;
  }

  .irregular-collage .collage-media:hover .media-type-badge {
    transform: translateY(10px);
  }

  .is-gif .media-type-badge {
    background: rgba(138, 43, 226, 0.95);
  }

  .is-image .media-type-badge {
    background: rgba(30, 144, 255, 0.9);
  }

  @keyframes fadeInCollage {
    from {
      opacity: 0;
      transform: translateY(20px) rotate(0deg) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) rotate(var(--rotation)) scale(1);
    }
  }

  @media (max-width: 768px) {
    .irregular-collage {
      padding: 10px 0;
    }

    .collage-media {
      border-radius: 6px;
    }

    .media-type-badge {
      font-size: 9px;
      padding: 3px 6px;
    }
  }
</style>
