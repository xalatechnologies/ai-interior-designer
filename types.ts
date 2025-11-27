export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  type?: 'text' | 'refinement_request' | 'error';
  groundingUrls?: Array<{uri: string, title: string}>;
}

export enum DesignStyle {
  Modern = 'Modern',
  Scandinavian = 'Scandinavian',
  Industrial = 'Industrial',
  Bohemian = 'Bohemian',
  MidCenturyModern = 'Mid-Century Modern',
  Minimalist = 'Minimalist',
  ArtDeco = 'Art Deco',
  Coastal = 'Coastal',
}

export interface ComparisonState {
  originalImage: string | null; // Base64
  generatedImage: string | null; // Base64
  isGenerating: boolean;
}
