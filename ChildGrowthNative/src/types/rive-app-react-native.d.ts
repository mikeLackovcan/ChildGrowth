declare module '@rive-app/react-native' {
  import type React from 'react';
  export const Fit: { Contain: unknown };
  export const RiveView: React.ComponentType<any>;
  export function useRive(): { riveViewRef: { playIfNeeded(): void } | null; setHybridRef: unknown };
  export function useRiveFile(source: number | string | undefined): { riveFile: any; error?: unknown };
  export function useViewModelInstance(file: any, options: { async: true; onInit?: (instance: any) => void }): { instance: any };
}
