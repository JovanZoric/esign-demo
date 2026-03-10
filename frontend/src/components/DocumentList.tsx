import React, { useState } from 'react';
import { DocumentDTO } from '../types';
import { documentApi } from '../api';

interface DocumentListProps {
  documents: DocumentDTO[];
  onRefresh: () => void;
  onSelectDocument: (doc: DocumentDTO) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onRefresh, onSelectDocument }) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingId(id);
      await documentApi.deleteDocument(id);
      onRefresh();
    } catch (error) {
      alert('Failed to delete document');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: DocumentDTO) => {
    try {
      await documentApi.downloadDocument(doc.id, doc.filename);
    } catch (error) {
      alert('Failed to download document');
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getSignatureStatusBadge = (doc: DocumentDTO) => {
    if (doc.isPartiallySigned) {
      return <span className="badge badge-info">DEMO Partially Signed</span>;
    }

    if (!doc.isSigned) {
      return <span className="badge badge-warning">Unsigned</span>;
    }

    if (doc.isDemoSignature) {
      return <span className="badge badge-info" style={{ backgroundColor: '#17a2b8' }}>DEMO Signed</span>;
    }

    if (doc.verificationStatus?.includes('Valid')) {
      return (
        <>
          <span className="badge badge-success">Signed</span>
          {doc.isQecCertificate && (
            <span className="badge badge-qec">QEC</span>
          )}
        </>
      );
    }

    return <span className="badge badge-danger">Invalid Signature</span>;
  };

  if (documents.length === 0) {
    return (
      <div className="card">
        <h2>Documents</h2>
        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
          No documents uploaded yet. Upload a PDF to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Documents ({documents.length})</h2>
      <ul className="document-list">
        {documents.map((doc) => (
          <li key={doc.id} className="document-item">
            <div className="document-info">
              <h3>
                {doc.filename}
                {getSignatureStatusBadge(doc)}
              </h3>
              <p>Uploaded: {formatDate(doc.uploadDate)}</p>
              <p>Signature progress: {doc.signatureCount}/{doc.requiredSignatures}</p>
              {doc.isSigned && doc.signedDate && (
                <p>Signed: {formatDate(doc.signedDate)}</p>
              )}
              {doc.signerName && (
                <p>Signer: {doc.signerName}</p>
              )}
              <p>Size: {formatFileSize(doc.fileSize)}</p>
              {doc.verificationStatus && (
                <p><strong>{doc.verificationStatus}</strong></p>
              )}
            </div>
            <div className="document-actions">
              <button
                onClick={() => onSelectDocument(doc)}
                className="btn btn-primary"
              >
                View
              </button>
              <button
                onClick={() => handleDownload(doc)}
                className="btn btn-secondary"
              >
                Download
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                className="btn btn-danger"
                disabled={deletingId === doc.id}
              >
                {deletingId === doc.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentList;
