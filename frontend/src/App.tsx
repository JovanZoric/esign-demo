import { useEffect, useState } from 'react';
import './App.css';
import { DocumentDTO } from './types';
import { documentApi } from './api';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';
import DocumentViewer from './components/DocumentViewer';

function App() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await documentApi.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (doc: DocumentDTO) => {
    loadDocuments();
    if (doc.isSigned) {
      alert(`Document uploaded and signature detected!\n\nSigner: ${doc.signerName || 'Unknown'}\nQEC: ${doc.isQecCertificate ? 'Yes' : 'No'}`);
    }
  };

  const handleSelectDocument = (doc: DocumentDTO) => {
    setSelectedDocument(doc);
  };

  const handleCloseViewer = () => {
    setSelectedDocument(null);
  };

  const handleDocumentUpdated = () => {
    loadDocuments();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔐 QEC Smart Card PDF Signing Demo</h1>
        <p>Upload, sign, and verify PDF documents with Qualified Electronic Certificates</p>
      </header>

      <main className="container">
        {error && <div className="error">{error}</div>}

        <FileUpload onUploadSuccess={handleUploadSuccess} />

        {loading ? (
          <div className="loading">Loading documents...</div>
        ) : (
          <DocumentList
            documents={documents}
            onRefresh={loadDocuments}
            onSelectDocument={handleSelectDocument}
          />
        )}

        <div className="card">
          <h2>About This Demo</h2>
          <div className="info">
            <p><strong>Features:</strong></p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Upload PDF documents to the server</li>
              <li>Choose 1-4 required signatures per uploaded document</li>
              <li>Automatic detection of existing QEC signatures in uploaded PDFs</li>
              <li>Client-side PDF signing with partial-sign progress tracking</li>
              <li>Server-side signature verification using Apache PDFBox</li>
              <li>QEC certificate detection and validation</li>
              <li>Document status tracking (unsigned/partially signed/signed)</li>
            </ul>

            <p style={{ marginTop: '1rem' }}><strong>Production Implementation Notes:</strong></p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Replace demo signing with Web Crypto API for smart card access</li>
              <li>Configure smart card middleware on client machines</li>
              <li>Update QEC OIDs in backend to match your certificate authority</li>
              <li>Add certificate revocation checking (OCSP/CRL)</li>
              <li>Implement proper authentication and authorization</li>
              <li>Use production database instead of H2</li>
              <li>Enable HTTPS and restrict CORS</li>
              <li>Add audit logging for all signing operations</li>
            </ul>

            <p style={{ marginTop: '1rem' }}><strong>Technology Stack:</strong></p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Backend:</strong> Spring Boot 3.2, Apache PDFBox, Bouncy Castle</li>
              <li><strong>Frontend:</strong> React, TypeScript, pdf.js, pdf-lib, node-forge</li>
              <li><strong>Database:</strong> H2 (in-memory for demo)</li>
            </ul>
          </div>
        </div>
      </main>

      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={handleCloseViewer}
          onDocumentUpdated={handleDocumentUpdated}
        />
      )}
    </div>
  );
}

export default App;
