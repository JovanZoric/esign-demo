package com.esign.service;

import com.esign.dto.SignatureInfo;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.bouncycastle.asn1.x509.Extension;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cms.CMSException;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.SignerInformation;
import org.bouncycastle.cms.jcajce.JcaSimpleSignerInfoVerifierBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.Store;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.Security;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Service
@Slf4j
public class PdfSignatureVerificationService {

    // QEC (Qualified Electronic Certificate) OIDs
    // These are example OIDs - adjust based on your QEC certificate authority
    private static final String QEC_POLICY_OID = "0.4.0.194121.1.1"; // Example QC statement OID
    private static final String ETSI_QCS_QC_COMPLIANCE = "0.4.0.1862.1.1"; // ETSI QC compliance
    private static final String ETSI_QCS_QC_TYPE = "0.4.0.1862.1.6"; // ETSI QC type

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    public SignatureInfo verifyPdfSignature(byte[] pdfData) {
        SignatureInfo.SignatureInfoBuilder builder = SignatureInfo.builder()
                .isSigned(false)
                .isValid(false)
                .isDemoSignature(false);

        try (PDDocument document = Loader.loadPDF(pdfData)) {
            List<PDSignature> signatures = document.getSignatureDictionaries();

            if (signatures == null || signatures.isEmpty()) {
                return builder
                        .verificationStatus("Document is not signed")
                        .build();
            }

            // Verify the first (latest) signature
            PDSignature signature = signatures.get(0);
            builder.isSigned(true);

            // Get signature metadata
            if (signature.getSignDate() != null) {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                builder.signDate(sdf.format(signature.getSignDate().getTime()));
            }

            if (signature.getName() != null) {
                builder.signerName(signature.getName());
            }

            String reason = signature.getReason();
            if (reason != null) {
                log.info("Signature reason: {}", reason);
            }

            // Check if this is a DEMO signature
            boolean isDemoSignature = isDemoSignature(signature);
            builder.isDemoSignature(isDemoSignature);

            if (isDemoSignature) {
                log.info("DEMO signature detected");
                return builder
                        .isValid(true) // DEMO signatures are considered "valid" for demo purposes
                        .verificationStatus("DEMO signature - not cryptographically signed")
                        .build();
            }

            // Get signature content
            byte[] signatureContent = signature.getContents(pdfData);
            byte[] signedContent = signature.getSignedContent(pdfData);

            // Check if signature has actual content
            if (signatureContent == null || signatureContent.length == 0) {
                log.info("Signature dictionary exists but has no content - treating as DEMO signature");
                return builder
                        .isDemoSignature(true)
                        .isValid(true)
                        .verificationStatus("DEMO signature - signature dictionary without cryptographic content")
                        .build();
            }

            // Verify signature using CMS/PKCS#7
            SignatureInfo verificationResult = verifySignatureContent(
                    signatureContent, 
                    signedContent, 
                    builder
            );

            return verificationResult;

        } catch (IOException e) {
            log.error("Error verifying PDF signature", e);
            return builder
                    .verificationStatus("Error reading PDF")
                    .errorMessage(e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Unexpected error during signature verification", e);
            return builder
                    .verificationStatus("Verification failed")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Check if a signature is a DEMO signature based on metadata
     */
    private boolean isDemoSignature(PDSignature signature) {
        String name = signature.getName();
        String reason = signature.getReason();
        String filter = signature.getFilter();
        String subFilter = signature.getSubFilter();

        // Check for DEMO markers in signature metadata
        if (name != null && name.toUpperCase().contains("DEMO")) {
            return true;
        }
        
        if (reason != null && reason.toUpperCase().contains("DEMO")) {
            return true;
        }

        // Check for filters that indicate non-cryptographic signatures
        if (filter != null && filter.equals("DEMO_SIGNATURE")) {
            return true;
        }

        // Check for empty or placeholder subfilters
        if (subFilter != null && (subFilter.equals("DEMO") || subFilter.isEmpty())) {
            return true;
        }

        return false;
    }

    private SignatureInfo verifySignatureContent(
            byte[] signatureContent,
            byte[] signedContent,
            SignatureInfo.SignatureInfoBuilder builder
    ) {
        try {
            CMSSignedData signedData = new CMSSignedData(
                    new CMSProcessableByteArray(signedContent),
                    signatureContent
            );

            Store<X509CertificateHolder> certStore = signedData.getCertificates();
            Collection<SignerInformation> signers = signedData.getSignerInfos().getSigners();

            if (signers.isEmpty()) {
                return builder
                        .verificationStatus("No signer information found")
                        .build();
            }

            // Get the first signer
            SignerInformation signer = signers.iterator().next();
            Collection<X509CertificateHolder> certCollection = certStore.getMatches(signer.getSID());

            if (certCollection.isEmpty()) {
                return builder
                        .verificationStatus("Certificate not found")
                        .build();
            }

            X509CertificateHolder certHolder = certCollection.iterator().next();
            X509Certificate cert = new JcaX509CertificateConverter()
                    .setProvider("BC")
                    .getCertificate(certHolder);

            // Extract certificate information
            builder.signerName(cert.getSubjectX500Principal().getName());
            builder.signerCertificateIssuer(cert.getIssuerX500Principal().getName());
            builder.certificateSerialNumber(cert.getSerialNumber().toString());
            builder.signatureAlgorithm(signer.getEncryptionAlgOID());

            // Check if certificate is QEC
            boolean isQec = isQecCertificate(cert, certHolder);
            builder.isQecCertificate(isQec);

            if (isQec) {
                String policies = extractCertificatePolicies(certHolder);
                builder.certificatePolicies(policies);
            }

            // Verify the signature
            boolean isValid = signer.verify(
                    new JcaSimpleSignerInfoVerifierBuilder()
                            .setProvider("BC")
                            .build(certHolder)
            );

            builder.isValid(isValid);

            if (isValid) {
                String status = isQec 
                        ? "Valid QEC signature" 
                        : "Valid signature (not QEC)";
                builder.verificationStatus(status);
            } else {
                builder.verificationStatus("Invalid signature");
            }

            return builder.build();

        } catch (CMSException e) {
            log.error("CMS signature verification failed", e);
            return builder
                    .verificationStatus("CMS verification failed")
                    .errorMessage(e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return builder
                    .verificationStatus("Verification error")
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private boolean isQecCertificate(X509Certificate cert, X509CertificateHolder certHolder) {
        try {
            // Method 1: Check for QC statements in certificate policies extension
            byte[] qcStatements = cert.getExtensionValue(Extension.qCStatements.getId());
            if (qcStatements != null) {
                log.info("Certificate contains QC Statements");
                return true;
            }

            // Method 2: Check certificate policies OID
            byte[] certPolicies = cert.getExtensionValue(Extension.certificatePolicies.getId());
            if (certPolicies != null) {
                String policies = extractCertificatePolicies(certHolder);
                if (policies != null && (
                        policies.contains(QEC_POLICY_OID) ||
                        policies.contains(ETSI_QCS_QC_COMPLIANCE) ||
                        policies.contains(ETSI_QCS_QC_TYPE)
                )) {
                    log.info("Certificate contains QEC policy OID");
                    return true;
                }
            }

            // Method 3: Check extended key usage for qualified signatures
            // This is a heuristic - QEC certificates might have specific EKU
            boolean[] keyUsage = cert.getKeyUsage();
            if (keyUsage != null && keyUsage.length > 1 && keyUsage[0]) { // digitalSignature
                log.info("Certificate has digital signature key usage");
            }

            return false;
        } catch (Exception e) {
            log.warn("Error checking QEC certificate attributes", e);
            return false;
        }
    }

    private String extractCertificatePolicies(X509CertificateHolder certHolder) {
        try {
            Extension ext = certHolder.getExtension(Extension.certificatePolicies);
            if (ext != null) {
                return ext.getExtnValue().toString();
            }
        } catch (Exception e) {
            log.warn("Could not extract certificate policies", e);
        }
        return null;
    }

    public List<SignatureInfo> getAllSignatures(byte[] pdfData) {
        List<SignatureInfo> signatureInfoList = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(pdfData)) {
            List<PDSignature> signatures = document.getSignatureDictionaries();

            if (signatures == null || signatures.isEmpty()) {
                return signatureInfoList;
            }

            for (PDSignature signature : signatures) {
                try {
                    SignatureInfo.SignatureInfoBuilder builder = SignatureInfo.builder()
                            .isSigned(true)
                            .isDemoSignature(false);

                    if (signature.getSignDate() != null) {
                        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                        builder.signDate(sdf.format(signature.getSignDate().getTime()));
                    }

                    if (signature.getName() != null) {
                        builder.signerName(signature.getName());
                    }

                    // Check if this is a DEMO signature
                    boolean isDemoSignature = isDemoSignature(signature);
                    builder.isDemoSignature(isDemoSignature);

                    if (isDemoSignature) {
                        builder.isValid(true)
                               .verificationStatus("DEMO signature - not cryptographically signed");
                        signatureInfoList.add(builder.build());
                        continue;
                    }

                    byte[] signatureContent = signature.getContents(pdfData);
                    byte[] signedContent = signature.getSignedContent(pdfData);

                    // Check if signature has actual content
                    if (signatureContent == null || signatureContent.length == 0) {
                        builder.isDemoSignature(true)
                               .isValid(true)
                               .verificationStatus("DEMO signature - signature dictionary without cryptographic content");
                        signatureInfoList.add(builder.build());
                        continue;
                    }

                    SignatureInfo info = verifySignatureContent(
                            signatureContent,
                            signedContent,
                            builder
                    );

                    signatureInfoList.add(info);
                } catch (Exception e) {
                    log.error("Error verifying individual signature", e);
                    signatureInfoList.add(SignatureInfo.builder()
                            .isSigned(true)
                            .isValid(false)
                            .isDemoSignature(false)
                            .verificationStatus("Error verifying signature")
                            .errorMessage(e.getMessage())
                            .build());
                }
            }

        } catch (IOException e) {
            log.error("Error reading PDF for signature list", e);
        }

        return signatureInfoList;
    }
}
