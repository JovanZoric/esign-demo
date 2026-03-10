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
  const [currentDocument, setCurrentDocument] = useState<DocumentDTO>(document);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDocument(document);
  }, [document]);

  useEffect(() => {
    loadDocument();
  }, [document.id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const [blob, metadata] = await Promise.all([
        documentApi.getDocumentContent(document.id),
        documentApi.getDocumentMetadata(document.id),
      ]);

      const arrayBuffer = await blob.arrayBuffer();
      setPdfData(new Uint8Array(arrayBuffer));
      setCurrentDocument(metadata);

      if (metadata.isSigned || metadata.isPartiallySigned) {
        await verifySignature();
      } else {
        setSignatureInfo(null);
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
      const metadata = await documentApi.getDocumentMetadata(document.id);
      setSignatureInfo(info);
      setCurrentDocument(metadata);
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

      if (currentDocument.signatureCount >= currentDocument.requiredSignatures) {
        setError('This document already has all required signatures');
        return;
      }

      if (!PdfSigningService.isBrowserSupported()) {
        setError('Your browser does not support the required cryptographic APIs');
        return;
      }

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

      const signerName = prompt('Enter signer name:', 'QEC Demo User');
      if (!signerName) {
        setSigning(false);
        return;
      }

      const nextSignatureNumber = currentDocument.signatureCount + 1;
      const signedPdfBytes = await addVisibleSignature(pdfData, signerName, nextSignatureNumber);

      const signedPdfBuffer = signedPdfBytes.slice().buffer as ArrayBuffer;
      const signedBlob = new Blob([signedPdfBuffer], { type: 'application/pdf' });
      const signedFile = new File([signedBlob], currentDocument.filename, { type: 'application/pdf' });

      const updatedDoc = await documentApi.updateSignedDocument(currentDocument.id, signedFile);
      setCurrentDocument(updatedDoc);
      setSuccess(`Document signed successfully. Signature progress: ${updatedDoc.signatureCount}/${updatedDoc.requiredSignatures}. Note: This is a demo signature.`);

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
      await documentApi.downloadDocument(currentDocument.id, currentDocument.filename);
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
        <button className="modal-close" onClick={onClose}>x</button>

        <h2>{currentDocument.filename}</h2>

        <div className="signature-progress-banner">
          <strong>Signature progress:</strong> {currentDocument.signatureCount}/{currentDocument.requiredSignatures}
          {currentDocument.isPartiallySigned && <span className="badge badge-info">DEMO Partially Signed</span>}
          {currentDocument.isSigned && currentDocument.isDemoSignature && <span className="badge badge-info">DEMO Signed</span>}
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {currentDocument.signatureCount < currentDocument.requiredSignatures && (
            <button
              onClick={handleSignDocument}
              disabled={signing}
              className="btn btn-success"
            >
              {signing ? 'Signing...' : `Add Signature ${currentDocument.signatureCount + 1}`}
            </button>
          )}

          {(currentDocument.isSigned || currentDocument.isPartiallySigned) && (
            <button
              onClick={verifySignature}
              disabled={verifying}
              className="btn btn-primary"
            >
              {verifying ? 'Verifying...' : 'Verify Signatures'}
            </button>
          )}

          <button onClick={handleDownload} className="btn btn-secondary">
            Download
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
