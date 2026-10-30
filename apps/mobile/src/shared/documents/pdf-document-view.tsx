'use dom';

import { useEffect, useRef, useState } from 'react';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { theme } from '@/theme';

// Local worker code runs in this WebView, with no CDN, document URL or worker fetch.
Object.assign(globalThis, { pdfjsWorker: { WorkerMessageHandler } });

export default function PdfDocumentView({
  base64,
}: {
  base64: string;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(true);
  useEffect(() => {
    let current = true;
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const task = getDocument({
      data: bytes,
      useWorkerFetch: false,
      useWasm: false,
      disableFontFace: false,
      useSystemFonts: true,
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      verbosity: 0,
    });
    task.onPassword = () => {
      if (current)
        setError('Este PDF está protegido con contraseña. Adjunta una copia sin contraseña.');
    };
    void task.promise
      .then((document) => {
        if (current) setPdf(document);
      })
      .catch(() => {
        if (current) setError('No pudimos abrir este PDF. Revisa que el archivo no esté dañado.');
      });
    return () => {
      current = false;
      void task.destroy();
    };
  }, [base64]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let current = true;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    setRendering(true);
    void pdf
      .getPage(page)
      .then(async (documentPage) => {
        if (!current || !canvas.current) return;
        const element = canvas.current;
        const natural = documentPage.getViewport({ scale: 1 });
        const available = Math.max(1, window.innerWidth - theme.spacing.md * 2);
        const viewport = documentPage.getViewport({ scale: (available / natural.width) * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        element.width = Math.ceil(viewport.width * ratio);
        element.height = Math.ceil(viewport.height * ratio);
        element.style.width = `${viewport.width}px`;
        element.style.height = `${viewport.height}px`;
        render = documentPage.render({
          canvas: element,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        await render.promise;
        if (current) setRendering(false);
      })
      .catch(() => {
        if (current)
          setError('No pudimos mostrar esta página. Intenta abrir el documento nuevamente.');
      });
    return () => {
      current = false;
      render?.cancel();
    };
  }, [pdf, page, zoom]);
  const button = {
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    background: theme.brand.colors.cream,
    border: 'none',
    borderRadius: theme.radii.control,
    fontSize: theme.typography.sizes.note,
  };
  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        color: theme.colors.text,
        background: theme.brand.colors.cream,
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
        }}
      >
        <button
          style={button}
          disabled={!pdf || page <= 1 || rendering}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </button>
        <span aria-live="polite">{pdf ? `${page} / ${pdf.numPages}` : 'Cargando PDF…'}</span>
        <button
          style={button}
          disabled={!pdf || page >= pdf.numPages || rendering}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
        <button
          aria-label="Alejar"
          style={button}
          disabled={rendering || zoom <= 1}
          onClick={() => setZoom(Math.max(1, zoom - 0.5))}
        >
          −
        </button>
        <button
          aria-label="Acercar"
          style={button}
          disabled={rendering || zoom >= 3}
          onClick={() => setZoom(Math.min(3, zoom + 0.5))}
        >
          +
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ padding: theme.spacing.md, color: theme.colors.error }}>
          {error}
        </p>
      ) : (
        <div style={{ overflow: 'auto', flex: 1, padding: theme.spacing.sm, minHeight: 0 }}>
          <canvas ref={canvas} aria-label={`Página ${page} del documento`} />
        </div>
      )}
    </div>
  );
}
