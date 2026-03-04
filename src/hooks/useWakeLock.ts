import { useEffect, useRef } from 'react';

/**
 * Requests a screen Wake Lock while `active` is true to prevent the device
 * from dimming or sleeping during playback (iOS 16.4+, iPadOS 16.4+, Chrome).
 * Automatically re-acquires the lock when the page becomes visible again
 * (the browser releases wake locks on page hide).
 */
export function useWakeLock(active: boolean) {
    const wakeLockRef = useRef<{ release(): Promise<void> } | null>(null);

    useEffect(() => {
        if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
            return;
        }

        let mounted = true;

        const requestWakeLock = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            } catch {
                // Silently ignore — e.g. document not visible, or permission denied
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && mounted) {
                requestWakeLock();
            }
        };

        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
                wakeLockRef.current = null;
            }
        };
    }, [active]);
}
