import React, { useState } from 'react';
import { documentApi } from '../api';
import { DocumentDTO } from '../types';

interface FileUploadProps {
  onUploadSuccess: (doc: DocumentDTO) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const document = await documentApi.uploadDocument(file);
      onUploadSuccess(document);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="card">
      <h2>Upload PDF Document</h2>
      <div
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="upload-icon">📄</div>
        <h3>
          {uploading ? 'Uploading...' : 'Drop PDF file here or click to browse'}
        </h3>
        <p>Only PDF files are supported</p>
        <input
          id="file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          disabled={uploading}
        />
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default FileUpload;
