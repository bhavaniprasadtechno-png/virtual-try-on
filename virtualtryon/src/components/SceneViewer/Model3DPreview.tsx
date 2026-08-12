import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { loadModelViewer, type ModelViewerHandle } from '../../lib/modelViewer';
import './Model3DPreview.css';

interface Model3DPreviewProps {
  url: string;
  tintHex: string | null;
  className?: string;
}

/**
 * Static-scene viewer for an uploaded 3D model: auto-rotates slowly and
 * responds to drag, standing in for ProductPreviewArt's line-art when a
 * custom model is active.
 */
export function Model3DPreview({ url, tintHex, className }: Model3DPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ModelViewerHandle | null>(null);
  const rotationRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const tintRef = useRef(tintHex);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    tintRef.current = tintHex;
  }, [tintHex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setStatus('loading');

    loadModelViewer(canvas, url)
      .then((handle) => {
        if (cancelled) {
          handle.dispose();
          return;
        }
        handleRef.current = handle;
        handle.setTint(tintRef.current);
        setStatus('ready');

        const loop = () => {
          const c = canvasRef.current;
          const parent = c?.parentElement;
          if (!c || !parent) return;
          const width = parent.clientWidth || 1;
          const height = parent.clientHeight || 1;
          handle.resize(width, height);
          if (!draggingRef.current) rotationRef.current += 0.006;
          const size = Math.min(width, height) * 0.62;
          handle.setInstances([{ x: width / 2, y: height / 2, size, rotationY: rotationRef.current }]);
          handle.render();
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    handleRef.current?.setTint(tintHex);
  }, [tintHex]);

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    lastPointerXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    rotationRef.current += (e.clientX - lastPointerXRef.current) * 0.012;
    lastPointerXRef.current = e.clientX;
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  return (
    <div className={`model3d-preview${className ? ` ${className}` : ''}`}>
      <canvas
        ref={canvasRef}
        className="model3d-preview__canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {status === 'loading' && <div className="model3d-preview__status">Loading model…</div>}
      {status === 'error' && (
        <div className="model3d-preview__status model3d-preview__status--error">
          Couldn&apos;t load this model.
        </div>
      )}
    </div>
  );
}
