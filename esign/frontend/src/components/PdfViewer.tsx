import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  pdfData: Uint8Array | ArrayBuffer;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfBytes = pdfData instanceof Uint8Array
          ? new Uint8Array(pdfData)
          : new Uint8Array(pdfData.slice(0));

        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdfDocument = await loadingTask.promise;

        if (cancelled) {
          await pdfDocument.destroy();
          return;
        }

        setPdf(pdfDocument);
        setCurrentPage(1);
        setTotalPages(pdfDocument.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  useEffect(() => {
    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [pdf]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not get canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
      } catch (err) {
        if ((err as any)?.name === 'RenderingCancelledException' || cancelled) {
          return;
        }

        console.error('Error rendering page:', err);
        setError('Failed to render PDF page');
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdf, currentPage, scale]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  if (loading) {
    return <div className="loading">Loading PDF...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button onClick={goToPreviousPage} disabled={currentPage <= 1} className="btn btn-secondary">
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={goToNextPage} disabled={currentPage >= totalPages} className="btn btn-secondary">
          Next
        </button>
        <div style={{ marginLeft: '2rem' }}>
          <button onClick={zoomOut} disabled={scale <= 0.5} className="btn btn-secondary">
            Zoom Out
          </button>
          <span style={{ margin: '0 1rem' }}>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3} className="btn btn-secondary">
            Zoom In
          </button>
        </div>
      </div>
      <div className="pdf-canvas-container">
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  );
};

export default PdfViewer;
