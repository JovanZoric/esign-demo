package com.esign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private LocalDateTime uploadDate;

    @Column(nullable = false)
    private Boolean isSigned;

    @Column(nullable = false)
    @Builder.Default
    private Integer requiredSignatures = 1;

    @Column(nullable = false)
    @Builder.Default
    private Integer signatureCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPartiallySigned = false;

    private LocalDateTime signedDate;

    @Column(length = 1000)
    private String signerName;

    @Column(length = 1000)
    private String signerCertificateIssuer;

    @Column(length = 2000)
    private String certificateSerialNumber;

    @Column(length = 500)
    private String signatureAlgorithm;

    private Boolean isQecCertificate;

    private Boolean isDemoSignature;

    @Column(length = 2000)
    private String certificatePolicies;

    @Column(length = 2000)
    private String verificationStatus;

    @Column(nullable = false)
    private Long fileSize;

    @PrePersist
    protected void onCreate() {
        if (uploadDate == null) {
            uploadDate = LocalDateTime.now();
        }
        if (isSigned == null) {
            isSigned = false;
        }
        if (requiredSignatures == null) {
            requiredSignatures = 1;
        }
        if (signatureCount == null) {
            signatureCount = 0;
        }
        if (isPartiallySigned == null) {
            isPartiallySigned = false;
        }
    }
}
