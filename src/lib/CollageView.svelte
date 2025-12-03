<script lang="ts">
  import type { GifItem } from '../types';

  export let gifs: GifItem[];
  export let onGifClick: (gif: GifItem) => void;
  export let variant: 'large' | 'stack';

  let containerRef: HTMLDivElement;
  let imageZIndices: Record<string, number> = {};
  let nextZIndex = 100;
  let canvasSize = {
    width: Math.max((typeof window !== 'undefined' ? window.innerWidth : 1000) * 10, 10000),
    height: Math.max((typeof window !== 'undefined' ? window.innerHeight : 1000) * 10, 10000)
  };

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

    const handleMouseMove = (e: MouseEvent) => {
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const newX = e.clientX - containerRect.left + scrollLeft - offsetX;
      const newY = e.clientY - containerRect.top + scrollTop - offsetY;

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
    const isImageElement = target.classList.contains('collage-image') || target.classList.contains('collage-item');
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
  style={variant === 'large' ? 'overflow: auto; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 10; cursor: grab;' : ''}
  on:mousedown={variant === 'large' ? handleBackgroundMouseDown : undefined}
  on:contextmenu={variant === 'large' ? (e) => e.preventDefault() : undefined}
  role="presentation"
>
  <div
    class="collage-grid"
    style={variant === 'large' ? `width: ${canvasSize.width}px; height: ${canvasSize.height}px; position: relative; min-width: 100vw; min-height: 100vh;` : ''}
    on:mousedown={handleBackgroundMouseDown}
    on:contextmenu={(e) => e.preventDefault()}
    role="presentation"
  >
    {#each gifs as gif, index (gif.id)}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="collage-item {variant === 'large' ? `large-item large-item-${index + 1}` : `stack-item stack-item-${index + 1}`}"
        style="pointer-events: auto; z-index: {imageZIndices[gif.id] || 1};"
        on:click={(e) => handleClick(e, gif)}
        on:mousedown={(e) => variant === 'large' ? handleImageMouseDown(e, gif, index) : undefined}
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
.collage-container{width:100%;min-height:100vh;background:#0a1628;padding:2rem;overflow:hidden;position:relative}.collage-grid{position:relative;width:100%;max-width:1400px;margin:0 auto;height:100vh;overflow:hidden}.collage-item{position:absolute;overflow:hidden;transition:all .2s ease;cursor:pointer}.collage-image{width:100%;height:100%;object-fit:contain;display:block}.collage-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(10,22,40,.9);border-top:1px solid #3a7a8a;padding:.75rem;opacity:0;transition:opacity .2s ease;font-family:'Courier New',monospace}.collage-container:not(.large-collage) .collage-item:hover .collage-overlay{opacity:1}.collage-title{font-size:.7rem;font-weight:normal;letter-spacing:1px;text-transform:uppercase;margin:0;color:#5a9aaa;font-family:'Courier New',monospace}.large-collage{padding:0;margin:0;min-height:100vh;overflow:auto;position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0a1628;z-index:1}.large-collage .collage-grid{position:relative;min-width:100vw;min-height:100vh;overflow:visible}.large-item{position:absolute!important;width:auto!important;height:auto!important;cursor:grab;transition:all .2s ease;user-select:none}.large-item .collage-image{width:auto;height:auto;object-fit:none;max-width:none;max-height:none}.large-item:active{cursor:grabbing}.large-item-1{top:5%;left:3%;transform:rotate(-1deg)}.large-item-2{top:8%;left:25%;transform:rotate(2deg)}.large-item-3{top:35%;left:8%;transform:rotate(-2deg)}.large-item-4{top:12%;left:55%;transform:rotate(1deg)}.large-item-5{top:50%;left:35%;transform:rotate(-1deg)}.large-item-6{top:25%;left:78%;transform:rotate(3deg)}.large-item-7{top:65%;left:65%;transform:rotate(-2deg)}.large-item-8{top:75%;left:15%;transform:rotate(1deg)}.stack-collage{padding:2rem;min-height:100vh;overflow-y:auto;overflow-x:hidden}.stack-collage .collage-grid{display:flex;flex-direction:column;gap:3rem;align-items:center;width:100%;padding-bottom:2rem;height:auto;overflow:visible}.stack-item{position:relative!important;width:auto!important;height:auto!important;flex-shrink:0}.stack-item .collage-image{width:auto;height:auto;object-fit:none;max-width:100vw;max-height:none;display:block}
</style>
