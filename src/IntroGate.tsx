import React, { useState, useEffect, useRef } from 'react';

interface IntroGateProps {
  children: React.ReactNode;
}

const VIDEO_SRC = 'assets/intro.mp4';
const IMAGE_SRC = 'assets/intro.png';
// Shorter fallback timings so preview/file-view loads quickly
const IMAGE_DISPLAY_DURATION = 1000; // ms
const HARD_TIMEOUT_DURATION = 3000; // ms

const IntroGate: React.FC<IntroGateProps> = ({ children }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [useImageFallback, setUseImageFallback] = useState(false);
  // Allow query ?noIntro=1 or ?skipIntro=1 to bypass the gate (useful in raw file previews)
  const params = new URLSearchParams(window.location.search);
  const skipIntroParam =
    params.get('noIntro') === '1' || params.get('skipIntro') === '1';
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Use browser timer type (`number`) instead of Node timer type to avoid the
  // NodeJS dependency in the browser bundle.
  const hardTimeoutRef = useRef<number | null>(null);
  const imageFallbackTimeoutRef = useRef<number | null>(null);

  // Immediately skip intro if requested via URL param
  useEffect(() => {
    if (skipIntroParam) {
      setShowIntro(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Draw the media element to a small off-screen canvas,
   * sample the first and last columns, average the RGB values,
   * and apply that as the container background colour.
   */
  const applyEdgeColor = (media: HTMLVideoElement | HTMLImageElement) => {
    try {
      const w = 160;
      const h = 90;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Compute scale preserving aspect-ratio (object-fit: contain logic)
      let vw: number, vh: number;
      if (media instanceof HTMLVideoElement) {
        vw = media.videoWidth;
        vh = media.videoHeight;
      } else {
        // HTMLImageElement
        vw = media.naturalWidth;
        vh = media.naturalHeight;
      }
      if (!vw || !vh) return;
      const scale = Math.min(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      ctx.drawImage(media, dx, dy, dw, dh);

      const imgData = ctx.getImageData(0, 0, w, h).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      // Determine columns/rows fully inside the drawn media rect
      const xLeft = Math.max(0, Math.floor(dx));
      const xRight = Math.min(w - 1, Math.ceil(dx + dw - 1));
      const yStart = Math.max(0, Math.floor(dy));
      const yEnd = Math.min(h - 1, Math.ceil(dy + dh - 1));

      // sample left-most and right-most columns of the media rectangle
      for (let y = yStart; y <= yEnd; y++) {
        let i = (y * w + xLeft) * 4; // left edge pixel
        r += imgData[i];
        g += imgData[i + 1];
        b += imgData[i + 2];
        i = (y * w + xRight) * 4; // right edge pixel
        r += imgData[i];
        g += imgData[i + 1];
        b += imgData[i + 2];
        count += 2;
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      if (containerRef.current) {
        containerRef.current.style.backgroundColor = `rgb(${r},${g},${b})`;
      }
    } catch {
      /* silent fallback */
    }
  };

  // Function to finish the intro sequence
  const finishIntro = () => {
    setShowIntro(false);
    
    // Clear any pending timeouts
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
    
    if (imageFallbackTimeoutRef.current) {
      clearTimeout(imageFallbackTimeoutRef.current);
      imageFallbackTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Set hard timeout as a safety measure
    hardTimeoutRef.current = window.setTimeout(() => {
      console.log('Hard timeout triggered - forcing intro to finish');
      finishIntro();
    }, HARD_TIMEOUT_DURATION);

    // Attempt to play the video
    const videoElement = videoRef.current;
    if (videoElement) {
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video playback started successfully');

                // Try to sample colour once first frame is available
                if ('requestVideoFrameCallback' in videoElement) {
                  // @ts-ignore – experimental API
                  videoElement.requestVideoFrameCallback(() => {
                    applyEdgeColor(videoElement);
                  });
                } else {
                  // Fallback: wait 50 ms then sample
                  window.setTimeout(() => applyEdgeColor(videoElement), 50);
                }
          })
          .catch(error => {
            console.log('Video playback failed, falling back to image', error);
            setUseImageFallback(true);
            
            // Set timeout for image display duration
            imageFallbackTimeoutRef.current = window.setTimeout(
              finishIntro,
              IMAGE_DISPLAY_DURATION,
            );
          });
      }
    }

    // Cleanup function
    return () => {
      if (hardTimeoutRef.current) {
      window.clearTimeout(hardTimeoutRef.current);
      }
      if (imageFallbackTimeoutRef.current) {
        window.clearTimeout(imageFallbackTimeoutRef.current);
      }
    };
  }, []);

  // If intro is complete, render children
  if (!showIntro) {
    return <>{children}</>;
  }

  // Render intro overlay
  return (
    <div ref={containerRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      {!useImageFallback ? (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          autoPlay
          onLoadedData={() => {
            if (videoRef.current) applyEdgeColor(videoRef.current);
          }}
          playsInline
          onEnded={finishIntro}
          onError={() => setUseImageFallback(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // fit within viewport without cropping
          }}
        />
      ) : (
        <img
          src={IMAGE_SRC}
          alt="Intro"
          onLoad={(e) => {
            applyEdgeColor(e.currentTarget);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // fit within viewport without cropping
          }}
          onError={finishIntro} // If image also fails, finish intro
        />
      )}
    </div>
  );
};

export default IntroGate;
