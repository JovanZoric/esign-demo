package com.esign.repository;

import com.esign.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findByIsSigned(Boolean isSigned);
    
    List<Document> findByIsQecCertificate(Boolean isQec);
    
    List<Document> findByOrderByUploadDateDesc();
}
