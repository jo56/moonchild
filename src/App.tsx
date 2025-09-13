import { useState, useEffect } from 'react';
import GifDisplay from './components/GifDisplay';
import CollageView from './components/CollageView';
import PinterestGallery from './components/PinterestGallery';
import IrregularCollage from './components/IrregularCollage';
import StaticImageDisplay from './components/StaticImageDisplay';
import MusicPlayer from './components/MusicPlayer';
import Lightbox from './components/Lightbox';
import { gifs, musicTracks, combinedMedia, staticImages } from './data';
import { GifItem, MediaItem } from './types';
import './App.css';

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightboxGif, setLightboxGif] = useState<GifItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'stack' | 'large-list' | 'pinterest' | 'irregular' | 'pics-only'>('pinterest');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [teleportTrigger] = useState(0);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

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

  // Handle shift key to toggle music player visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isLightboxOpen) {
        setIsMusicPlayerVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const toggleLayout = (direction: 'forward' | 'backward' = 'forward') => {
    setViewMode(prev => {
      const nextMode = (() => {
        if (direction === 'backward') {
          switch (prev) {
            case 'list': return 'pinterest';
            case 'stack': return 'list';
            case 'large-list': return 'stack';
            case 'irregular': return 'large-list';
            case 'pics-only': return 'irregular';
            case 'pinterest': return 'pics-only';
            default: return 'list';
          }
        } else {
          switch (prev) {
            case 'list': return 'stack';
            case 'stack': return 'large-list';
            case 'large-list': return 'irregular';
            case 'irregular': return 'pics-only';
            case 'pics-only': return 'pinterest';
            case 'pinterest': return 'list';
            default: return 'list';
          }
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
      
      // Scroll to top when switching to irregular collage view
      if (nextMode === 'irregular') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // Scroll to top when switching to pics-only view
      if (nextMode === 'pics-only') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      return nextMode;
    });
  };

  // Handle A/D and arrow keys for layout navigation, R for refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) return;
      
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        toggleLayout('backward');
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        toggleLayout('forward');
      } else if (e.key === 'r' || e.key === 'R') {
        // Refresh images by incrementing the key - forces re-render without affecting music
        setImageRefreshKey(prev => prev + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, toggleLayout]);


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
    let currentArray;
    if (viewMode === 'pinterest' || viewMode === 'irregular') {
      currentArray = combinedMedia;
    } else if (viewMode === 'pics-only') {
      currentArray = staticImages;
    } else {
      currentArray = gifs;
    }
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif.id);
    const nextIndex = (currentIndex + 1) % currentArray.length;
    const nextItem = currentArray[nextIndex];
    setLightboxGif({ id: nextItem.id, name: nextItem.name, path: nextItem.path });
  };

  const showPreviousGif = () => {
    if (!lightboxGif) return;
    let currentArray;
    if (viewMode === 'pinterest' || viewMode === 'irregular') {
      currentArray = combinedMedia;
    } else if (viewMode === 'pics-only') {
      currentArray = staticImages;
    } else {
      currentArray = gifs;
    }
    const currentIndex = currentArray.findIndex(g => g.id === lightboxGif.id);
    const previousIndex = (currentIndex - 1 + currentArray.length) % currentArray.length;
    const prevItem = currentArray[previousIndex];
    setLightboxGif({ id: prevItem.id, name: prevItem.name, path: prevItem.path });
  };


  return (
    <div className="app">
      <div 
        className="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
      />
      
<MusicPlayer 
        tracks={musicTracks} 
        onLayoutToggle={() => toggleLayout()}
        viewMode={viewMode}
        isVisible={isMusicPlayerVisible}
        mousePosition={mousePosition}
        onDismiss={handleMusicPlayerDismiss}
        teleportTrigger={teleportTrigger}
      />
      
      <main className="main-content">
        {viewMode === 'list' ? (
          <section className="gallery-section" key={`list-${imageRefreshKey}`}>
            {gifs.map((gif, index) => (
              <GifDisplay 
                key={`${gif.id}-${imageRefreshKey}`} 
                gif={gif} 
                index={index} 
                onClick={() => openLightbox(gif)}
              />
            ))}
          </section>
        ) : viewMode === 'stack' ? (
          <CollageView 
            key={`stack-${imageRefreshKey}`}
            gifs={gifs} 
            onGifClick={openLightbox}
            variant="large"
          />
        ) : viewMode === 'pinterest' ? (
          <PinterestGallery 
            key={`pinterest-${imageRefreshKey}`}
            media={combinedMedia}
            onMediaClick={handleMediaClick}
          />
        ) : viewMode === 'irregular' ? (
          <IrregularCollage 
            key={`irregular-${imageRefreshKey}`}
            media={combinedMedia}
            onMediaClick={handleMediaClick}
          />
        ) : viewMode === 'pics-only' ? (
          <section className="gallery-section" key={`pics-${imageRefreshKey}`}>
            {staticImages.map((image, index) => (
              <StaticImageDisplay 
                key={`${image.id}-${imageRefreshKey}`} 
                image={image} 
                index={index} 
                onClick={() => openLightbox({ id: image.id, name: image.name, path: image.path })}
              />
            ))}
          </section>
        ) : (
          <CollageView 
            key={`large-${imageRefreshKey}`}
            gifs={gifs} 
            onGifClick={openLightbox}
            variant="stack"
          />
        )}
      </main>

      {viewMode !== 'pics-only' && viewMode !== 'pinterest' && (
        <div className="ambient-effects">
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
        </div>
      )}

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