<script lang="ts">
  interface Props {
    image: { id: string; name: string; path: string };
    onClick: () => void;
  }

  let { image, onClick }: Props = $props();
</script>

<div class="gif-container">
  <div
    class="gif-wrapper"
    role="button"
    tabindex="0"
    onclick={onClick}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
  >
    <img src={image.path} alt="" class="gif-image" loading="lazy" />
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
    background: var(--color-bg-primary);
  }

  .gif-wrapper {
    position: relative;
    border-radius: 2px;
    overflow: hidden;
    background: var(--color-bg-primary);
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

  @media (max-width: 768px) {
    .gif-container {
      padding: 1rem;
      justify-content: center;
    }

    .gif-wrapper {
      max-width: 95%;
    }
  }
</style>
