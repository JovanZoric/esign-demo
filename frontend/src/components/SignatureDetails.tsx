import React from 'react';
import { SignatureInfo } from '../types';

interface SignatureDetailsProps {
  signatureInfo: SignatureInfo;
}

const SignatureDetails: React.FC<SignatureDetailsProps> = ({ signatureInfo }) => {
  if (!signatureInfo.isSigned) {
    return (
      <div className="signature-details">
        <h3>Signature Status</h3>
        <p>This document is not signed.</p>
      </div>
    );
  }

  return (
    <div className="signature-details">
      <h3>Digital Signature Information</h3>
      
      <dl>
        <dt>Status:</dt>
        <dd>
          {signatureInfo.isDemoSignature ? (
            <span className="badge badge-info" style={{ backgroundColor: '#17a2b8' }}>DEMO Signature</span>
          ) : signatureInfo.isValid ? (
            <span className="badge badge-success">Valid Signature</span>
          ) : (
            <span className="badge badge-danger">Invalid Signature</span>
          )}
          {signatureInfo.isQecCertificate && (
            <span className="badge badge-qec" style={{ marginLeft: '0.5rem' }}>
              QEC Certificate
            </span>
          )}
        </dd>

        {signatureInfo.verificationStatus && (
          <>
            <dt>Verification Status:</dt>
            <dd>{signatureInfo.verificationStatus}</dd>
          </>
        )}

        {signatureInfo.signerName && (
          <>
            <dt>Signer:</dt>
            <dd>{signatureInfo.signerName}</dd>
          </>
        )}

        {signatureInfo.signerCertificateIssuer && (
          <>
            <dt>Certificate Issuer:</dt>
            <dd>{signatureInfo.signerCertificateIssuer}</dd>
          </>
        )}

        {signatureInfo.certificateSerialNumber && (
          <>
            <dt>Certificate Serial Number:</dt>
            <dd>{signatureInfo.certificateSerialNumber}</dd>
          </>
        )}

        {signatureInfo.signatureAlgorithm && (
          <>
            <dt>Signature Algorithm:</dt>
            <dd>{signatureInfo.signatureAlgorithm}</dd>
          </>
        )}

        {signatureInfo.signDate && (
          <>
            <dt>Signed Date:</dt>
            <dd>{signatureInfo.signDate}</dd>
          </>
        )}

        {signatureInfo.isQecCertificate && signatureInfo.certificatePolicies && (
          <>
            <dt>Certificate Policies:</dt>
            <dd style={{ fontSize: '0.85rem' }}>{signatureInfo.certificatePolicies}</dd>
          </>
        )}

        {signatureInfo.errorMessage && (
          <>
            <dt>Error:</dt>
            <dd className="error">{signatureInfo.errorMessage}</dd>
          </>
        )}
      </dl>

      {signatureInfo.isDemoSignature && (
        <div className="info" style={{ marginTop: '1rem', backgroundColor: '#d1ecf1', borderColor: '#bee5eb', color: '#0c5460' }}>
          <strong>ℹ DEMO Signature</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            This document is signed with a DEMO signature for testing purposes.
            It is not cryptographically secured and should not be used in production.
          </p>
        </div>
      )}

      {signatureInfo.isQecCertificate && (
        <div className="info" style={{ marginTop: '1rem' }}>
          <strong>✓ QEC Certificate Detected</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            This document is signed with a Qualified Electronic Certificate,
            providing the highest level of signature assurance.
          </p>
        </div>
      )}
    </div>
  );
};

export default SignatureDetails;
