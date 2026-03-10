# QEC Smart Card PDF Signing Demo - Backend

Spring Boot backend application for QEC smart card PDF signing integration.

## Features

- **PDF Upload**: Upload PDF documents with automatic signature detection
- **Signature Verification**: Verify PDF signatures and detect QEC certificates
- **Document Management**: Track document metadata and signing status
- **File Storage**: Store PDFs on filesystem with H2 database for metadata

## Technology Stack

- Java 17
- Spring Boot 3.2.3
- Spring Data JPA
- H2 Database (in-memory)
- Apache PDFBox 3.0.1 (PDF signature verification)
- Bouncy Castle (cryptographic operations)
- Lombok

## API Endpoints

### Document Management

- `POST /api/documents/upload` - Upload a PDF document
  - Request: multipart/form-data with `file` parameter
  - Response: DocumentDTO with metadata

- `GET /api/documents` - Get all documents
  - Response: List of DocumentDTO

- `GET /api/documents/{id}/metadata` - Get document metadata
  - Response: DocumentDTO

- `GET /api/documents/{id}/content` - Get document content
  - Response: PDF file bytes

- `GET /api/documents/{id}/download` - Download document
  - Response: PDF file as attachment

### Signature Operations

- `POST /api/documents/{id}/verify-signature` - Verify document signature
  - Response: SignatureInfo with verification details

- `POST /api/documents/{id}/update-signed` - Upload signed version of document
  - Request: multipart/form-data with `file` parameter
  - Response: DocumentDTO with updated metadata

### Utility

- `GET /api/documents/health` - Health check endpoint

- `GET /api/h2-console` - H2 Database console (development only)

## Running the Application

### Prerequisites

- Java 17 or higher
- Maven 3.6+ (or use the included Maven Wrapper)

### Build and Run

**Using Maven Wrapper (recommended - no Maven installation required):**

```bash
cd backend

# Windows
mvnw.cmd clean install
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw clean install
./mvnw spring-boot:run
```

**Using installed Maven:**

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

### Configuration

Edit `src/main/resources/application.yml`:

```yaml
app:
  storage:
    location: ./uploads  # PDF storage directory
  signature:
    verify-on-upload: true  # Automatically verify signatures on upload
```

## QEC Certificate Detection

The application detects QEC (Qualified Electronic Certificate) by checking:

1. **QC Statements Extension**: Presence of qCStatements in certificate
2. **Certificate Policies**: Specific OIDs for QEC compliance:
   - `0.4.0.194121.1.1` (Example QC statement OID)
   - `0.4.0.1862.1.1` (ETSI QC compliance)
   - `0.4.0.1862.1.6` (ETSI QC type)
3. **Key Usage**: Digital signature capability

**Note**: Update OIDs in `PdfSignatureVerificationService.java` to match your QEC certificate authority.

## Database Schema

### Document Entity

```sql
CREATE TABLE documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL,
    is_signed BOOLEAN NOT NULL,
    signed_date TIMESTAMP,
    signer_name VARCHAR(1000),
    signer_certificate_issuer VARCHAR(1000),
    certificate_serial_number VARCHAR(2000),
    signature_algorithm VARCHAR(500),
    is_qec_certificate BOOLEAN,
    certificate_policies VARCHAR(2000),
    verification_status VARCHAR(2000),
    file_size BIGINT NOT NULL
);
```

## Security Considerations

⚠️ **This is a demo application. For production use:**

1. Add authentication and authorization
2. Restrict CORS to specific origins
3. Implement file upload validation and sanitization
4. Add certificate revocation checking (OCSP/CRL)
5. Use persistent database (PostgreSQL, MySQL)
6. Implement audit logging
7. Add rate limiting
8. Use HTTPS only
9. Validate certificate chain completely
10. Store files in secure location with encryption

## Development

### H2 Console

Access the H2 database console at `http://localhost:8080/api/h2-console`

- JDBC URL: `jdbc:h2:mem:esigndb`
- Username: `sa`
- Password: (empty)

### Testing Signature Verification

Upload a pre-signed PDF to test signature verification:

```bash
curl -X POST http://localhost:8080/api/documents/upload \
  -F "file=@signed-document.pdf"
```

## Troubleshooting

### Common Issues

1. **Upload directory not created**: Application automatically creates `./uploads` on startup
2. **PDF signature not detected**: Ensure PDF is signed with PKCS#7/CMS signature
3. **QEC not detected**: Update OID constants in `PdfSignatureVerificationService` to match your CA
4. **File too large**: Adjust `spring.servlet.multipart.max-file-size` in application.yml

## License

Demo application for educational purposes.
