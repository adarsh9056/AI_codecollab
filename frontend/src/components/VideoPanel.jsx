import { useRef, useState, useEffect } from 'react';

export default function VideoPanel({
  videoRef,
  initialRight = 24,
  initialBottom = 24,
  initialWidth = 320,
  initialHeight = 180,
  minWidth = 160,
  minHeight = 90,
  className = '',
}) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const start = useRef({ mouseX: 0, mouseY: 0, right: 0, bottom: 0, width: 0, height: 0 });

  const [pos, setPos] = useState({ right: initialRight, bottom: initialBottom });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) {
        const dx = e.clientX - start.current.mouseX;
        const dy = e.clientY - start.current.mouseY;
        const newRight = Math.max(0, start.current.right - dx);
        const newBottom = Math.max(0, start.current.bottom - dy);
        setPos({ right: newRight, bottom: newBottom });
      } else if (resizing.current) {
        const dx = e.clientX - start.current.mouseX;
        const dy = e.clientY - start.current.mouseY;
        const newW = Math.max(minWidth, start.current.width + dx);
        const newH = Math.max(minHeight, start.current.height + dy);
        setSize({ width: newW, height: newH });
      }
    };

    const onUp = () => {
      dragging.current = false;
      resizing.current = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    if (dragging.current || resizing.current) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
  }, [minWidth, minHeight]);

  const startDrag = (e) => {
    dragging.current = true;
    start.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      right: pos.right,
      bottom: pos.bottom,
    };
  };

  const startResize = (e) => {
    e.stopPropagation();
    resizing.current = true;
    start.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={startDrag}
      style={{
        position: 'fixed',
        right: `${pos.right}px`,
        bottom: `${pos.bottom}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 60,
        cursor: 'grab',
      }}
      className={`rounded-lg overflow-hidden shadow-2xl border border-white/5 bg-black/40 ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      <div
        onMouseDown={startResize}
        style={{ position: 'absolute', right: 6, bottom: 6, width: 14, height: 14, cursor: 'nwse-resize', borderRadius: 2 }}
        className="bg-white/10"
      />
    </div>
  );
}
