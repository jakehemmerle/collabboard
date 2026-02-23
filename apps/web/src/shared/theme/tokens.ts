export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  '--cb-bg-page': string;
  '--cb-bg-surface': string;
  '--cb-bg-surface-raised': string;
  '--cb-bg-canvas': string;
  '--cb-border-default': string;
  '--cb-border-subtle': string;
  '--cb-border-strong': string;
  '--cb-text-primary': string;
  '--cb-text-secondary': string;
  '--cb-text-tertiary': string;
  '--cb-text-on-primary': string;
  '--cb-primary': string;
  '--cb-primary-hover': string;
  '--cb-primary-light': string;
  '--cb-primary-surface': string;
  '--cb-success': string;
  '--cb-error': string;
  '--cb-error-light': string;
  '--cb-error-border': string;
  '--cb-shadow-sm': string;
  '--cb-shadow-md': string;
  '--cb-shadow-lg': string;
  '--cb-grid-dot': string;
  '--cb-selection-border': string;
  '--cb-input-bg': string;
  '--cb-input-border': string;
  '--cb-input-disabled-bg': string;
}

export const LIGHT_TOKENS: ThemeTokens = {
  '--cb-bg-page': '#ffffff',
  '--cb-bg-surface': '#ffffff',
  '--cb-bg-surface-raised': '#f5f5f5',
  '--cb-bg-canvas': '#f8f9fa',
  '--cb-border-default': '#ddd',
  '--cb-border-subtle': '#eee',
  '--cb-border-strong': '#ccc',
  '--cb-text-primary': '#333',
  '--cb-text-secondary': '#666',
  '--cb-text-tertiary': '#999',
  '--cb-text-on-primary': '#fff',
  '--cb-primary': '#1976D2',
  '--cb-primary-hover': '#1565C0',
  '--cb-primary-light': '#E3F2FD',
  '--cb-primary-surface': '#2196F3',
  '--cb-success': '#4CAF50',
  '--cb-error': '#D32F2F',
  '--cb-error-light': '#FFF3F3',
  '--cb-error-border': '#FFCDD2',
  '--cb-shadow-sm': '0 2px 8px rgba(0,0,0,0.1)',
  '--cb-shadow-md': '0 4px 20px rgba(0,0,0,0.15)',
  '--cb-shadow-lg': '0 8px 32px rgba(0,0,0,0.2)',
  '--cb-grid-dot': '#ccc',
  '--cb-selection-border': '#2196F3',
  '--cb-input-bg': '#ffffff',
  '--cb-input-border': '#ddd',
  '--cb-input-disabled-bg': '#ccc',
};

export const DARK_TOKENS: ThemeTokens = {
  '--cb-bg-page': '#1a1a2e',
  '--cb-bg-surface': '#232340',
  '--cb-bg-surface-raised': '#2d2d4a',
  '--cb-bg-canvas': '#16162a',
  '--cb-border-default': '#3d3d5c',
  '--cb-border-subtle': '#2d2d4a',
  '--cb-border-strong': '#4d4d6a',
  '--cb-text-primary': '#e8e8f0',
  '--cb-text-secondary': '#a0a0b8',
  '--cb-text-tertiary': '#6a6a80',
  '--cb-text-on-primary': '#fff',
  '--cb-primary': '#64B5F6',
  '--cb-primary-hover': '#90CAF9',
  '--cb-primary-light': 'rgba(100,181,246,0.15)',
  '--cb-primary-surface': '#42A5F5',
  '--cb-success': '#66BB6A',
  '--cb-error': '#EF5350',
  '--cb-error-light': 'rgba(239,83,80,0.15)',
  '--cb-error-border': 'rgba(239,83,80,0.3)',
  '--cb-shadow-sm': '0 2px 8px rgba(0,0,0,0.4)',
  '--cb-shadow-md': '0 4px 20px rgba(0,0,0,0.5)',
  '--cb-shadow-lg': '0 8px 32px rgba(0,0,0,0.6)',
  '--cb-grid-dot': '#3d3d5c',
  '--cb-selection-border': '#64B5F6',
  '--cb-input-bg': '#2d2d4a',
  '--cb-input-border': '#3d3d5c',
  '--cb-input-disabled-bg': '#3d3d5c',
};
