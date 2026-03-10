import React, { useEffect, useState } from 'react';
import { DocumentDTO, SignatureInfo } from '../types';
import { documentApi } from '../api';
import PdfViewer from './PdfViewer';
import SignatureDetails from './SignatureDetails';
import { PdfSigningService, addVisibleSignature } from '../services/pdfSigningService';

interface DocumentViewerProps {
  document: DocumentDTO;
  onClose: () => void;
  onDocumentUpdated: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, onDocumentUpdated }) => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [document.id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const blob = await documentApi.getDocumentContent(document.id);
      const arrayBuffer = await blob.arrayBuffer();
      setPdfData(new Uint8Array(arrayBuffer));
      
      // Auto-verify signature if document is marked as signed
      if (document.isSigned) {
        await verifySignature();
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
      setLoading(false);
    }
  };

  const verifySignature = async () => {
    try {
      setVerifying(true);
      const info = await documentApi.verifySignature(document.id);
      setSignatureInfo(info);
    } catch (err) {
      console.error('Error verifying signature:', err);
      setError('Failed to verify signature');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignDocument = async () => {
    if (!pdfData) {
      setError('No document loaded');
      return;
    }

    try {
      setSigning(true);
      setError(null);
      setSuccess(null);

      // Check browser support
      if (!PdfSigningService.isBrowserSupported()) {
        setError('Your browser does not support the required cryptographic APIs');
        return;
      }

      // Show info about demo mode
      const useDemoSign = confirm(
        'DEMO MODE:\n\n' +
        'This demo will create a visible signature annotation.\n\n' +
        'In production with a real QEC smart card:\n' +
        '- The browser would prompt for certificate selection\n' +
        '- You would enter your smart card PIN\n' +
        '- A cryptographic signature would be created\n\n' +
        'Click OK to proceed with demo signature.'
      );

      if (!useDemoSign) {
        setSigning(false);
        return;
      }

      // For demo: create visible signature
      // In production: use PdfSigningService.signPdfWithCertificate()
      const signerName = prompt('Enter signer name:', 'QEC Demo User');
      if (!signerName) {
        setSigning(false);
        return;
      }

      const signedPdfBytes = await addVisibleSignature(pdfData, signerName);

      // Create a File object from the signed PDF
      const signedBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const signedFile = new File([signedBlob], document.filename, { type: 'application/pdf' });

      // Upload signed document
      const updatedDoc = await documentApi.updateSignedDocument(document.id, signedFile);
      
      setSuccess('Document signed successfully! Note: This is a demo signature. In production, a cryptographic signature would be embedded.');
      
      // Reload document
      await loadDocument();
      onDocumentUpdated();

    } catch (err: any) {
      console.error('Error signing document:', err);
      setError(`Failed to sign document: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async () => {
    try {
      await documentApi.downloadDocument(document.id, document.filename);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  if (loading) {
    return (
      <div className="modal">
        <div className="modal-content">
          <div className="loading">Loading document...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxWidth: '1200px' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>{document.filename}</h2>
        
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!document.isSigned && (
            <button
              onClick={handleSignDocument}
              disabled={signing}
              className="btn btn-success"
            >
              {signing ? 'Signing...' : '✍️ Sign Document'}
            </button>
          )}
          
          {document.isSigned && (
            <button
              onClick={verifySignature}
              disabled={verifying}
              className="btn btn-primary"
            >
              {verifying ? 'Verifying...' : '🔍 Verify Signature'}
            </button>
          )}
          
          <button onClick={handleDownload} className="btn btn-secondary">
            💾 Download
          </button>
          
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {signatureInfo && <SignatureDetails signatureInfo={signatureInfo} />}

        {pdfData && (
          <div style={{ marginTop: '1rem' }}>
            <PdfViewer pdfData={pdfData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
