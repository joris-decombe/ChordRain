import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user is using a touch device with a coarse pointer.
 */
export function useTouchDevice() {
    const [isTouch, setIsTouch] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(pointer: coarse)').matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(pointer: coarse)');
        const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return isTouch;
}
