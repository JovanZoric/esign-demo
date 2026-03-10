package com.esign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class SignatureInfo {
    private Boolean isSigned;
    private Integer requiredSignatures;
    private Integer signatureCount;
    private Boolean isPartiallySigned;
    private String signerName;
    private String signerCertificateIssuer;
    private String certificateSerialNumber;
    private String signatureAlgorithm;
    private String signDate;
    private Boolean isQecCertificate;
    private String certificatePolicies;
    private Boolean isValid;
    private Boolean isDemoSignature;
    private String verificationStatus;
    private String errorMessage;
}
