export interface GifItem {
  id: string;
  name: string;
  path: string;
}

export interface MediaItem {
  id: string;
  name: string;
  path: string;
  type: 'gif' | 'image';
}

export interface MusicTrack {
  id: string;
  name: string;
  path: string;
}