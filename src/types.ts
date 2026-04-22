export interface CameraSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  denoise: number;
  ae_level: number;
  gainceiling: number;
  quality: number;
  framesize: number;
  wb_mode: number;
  special_effect: number;
  awb: boolean;
  awb_gain: boolean;
  aec: boolean;
  aec2: boolean;
  agc: boolean;
  agc_gain: number;
  bpc: boolean;
  wpc: boolean;
  raw_gma: boolean;
  lenc: boolean;
  vflip: boolean;
  hmirror: boolean;
  dcw: boolean;
  colorbar: boolean;
}

export const RESOLUTIONS = [
  { label: 'UXGA (1600x1200)', value: 10 },
  { label: 'SXGA (1280x1024)', value: 9 },
  { label: 'XGA (1024x768)', value: 8 },
  { label: 'SVGA (800x600)', value: 7 },
  { label: 'VGA (640x480)', value: 6 },
  { label: 'CIF (400x296)', value: 5 },
  { label: 'QVGA (320x240)', value: 4 },
  { label: 'HQVGA (240x176)', value: 3 },
  { label: 'QCIF (176x144)', value: 2 },
];

export const WB_MODES = [
  { label: 'Auto', value: 0 },
  { label: 'Sunny', value: 1 },
  { label: 'Cloudy', value: 2 },
  { label: 'Office', value: 3 },
  { label: 'Home', value: 4 },
];

export const SPECIAL_EFFECTS = [
  { label: 'None', value: 0 },
  { label: 'Negative', value: 1 },
  { label: 'Grayscale', value: 2 },
  { label: 'Red Tint', value: 3 },
  { label: 'Green Tint', value: 4 },
  { label: 'Blue Tint', value: 5 },
  { label: 'Sepia', value: 6 },
];
