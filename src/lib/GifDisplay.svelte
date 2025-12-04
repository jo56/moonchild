<script lang="ts">
  import type { GifItem } from '../types';

  export let gif: GifItem;
  export let index: number;
  export let onClick: () => void;

  $: animationDelay = `${index * 0.5}s`;
</script>

<div
  class="gif-container"
  style="animation-delay: {animationDelay}"
>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="gif-wrapper" on:click={onClick}>
    <img
      src={gif.path}
      alt={gif.name}
      class="gif-image"
      loading="lazy"
    />
    <div class="gif-overlay">
      <h3 class="gif-title">{gif.name}</h3>
    </div>
  </div>
</div>

<style>
  .gif-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
    opacity: 0;
    animation: fadeInSlide 1s ease-out forwards;
    background: #0a1628;
  }

  .gif-wrapper {
    position: relative;
    border-radius: 2px;
    overflow: hidden;
    background: #0a1628;
    cursor: pointer;
  }

  .gif-image {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 80vh;
    display: block;
    object-fit: contain;
  }

  .gif-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(10, 22, 40, 0.9);
    border-top: 1px solid #3a7a8a;
    padding: 1rem;
    opacity: 0;
    transition: opacity 0.2s ease;
    font-family: 'Courier New', monospace;
  }

  .gif-wrapper:hover .gif-overlay {
    opacity: 1;
  }

  .gif-title {
    font-size: 0.8rem;
    font-weight: normal;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin: 0;
    color: #5a9aaa;
    font-family: 'Courier New', monospace;
  }

  @media (max-width: 768px) {
    .gif-container {
      padding: 1rem;
      justify-content: center !important;
    }

    .gif-wrapper {
      max-width: 95%;
    }

    .gif-title {
      font-size: 1.2rem;
    }
  }
</style>
