package com.esign.controller;

import com.esign.dto.DocumentDTO;
import com.esign.dto.SignatureInfo;
import com.esign.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "requiredSignatures", defaultValue = "1") Integer requiredSignatures
    ) {
        log.info("Uploading document: {}", file.getOriginalFilename());

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (!file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }

        DocumentDTO document = documentService.uploadDocument(file, requiredSignatures);
        return ResponseEntity.ok(document);
    }

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getAllDocuments() {
        List<DocumentDTO> documents = documentService.getAllDocuments();
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}/metadata")
    public ResponseEntity<DocumentDTO> getDocumentMetadata(@PathVariable Long id) {
        DocumentDTO document = documentService.getDocumentMetadata(id);
        return ResponseEntity.ok(document);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        DocumentDTO metadata = documentService.getDocumentMetadata(id);
        byte[] content = documentService.getDocumentContent(id);

        ByteArrayResource resource = new ByteArrayResource(content);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + metadata.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(content.length)
                .body(resource);
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> getDocumentContent(@PathVariable Long id) {
        byte[] content = documentService.getDocumentContent(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }

    @PostMapping("/{id}/verify-signature")
    public ResponseEntity<SignatureInfo> verifySignature(@PathVariable Long id) {
        log.info("Verifying signature for document ID: {}", id);
        SignatureInfo signatureInfo = documentService.verifySignature(id);
        return ResponseEntity.ok(signatureInfo);
    }

    @PostMapping("/{id}/update-signed")
    public ResponseEntity<DocumentDTO> updateSignedDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        log.info("Updating document {} with signed version", id);

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (!file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }

        DocumentDTO document = documentService.updateDocumentAfterSigning(id, file);
        return ResponseEntity.ok(document);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Document deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "QEC Signing Demo");
        return ResponseEntity.ok(response);
    }
}
