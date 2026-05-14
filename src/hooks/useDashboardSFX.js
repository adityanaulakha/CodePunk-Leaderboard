import { useEffect } from 'react'
import { playClickSound } from '../lib/sounds.js'

/**
 * useDashboardSFX
 * Custom React hook that sets up a highly efficient global event delegate listener.
 * Automatically triggers crisp 8-bit click SFX whenever user clicks any interactive
 * controls (Buttons, Link components, toggles) within the component subtree.
 */
export default function useDashboardSFX() {
  useEffect(() => {
    const handleInteractiveClick = (event) => {
      // Identify if clicked element (or its parents) is a button or link
      const trigger = event.target.closest('button') || event.target.closest('a');
      
      if (trigger) {
        // Prevent double firing if target is specifically marked as no-sfx
        if (trigger.dataset.noSfx) return;
        
        playClickSound();
      }
    };

    // Attach listener on window with capture logic
    window.addEventListener('click', handleInteractiveClick, { capture: true });
    
    return () => {
      window.removeEventListener('click', handleInteractiveClick, { capture: true });
    };
  }, []);
}
