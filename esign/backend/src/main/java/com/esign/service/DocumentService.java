package com.esign.service;

import com.esign.dto.DocumentDTO;
import com.esign.dto.SignatureInfo;
import com.esign.model.Document;
import com.esign.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final PdfSignatureVerificationService signatureVerificationService;

    @Transactional
    public DocumentDTO uploadDocument(MultipartFile file) {
        try {
            // Store file
            String storedFilename = fileStorageService.store(file);

            // Create document entity
            Document document = Document.builder()
                    .filename(file.getOriginalFilename())
                    .filePath(storedFilename)
                    .uploadDate(LocalDateTime.now())
                    .isSigned(false)
                    .fileSize(file.getSize())
                    .build();

            // Check if PDF has existing signature
            byte[] fileBytes = file.getBytes();
            SignatureInfo signatureInfo = signatureVerificationService.verifyPdfSignature(fileBytes);

            if (signatureInfo.getIsSigned()) {
                updateDocumentWithSignatureInfo(document, signatureInfo);
            }

            document = documentRepository.save(document);
            log.info("Document uploaded: {} (ID: {})", file.getOriginalFilename(), document.getId());

            return toDTO(document);
        } catch (Exception e) {
            log.error("Error uploading document", e);
            throw new RuntimeException("Failed to upload document", e);
        }
    }

    @Transactional(readOnly = true)
    public DocumentDTO getDocumentMetadata(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        return toDTO(document);
    }

    @Transactional(readOnly = true)
    public byte[] getDocumentContent(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));
        return fileStorageService.readFileBytes(document.getFilePath());
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> getAllDocuments() {
        return documentRepository.findByOrderByUploadDateDesc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SignatureInfo verifySignature(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        byte[] fileBytes = fileStorageService.readFileBytes(document.getFilePath());
        SignatureInfo signatureInfo = signatureVerificationService.verifyPdfSignature(fileBytes);

        // Update document with signature information
        if (signatureInfo.getIsSigned()) {
            updateDocumentWithSignatureInfo(document, signatureInfo);
            documentRepository.save(document);
        }

        return signatureInfo;
    }

    @Transactional
    public DocumentDTO updateDocumentAfterSigning(Long id, MultipartFile signedFile) {
        try {
            Document document = documentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Document not found: " + id));

            // Delete old file
            fileStorageService.delete(document.getFilePath());

            // Store new signed file
            String storedFilename = fileStorageService.store(signedFile);
            document.setFilePath(storedFilename);
            document.setFileSize(signedFile.getSize());

            // Verify signature
            byte[] fileBytes = signedFile.getBytes();
            SignatureInfo signatureInfo = signatureVerificationService.verifyPdfSignature(fileBytes);

            if (signatureInfo.getIsSigned()) {
                updateDocumentWithSignatureInfo(document, signatureInfo);
            }

            document = documentRepository.save(document);
            log.info("Document updated with signed version: {} (ID: {})", document.getFilename(), id);

            return toDTO(document);
        } catch (Exception e) {
            log.error("Error updating signed document", e);
            throw new RuntimeException("Failed to update signed document", e);
        }
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        fileStorageService.delete(document.getFilePath());
        documentRepository.delete(document);
        log.info("Document deleted: {} (ID: {})", document.getFilename(), id);
    }

    private void updateDocumentWithSignatureInfo(Document document, SignatureInfo signatureInfo) {
        document.setIsSigned(true);
        document.setSignerName(signatureInfo.getSignerName());
        document.setSignerCertificateIssuer(signatureInfo.getSignerCertificateIssuer());
        document.setCertificateSerialNumber(signatureInfo.getCertificateSerialNumber());
        document.setSignatureAlgorithm(signatureInfo.getSignatureAlgorithm());
        document.setIsQecCertificate(signatureInfo.getIsQecCertificate());
        document.setIsDemoSignature(signatureInfo.getIsDemoSignature());
        document.setCertificatePolicies(signatureInfo.getCertificatePolicies());
        document.setVerificationStatus(signatureInfo.getVerificationStatus());

        if (signatureInfo.getSignDate() != null) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                document.setSignedDate(LocalDateTime.parse(signatureInfo.getSignDate(), formatter));
            } catch (Exception e) {
                log.warn("Could not parse sign date: {}", signatureInfo.getSignDate());
                document.setSignedDate(LocalDateTime.now());
            }
        }
    }

    private DocumentDTO toDTO(Document document) {
        return DocumentDTO.builder()
                .id(document.getId())
                .filename(document.getFilename())
                .uploadDate(document.getUploadDate())
                .isSigned(document.getIsSigned())
                .signedDate(document.getSignedDate())
                .signerName(document.getSignerName())
                .signerCertificateIssuer(document.getSignerCertificateIssuer())
                .certificateSerialNumber(document.getCertificateSerialNumber())
                .signatureAlgorithm(document.getSignatureAlgorithm())
                .isQecCertificate(document.getIsQecCertificate())
                .isDemoSignature(document.getIsDemoSignature())
                .certificatePolicies(document.getCertificatePolicies())
                .verificationStatus(document.getVerificationStatus())
                .fileSize(document.getFileSize())
                .build();
    }
}
