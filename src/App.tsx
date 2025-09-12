import { useState, useEffect } from 'react';
import GifDisplay from './components/GifDisplay';
import CollageView from './components/CollageView';
import PinterestGallery from './components/PinterestGallery';
import MusicPlayer from './components/MusicPlayer';
import Lightbox from './components/Lightbox';
import { gifs, musicTracks, combinedMedia } from './data';
import { GifItem, MediaItem } from './types';
import './App.css';

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightboxGif, setLightboxGif] = useState<GifItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'stack' | 'large-list' | 'pinterest'>('pinterest');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [teleportTrigger, setTeleportTrigger] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on initial load
  useEffect(() => {
    if (isInitialLoad) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle shift key to teleport music player to mouse position
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isLightboxOpen) {
        setTeleportTrigger(prev => prev + 1); // ONLY teleport, no visibility change
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);


  const openLightbox = (gif: GifItem) => {
    setLightboxGif(gif);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxGif(null);
  };

  const handleMediaClick = (mediaItem: MediaItem) => {
    const gifItem: GifItem = {
      id: mediaItem.id,
      name: mediaItem.name,
      path: mediaItem.path
    };
    openLightbox(gifItem);
  };

  const handleMusicPlayerDismiss = () => {
    setIsMusicPlayerVisible(false);
  };

  const showNextGif = () => {
    if (!lightboxGif) return;
    const currentArray = viewMode === 'pinterest' ? combinedMedia : gifs;
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif.id);
    const nextIndex = (currentIndex + 1) % currentArray.length;
    const nextItem = currentArray[nextIndex];
    setLightboxGif({ id: nextItem.id, name: nextItem.name, path: nextItem.path });
  };

  const showPreviousGif = () => {
    if (!lightboxGif) return;
    const currentArray = viewMode === 'pinterest' ? combinedMedia : gifs;
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif.id);
    const previousIndex = (currentIndex - 1 + currentArray.length) % currentArray.length;
    const prevItem = currentArray[previousIndex];
    setLightboxGif({ id: prevItem.id, name: prevItem.name, path: prevItem.path });
  };

  const toggleLayout = () => {
    setViewMode(prev => {
      const nextMode = (() => {
        switch (prev) {
          case 'list': return 'stack';
          case 'stack': return 'large-list';
          case 'large-list': return 'pinterest';
          case 'pinterest': return 'list';
          default: return 'list';
        }
      })();
      
      // Scroll to top when switching to stack view (original behavior)
      if (nextMode === 'stack') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // Scroll to top when switching to list view (new behavior)
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
      
      return nextMode;
    });
  };


  return (
    <div className="app">
      <div 
        className="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
      />
      
<MusicPlayer 
        tracks={musicTracks} 
        onLayoutToggle={toggleLayout}
        viewMode={viewMode}
        isVisible={isMusicPlayerVisible}
        mousePosition={mousePosition}
        onDismiss={handleMusicPlayerDismiss}
        teleportTrigger={teleportTrigger}
      />
      
      <main className="main-content">
        {viewMode === 'list' ? (
          <section className="gallery-section">
            {gifs.map((gif, index) => (
              <GifDisplay 
                key={gif.id} 
                gif={gif} 
                index={index} 
                onClick={() => openLightbox(gif)}
              />
            ))}
          </section>
        ) : viewMode === 'stack' ? (
          <CollageView 
            gifs={gifs} 
            onGifClick={openLightbox}
            variant="large"
          />
        ) : viewMode === 'pinterest' ? (
          <PinterestGallery 
            media={combinedMedia}
            onMediaClick={handleMediaClick}
          />
        ) : (
          <CollageView 
            gifs={gifs} 
            onGifClick={openLightbox}
            variant="stack"
          />
        )}
      </main>

      <div className="ambient-effects">
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
        <div className="floating-particle"></div>
      </div>

      <Lightbox 
        gif={lightboxGif}
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        onNext={showNextGif}
        onPrevious={showPreviousGif}
      />
    </div>
  );
}

export default App;