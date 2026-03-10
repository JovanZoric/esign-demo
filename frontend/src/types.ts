export interface DocumentDTO {
  id: number;
  filename: string;
  uploadDate: string;
  isSigned: boolean;
  requiredSignatures: number;
  signatureCount: number;
  isPartiallySigned: boolean;
  signedDate?: string;
  signerName?: string;
  signerCertificateIssuer?: string;
  certificateSerialNumber?: string;
  signatureAlgorithm?: string;
  isQecCertificate?: boolean;
  isDemoSignature?: boolean;
  certificatePolicies?: string;
  verificationStatus?: string;
  fileSize: number;
}

export interface SignatureInfo {
  isSigned: boolean;
  requiredSignatures?: number;
  signatureCount?: number;
  isPartiallySigned?: boolean;
  signerName?: string;
  signerCertificateIssuer?: string;
  certificateSerialNumber?: string;
  signatureAlgorithm?: string;
  signDate?: string;
  isQecCertificate?: boolean;
  certificatePolicies?: string;
  isValid?: boolean;
  isDemoSignature?: boolean;
  verificationStatus?: string;
  errorMessage?: string;
}
