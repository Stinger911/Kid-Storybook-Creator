export interface TracingElement {
  id: string;
  type: 'word' | 'custom-lines' | 'letters-grid';
  text: string; // The word or letter to trace
}

export type LayoutStyle = 'coloring-top-writing-bottom' | 'coloring-only' | 'writing-only' | 'story-left-coloring-right';

export interface BookPage {
  id: string;
  title: string;
  type: 'coloring' | 'handwriting' | 'mixed' | 'story';
  layout: LayoutStyle;
  storyText?: string;
  originalImage?: string; // Data URL of the uploaded image
  coloringImage?: string; // Data URL of the black & white coloring line-art
  coloringAdjustments?: {
    threshold: number;
    edgeStrength: number;
    brightness: number;
    contrast: number;
    invert: boolean;
    noProcess?: boolean;
  };
  tracingText?: string; // Text to trace (newlines split into separate tracing rows)
  hideStartDots?: boolean; // Turn off the pink start dots
  letterSpacing?: number; // Inter-letter gap (px) for tracing rows; undefined = variant default
  pageNumber: number;
}

export interface KidBook {
  id: string;
  title: string;
  author: string; // Kid's name & parent's names
  createdAt: string;
  themeColor: string; // Pastel theme selector
  pages: BookPage[];
  isPublic?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  userId?: string;
  userEmail?: string;
}
