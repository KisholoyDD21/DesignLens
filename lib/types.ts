export type ColorToken = {
  name: string;
  hex: string;
  rgb: string;
  hsl: string;
  role: string;
  contrastOnWhite: number;
  contrastOnBlack: number;
  source: 'computed-style' | 'css-variable' | 'screenshot' | 'inferred';
};

export type FontToken = {
  family: string;
  weights: number[];
  sampleRoles: string[];
  exampleSize: string;
  exampleLineHeight: string;
};

export type SpacingToken = { value: string; count: number };
export type ComponentToken = {
  type: string;
  count: number;
  variants: string[];
  states: string[];
  examples: string[];
};
export type WebsiteSnapshot = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  brandName: string;
  tagline: string;
  logoDescription: string;
  favicon: string;
  screenshotDataUrl?: string;
  colors: ColorToken[];
  fonts: FontToken[];
  spacing: SpacingToken[];
  components: ComponentToken[];
  layout: {
    viewport: { width: number; height: number };
    pageWidth: number;
    sections: Array<{ tag: string; label: string; height: number }>;
    breakpoints: number[];
    containerWidths: number[];
    gridColumns: number[];
    headerPosition: string;
    footerPresent: boolean;
  };
  motion: Array<{ name: string; duration: string; easing: string; trigger: string }>;
  imagery: { imageCount: number; svgCount: number; iconStyle: string; imageTreatments: string[] };
  shadows: string[];
  radii: string[];
  accessibility: { missingAlt: number; contrastCandidates: number; focusStylesFound: boolean; buttonsWithoutLabels: number; notes: string[] };
  cssVariables: Record<string, string>;
  rawEvidence: {
    headings: Array<{ level: number; text: string; size: string; weight: string }>;
    links: string[];
    buttonLabels: string[];
    imageAlts: string[];
    mediaQueries: string[];
    animations: string[];
    bodyBackground: string;
    bodyTextColor: string;
    bodyFont: string;
  };
  warnings: string[];
  analyzedAt: string;
  method: string;
};

export type AnalysisResult = {
  id: string;
  url: string;
  markdown: string;
  snapshot: WebsiteSnapshot;
  createdAt: number;
};

export type StageEvent = { type: 'stage'; stage: string; label: string; progress: number; detail?: string };
export type ChunkEvent = { type: 'chunk'; text: string };
export type ResultEvent = { type: 'result'; result: AnalysisResult };
export type ErrorEvent = { type: 'error'; error: string; code?: string };
export type StreamEvent = StageEvent | ChunkEvent | ResultEvent | ErrorEvent;
