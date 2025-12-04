<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { GifItem } from '../types';

  interface Props {
    gif: GifItem | null;
    isOpen: boolean;
    onClose: () => void;
  }

  let { gif, isOpen, onClose }: Props = $props();

  let isZoomed = $state(false);
  let isDragging = $state(false);
  let imagePosition = $state({ x: 0, y: 0 });
  let imageRef = $state<HTMLImageElement | null>(null);
  let dragStart = { x: 0, y: 0 };
  let imagePositionRef = { x: 0, y: 0 };

  // Reset zoom when gif changes
  $effect(() => {
    if (gif) {
      isZoomed = false;
      imagePosition = { x: 0, y: 0 };
      imagePositionRef = { x: 0, y: 0 };
    }
  });

  // Handle body overflow
  $effect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      if (isZoomed) {
        isZoomed = false;
      } else {
        onClose();
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    if (isZoomed) {
      isDragging = true;
      dragStart = {
        x: e.clientX - imagePositionRef.x,
        y: e.clientY - imagePositionRef.y
      };
    } else {
      isZoomed = true;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !isZoomed) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    imagePositionRef = { x: newX, y: newY };
    if (imageRef) {
      imageRef.style.transform = `scale(2) translate(${newX / 2}px, ${newY / 2}px)`;
    }
  }

  function handleMouseUp() {
    isDragging = false;
    imagePosition = { ...imagePositionRef };
  }

  function handleOverlayClick() {
    if (isZoomed) {
      isZoomed = false;
      imagePosition = { x: 0, y: 0 };
      imagePositionRef = { x: 0, y: 0 };
    } else {
      onClose();
    }
  }

  function handleContainerClick(e: MouseEvent) {
    e.stopPropagation();
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.overflow = '';
  });
</script>

{#if isOpen && gif}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="lightbox-overlay" on:click={handleOverlayClick}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="lightbox-container" on:click={handleContainerClick}>
      <div class="lightbox-content">
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img
          bind:this={imageRef}
          src={gif.path}
          alt={gif.name}
          class="lightbox-image"
          class:zoomed={isZoomed}
          class:dragging={isDragging}
          on:mousedown={handleMouseDown}
          style="cursor: {isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'};
                 transform: {isZoomed
            ? `scale(2) translate(${imagePosition.x / 2}px, ${imagePosition.y / 2}px)`
            : 'scale(1)'};
                 will-change: {isDragging ? 'transform' : 'auto'};"
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 22, 40, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-lightbox);
    animation: fadeIn 0.3s ease-out;
  }

  .lightbox-container {
    position: relative;
    max-width: 95vw;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: auto;
  }

  .lightbox-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .lightbox-image {
    max-width: 98vw;
    max-height: 95vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 0;
    animation: scaleIn 0.3s ease-out;
    transition: cursor 0.2s ease;
    cursor: zoom-in;
  }

  .lightbox-image.zoomed {
    max-width: none;
    max-height: none;
  }

  .lightbox-image.dragging {
    user-select: none;
    transition: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    .lightbox-image {
      max-width: 95vw;
      max-height: 90vh;
    }
  }
</style>
