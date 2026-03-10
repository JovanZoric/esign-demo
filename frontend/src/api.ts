import axios from 'axios';
import { DocumentDTO, SignatureInfo } from './types';

const API_BASE_URL = '/api/documents';

export const documentApi = {
  uploadDocument: async (file: File, requiredSignatures: number): Promise<DocumentDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('requiredSignatures', String(requiredSignatures));
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAllDocuments: async (): Promise<DocumentDTO[]> => {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  },

  getDocumentMetadata: async (id: number): Promise<DocumentDTO> => {
    const response = await axios.get(`${API_BASE_URL}/${id}/metadata`);
    return response.data;
  },

  getDocumentContent: async (id: number): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/${id}/content`, {
      responseType: 'blob'
    });
    return response.data;
  },

  downloadDocument: async (id: number, filename: string): Promise<void> => {
    const response = await axios.get(`${API_BASE_URL}/${id}/download`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  verifySignature: async (id: number): Promise<SignatureInfo> => {
    const response = await axios.post(`${API_BASE_URL}/${id}/verify-signature`);
    return response.data;
  },

  updateSignedDocument: async (id: number, file: File): Promise<DocumentDTO> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/${id}/update-signed`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteDocument: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/${id}`);
  }
};
