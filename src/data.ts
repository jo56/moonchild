import { GifItem, MusicTrack, MediaItem } from './types';

export const gifs: GifItem[] = [
  { id: '1', name: 'Moonchild', path: 'gifs/1-moonchild 2.gif' },
  { id: '2', name: 'Pulse', path: 'gifs/2-pulse.gif' },
  { id: '3', name: 'At the Gates', path: 'gifs/3-at the gates.gif' },
  { id: '4', name: 'Spread 1', path: 'gifs/4-spread 1.gif' },
  { id: '5', name: 'Spread 2', path: 'gifs/5-spread 2.gif' },
  { id: '6', name: 'Breathe', path: 'gifs/6-grand spread.gif' },
  { id: '7', name: 'Heartbeat', path: 'gifs/7-heartbeat.gif' },
  { id: '8', name: 'Crush', path: 'gifs/8-crush.gif' },
];

export const staticImages = [
  { id: 'img1', name: 'Abstract Flow', path: 'pics/download (20).png' },
  { id: 'img2', name: 'Ethereal', path: 'pics/download (21).png' },
  { id: 'img3', name: 'Cosmic Dance', path: 'pics/download (22).png' },
  { id: 'img4', name: 'Digital Dreams', path: 'pics/download (23).png' },
  { id: 'img5', name: 'Neon Waves', path: 'pics/download (24).png' },
  { id: 'img6', name: 'Mystic Portal', path: 'pics/download (25).png' },
  { id: 'img7', name: 'Stellar Fragments', path: 'pics/download (26).png' },
  { id: 'img8', name: 'Aurora Veil', path: 'pics/download (28).png' },
  { id: 'img9', name: 'Electric Symphony', path: 'pics/download (29).png' },
  { id: 'img10', name: 'Crystal Formation', path: 'pics/download (30).png' },
  { id: 'img11', name: 'Quantum Field', path: 'pics/download (31).png' },
  { id: 'img13', name: 'Void Echo', path: 'pics/download (34).png' },
  { id: 'img14', name: 'Fractal Bloom', path: 'pics/download (35).png' },
  { id: 'img15', name: 'Celestial Burst', path: 'pics/download (36).png' },
  { id: 'img16', name: 'Genesis', path: 'pics/download (5).png' },
  { id: 'img17', name: 'Reflection', path: 'pics/download (83).png' },
  { id: 'img18', name: 'Harmony', path: 'pics/download (84).png' },
  { id: 'img19', name: 'Perfect Square', path: 'pics/download (85) square.png' },
  { id: 'img20', name: 'Infinite Loop', path: 'pics/download (86).png' },
];

export const combinedMedia: MediaItem[] = [
  ...gifs.map(gif => ({ ...gif, type: 'gif' as const })),
  ...staticImages.map(img => ({ ...img, type: 'image' as const }))
];

export const musicTracks: MusicTrack[] = [
  { id: '1', name: '005_1', path: 'music/005_1.wav' },
  { id: '2', name: '068_1', path: 'music/068_1.wav' },
  { id: '3', name: '02425_1', path: 'music/02425_1_louder.wav' },
  { id: '4', name: '075_1', path: 'music/075_1.wav' },
];