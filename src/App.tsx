import { useState, useEffect } from 'react';
import GifDisplay from './components/GifDisplay';
import CollageView from './components/CollageView';
import MusicPlayer from './components/MusicPlayer';
import Lightbox from './components/Lightbox';
import { gifs, musicTracks } from './data';
import { GifItem } from './types';
import './App.css';

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightboxGif, setLightboxGif] = useState<GifItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'stack' | 'large-list'>('list');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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


  const openLightbox = (gif: GifItem) => {
    setLightboxGif(gif);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxGif(null);
  };

  const showNextGif = () => {
    if (!lightboxGif) return;
    const currentIndex = gifs.findIndex(g => g.id === lightboxGif.id);
    const nextIndex = (currentIndex + 1) % gifs.length;
    setLightboxGif(gifs[nextIndex]);
  };

  const showPreviousGif = () => {
    if (!lightboxGif) return;
    const currentIndex = gifs.findIndex(g => g.id === lightboxGif.id);
    const previousIndex = (currentIndex - 1 + gifs.length) % gifs.length;
    setLightboxGif(gifs[previousIndex]);
  };

  const toggleLayout = () => {
    setViewMode(prev => {
      const nextMode = (() => {
        switch (prev) {
          case 'list': return 'stack';
          case 'stack': return 'large-list';
          case 'large-list': return 'list';
          default: return 'list';
        }
      })();
      
      // Immediately scroll to top for list and stack views
      if (nextMode === 'list' || nextMode === 'stack') {
        console.log('Scrolling to top for mode:', nextMode);
        setTimeout(() => {
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
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