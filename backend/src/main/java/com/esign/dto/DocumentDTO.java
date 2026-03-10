package com.esign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {
    private Long id;
    private String filename;
    private LocalDateTime uploadDate;
    private Boolean isSigned;
    private LocalDateTime signedDate;
    private String signerName;
    private String signerCertificateIssuer;
    private String certificateSerialNumber;
    private String signatureAlgorithm;
    private Boolean isQecCertificate;
    private Boolean isDemoSignature;
    private String certificatePolicies;
    private String verificationStatus;
    private Long fileSize;
}
