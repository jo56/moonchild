<script lang="ts">
  import type { GifItem } from '../types';

  interface Props {
    gifs: GifItem[];
    onGifClick: (gif: GifItem) => void;
    variant: 'large' | 'stack';
  }

  let { gifs, onGifClick, variant }: Props = $props();

  let containerRef: HTMLDivElement;
  let imageZIndices = $state<Record<string, number>>({});
  let imagePositions = $state<Record<string, { x: number; y: number }>>({});
  let nextZIndex = 100;
  let canvasSize = $state({
    width: Math.max((typeof window !== 'undefined' ? window.innerWidth : 1000) * 10, 10000),
    height: Math.max((typeof window !== 'undefined' ? window.innerHeight : 1000) * 10, 10000)
  });

  function handleImageMouseDown(e: MouseEvent, gif: GifItem, _index: number) {
    if (variant !== 'large' || e.button !== 0 || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();

    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const container = containerRef;
    const containerRect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const newX = e.clientX - containerRect.left + scrollLeft - offsetX;
      const newY = e.clientY - containerRect.top + scrollTop - offsetY;

      lastX = newX;
      lastY = newY;

      const buffer = 500;
      if (newX + buffer > canvasSize.width || newY + buffer > canvasSize.height) {
        canvasSize = {
          width: Math.max(canvasSize.width, newX + buffer),
          height: Math.max(canvasSize.height, newY + buffer)
        };
      }

      const scrollMargin = 100;
      const mouseXInViewport = e.clientX - containerRect.left;
      if (mouseXInViewport > container.clientWidth - scrollMargin) container.scrollLeft += 12;
      else if (mouseXInViewport < scrollMargin) container.scrollLeft -= 12;

      const mouseYInViewport = e.clientY - containerRect.top;
      if (mouseYInViewport > container.clientHeight - scrollMargin) container.scrollTop += 12;
      else if (mouseYInViewport < scrollMargin) container.scrollTop -= 12;

      element.style.position = 'absolute';
      element.style.left = newX + 'px';
      element.style.top = newY + 'px';
      element.style.zIndex = '10000';
      element.style.transform = 'none';
      element.style.pointerEvents = 'none';
    };

    const handleMouseUp = () => {
      const newZIndex = nextZIndex;
      imageZIndices = { ...imageZIndices, [gif.id]: newZIndex };
      imagePositions = { ...imagePositions, [gif.id]: { x: lastX, y: lastY } };
      nextZIndex++;
      element.style.pointerEvents = 'auto';
      element.style.zIndex = newZIndex.toString();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleBackgroundMouseDown(e: MouseEvent) {
    if (variant !== 'large') return;
    const target = e.target as HTMLElement;
    const isImageElement =
      target.classList.contains('collage-image') || target.classList.contains('collage-item');
    const shouldBackgroundDrag = e.button !== 0 || !isImageElement || e.shiftKey;
    if (!shouldBackgroundDrag) return;

    e.preventDefault();
    e.stopPropagation();

    const container = containerRef;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;
    const startX = e.clientX;
    const startY = e.clientY;
    container.style.cursor = 'grabbing';

    const handleMouseMove = (e: MouseEvent) => {
      container.scrollLeft = startScrollLeft - (e.clientX - startX);
      container.scrollTop = startScrollTop - (e.clientY - startY);
    };

    const handleMouseUp = () => {
      container.style.cursor = 'grab';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleClick(e: MouseEvent, gif: GifItem) {
    if (variant !== 'large') onGifClick(gif);
    else e.preventDefault();
  }
</script>

<div
  bind:this={containerRef}
  class="collage-container {variant === 'large' ? 'large-collage' : 'stack-collage'}"
  style={variant === 'large'
    ? 'overflow: auto; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 10; cursor: grab;'
    : ''}
  on:mousedown={variant === 'large' ? handleBackgroundMouseDown : undefined}
  on:contextmenu={variant === 'large' ? (e) => e.preventDefault() : undefined}
  role="presentation"
>
  <div
    class="collage-grid"
    style={variant === 'large'
      ? `width: ${canvasSize.width}px; height: ${canvasSize.height}px; position: relative; min-width: 100vw; min-height: 100vh;`
      : ''}
    on:mousedown={handleBackgroundMouseDown}
    on:contextmenu={(e) => e.preventDefault()}
    role="presentation"
  >
    {#each gifs as gif, index (gif.id)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="collage-item {variant === 'large'
          ? `large-item large-item-${index + 1}`
          : `stack-item stack-item-${index + 1}`}"
        style="pointer-events: auto; z-index: {imageZIndices[gif.id] || 1};{imagePositions[gif.id]
          ? ` left: ${imagePositions[gif.id].x}px; top: ${imagePositions[gif.id].y}px; transform: none;`
          : ''}"
        on:click={(e) => handleClick(e, gif)}
        on:mousedown={(e) =>
          variant === 'large' ? handleImageMouseDown(e, gif, index) : undefined}
      >
        <img src={gif.path} alt={gif.name} class="collage-image" loading="lazy" />
        <div class="collage-overlay">
          <h3 class="collage-title">{gif.name}</h3>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .collage-container {
    width: 100%;
    min-height: 100vh;
    background: var(--color-bg-primary);
    padding: 2rem;
    overflow: hidden;
    position: relative;
  }

  .collage-grid {
    position: relative;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    height: 100vh;
    overflow: hidden;
  }

  .collage-item {
    position: absolute;
    overflow: hidden;
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .collage-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .collage-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-bg-overlay);
    border-top: 1px solid var(--color-accent-secondary);
    padding: 0.75rem;
    opacity: 0;
    transition: opacity var(--transition-fast);
    font-family: 'Courier New', monospace;
  }

  .collage-container:not(.large-collage) .collage-item:hover .collage-overlay {
    opacity: 1;
  }

  .collage-title {
    font-size: 0.7rem;
    font-weight: normal;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin: 0;
    color: var(--color-text-secondary);
    font-family: 'Courier New', monospace;
  }

  /* Large collage variant */
  .large-collage {
    padding: 0;
    margin: 0;
    min-height: 100vh;
    overflow: auto;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg-primary);
    z-index: 1;
  }

  .large-collage .collage-grid {
    position: relative;
    min-width: 100vw;
    min-height: 100vh;
    overflow: visible;
  }

  .large-item {
    position: absolute;
    width: auto;
    height: auto;
    cursor: grab;
    transition: all var(--transition-fast);
    user-select: none;
  }

  .large-item .collage-image {
    width: auto;
    height: auto;
    object-fit: none;
    max-width: none;
    max-height: none;
  }

  .large-item:active {
    cursor: grabbing;
  }

  .large-item-1 {
    top: 20px;
    left: 20px;
    transform: rotate(-1deg);
  }
  .large-item-2 {
    top: 20px;
    left: 20px;
    transform: rotate(2deg);
  }
  .large-item-3 {
    top: 20px;
    left: 20px;
    transform: rotate(-2deg);
  }
  .large-item-4 {
    top: 20px;
    left: 20px;
    transform: rotate(1deg);
  }
  .large-item-5 {
    top: 20px;
    left: 20px;
    transform: rotate(-1deg);
  }
  .large-item-6 {
    top: 20px;
    left: 20px;
    transform: rotate(3deg);
  }
  .large-item-7 {
    top: 20px;
    left: 20px;
    transform: rotate(-2deg);
  }
  .large-item-8 {
    top: 20px;
    left: 20px;
    transform: rotate(1deg);
  }

  /* Stack collage variant */
  .stack-collage {
    padding: 2rem;
    min-height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .stack-collage .collage-grid {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    align-items: center;
    width: 100%;
    padding-bottom: 2rem;
    height: auto;
    overflow: visible;
  }

  .stack-item {
    position: relative;
    width: auto;
    height: auto;
    flex-shrink: 0;
  }

  .stack-item .collage-image {
    width: auto;
    height: auto;
    object-fit: none;
    max-width: 100vw;
    max-height: none;
    display: block;
  }
</style>
