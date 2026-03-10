# QEC Smart Card PDF Signing Demo

Complete demonstration application for integrating QEC (Qualified Electronic Certificate) smart card PDF signing in a web-based intranet environment.

## Overview

This demo showcases how to implement end-to-end PDF signing with QEC smart cards:

- **Client-side signing**: Sign PDFs in the browser using smart card certificates
- **Server-side verification**: Verify signatures and detect QEC certificates
- **Document management**: Track signing status and certificate details
- **Intranet deployment**: No external SaaS dependencies

## Project Structure

```
esign/
├── backend/                 # Spring Boot Java backend
│   ├── src/main/java/
│   │   └── com/esign/
│   │       ├── config/      # Configuration classes
│   │       ├── controller/  # REST API endpoints
│   │       ├── dto/         # Data transfer objects
│   │       ├── model/       # JPA entities
│   │       ├── repository/  # Database repositories
│   │       └── service/     # Business logic
│   ├── src/main/resources/
│   │   └── application.yml  # Application configuration
│   ├── pom.xml             # Maven dependencies
│   └── README.md           # Backend documentation
│
└── frontend/               # React TypeScript frontend
    ├── src/
    │   ├── components/     # React components
    │   ├── services/       # Business logic
    │   ├── api.ts         # API client
    │   ├── types.ts       # TypeScript types
    │   ├── App.tsx        # Main application
    │   └── main.tsx       # Entry point
    ├── package.json       # npm dependencies
    ├── vite.config.ts    # Vite configuration
    └── README.md         # Frontend documentation
```

## Quick Start

### Prerequisites

- Java 17 or higher
- Node.js 18 or higher
- npm or yarn

**Note:** Maven is optional - the project includes Maven Wrapper (`mvnw`/`mvnw.cmd`)

### Backend Setup

**Using Maven Wrapper (no Maven installation needed):**
```bash
cd backend

# Windows
mvnw.cmd clean install
mvnw.cmd spring-boot:run

# Linux/Mac
./mvnw clean install
./mvnw spring-boot:run
```

**Or using installed Maven:**
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend will start on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:3000`

### Access the Application

Open your browser and navigate to `http://localhost:3000`

## Features

### ✅ Implemented

1. **PDF Upload**
   - Drag-and-drop interface
   - Automatic signature detection on upload
   - File size validation
   - Format validation (PDF only)

2. **Signature Verification**
   - Parse PKCS#7/CMS signatures from PDFs
   - Extract certificate information
   - Detect QEC certificates by policy OIDs
   - Display verification status

3. **Document Management**
   - List all documents with status
   - View PDFs in browser
   - Download documents
   - Delete documents
   - Track upload and signing dates

4. **PDF Viewing**
   - Render PDFs using pdf.js
   - Zoom controls
   - Page navigation
   - Responsive layout

5. **Demo Signing**
   - Client-side visible signature annotation
   - Demonstrates signing workflow
   - Shows where real QEC signing would integrate

### 🚧 Production Requirements

For production deployment with real QEC smart cards:

1. **Web Crypto API Integration**
   - Replace demo signing with real certificate access
   - Implement smart card PIN entry
   - Handle certificate selection

2. **PAdES Signature Format**
   - Implement proper PDF signature embedding
   - Add ByteRange calculation
   - Create valid PKCS#7 detached signatures

3. **Certificate Validation**
   - Full certificate chain verification
   - OCSP/CRL revocation checking
   - QEC policy validation

4. **Security Hardening**
   - Add authentication/authorization
   - Implement HTTPS
   - Add audit logging
   - Rate limiting
   - Input sanitization

5. **Production Database**
   - Replace H2 with PostgreSQL/MySQL
   - Add connection pooling
   - Implement backup strategy

## Architecture

### Client-Side Architecture

```
User Action → React Component → Service Layer → API Client → Backend
                     ↓
              PDF.js (viewing)
              PDF-lib (manipulation)
              Node-forge (crypto)
```

### Server-Side Architecture

```
HTTP Request → Controller → Service → Repository → Database
                              ↓
                        PDFBox (verification)
                        Bouncy Castle (crypto)
```

### Signing Workflow

```
1. User uploads PDF
2. Frontend displays document
3. User clicks "Sign"
4. [DEMO] Visible signature added
   [PRODUCTION] Smart card certificate selected
5. [DEMO] Annotated PDF created
   [PRODUCTION] Cryptographic signature created
6. Signed PDF uploaded to server
7. Server verifies signature
8. Database updated with signature info
9. Frontend displays verification results
```

## QEC Certificate Detection

The backend detects QEC certificates by checking:

1. **QC Statements Extension**
   - OID: `1.3.6.1.5.5.7.1.3`
   - Presence indicates qualified certificate

2. **Certificate Policies**
   - `0.4.0.194121.1.1` - Example QC policy OID
   - `0.4.0.1862.1.1` - ETSI QC compliance
   - `0.4.0.1862.1.6` - ETSI QC type

3. **Key Usage**
   - Must have digitalSignature bit set

**⚠️ Important**: Update OID constants in `PdfSignatureVerificationService.java` to match your QEC certificate authority's policies.

## API Documentation

### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: (binary PDF file)

Response: DocumentDTO with metadata
```

### Verify Signature
```http
POST /api/documents/{id}/verify-signature

Response: SignatureInfo with verification details
```

### Update Signed Document
```http
POST /api/documents/{id}/update-signed
Content-Type: multipart/form-data

file: (binary signed PDF file)

Response: Updated DocumentDTO
```

See [backend/README.md](backend/README.md) for complete API documentation.

## Smart Card Integration Guide

### Windows Setup

1. **Install Smart Card Middleware**
   ```
   - Gemalto (Thales) SafeNet Authentication Client
   - Oberthur ID-One PIV
   - Or vendor-specific middleware
   ```

2. **Verify Certificate Installation**
   ```bash
   # Open Certificate Manager
   certmgr.msc
   
   # Check smart card certificate
   certutil -scinfo
   ```

3. **Test Certificate Access**
   ```bash
   # List certificates with private keys
   certutil -store -user My
   ```

### Browser Configuration

**Chrome/Edge (Recommended)**
- Settings → Privacy and Security → Security → Manage Certificates
- Verify certificate appears in "Personal" tab
- Ensure "Enable smart card support" is checked

**Firefox**
- Settings → Privacy & Security → Certificates → Security Devices
- Add PKCS#11 module for your smart card

### Code Integration Points

**Frontend (src/services/pdfSigningService.ts)**
```typescript
// Replace this method:
private async getClientCertificate() {
  // Current: Demo certificate
  // TODO: Implement Web Crypto API call
  const certs = await window.crypto.subtle.getCertificates?.();
  // User selects certificate
  // Browser prompts for PIN
}
```

**Update Signing Call (src/components/DocumentViewer.tsx)**
```typescript
// Replace demo signing:
const signingService = new PdfSigningService();
const result = await signingService.signPdfWithCertificate(pdfData);
const signedPdfBytes = result.signedPdf;
```

## Testing

### Backend Tests

```bash
cd backend
mvn test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Scenarios

1. **Upload Unsigned PDF**
   - Should show "Unsigned" badge
   - Sign button should be available

2. **Upload Pre-Signed PDF**
   - Should detect signature automatically
   - Show signer details
   - Display QEC badge if applicable

3. **Sign Document**
   - Click sign button
   - Document should update with signature
   - Verification should show valid signature

4. **Verify Signature**
   - Click verify on signed document
   - Should display certificate details
   - QEC status should be correct

## Deployment

### Development

Both frontend and backend run on localhost with CORS enabled.

### Production Considerations

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   mvn clean package
   java -jar target/qec-signing-demo-1.0.0.jar
   ```

3. **Web Server**
   - Serve frontend build from nginx/Apache
   - Proxy `/api` to backend
   - Enable HTTPS with valid certificate

4. **Database**
   - Configure PostgreSQL/MySQL
   - Update `application.yml`
   - Run database migrations

5. **Environment Variables**
   ```bash
   export APP_STORAGE_LOCATION=/var/esign/uploads
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/esign
   export SPRING_DATASOURCE_USERNAME=esignuser
   export SPRING_DATASOURCE_PASSWORD=***
   ```

## Configuration

### Backend (application.yml)

```yaml
app:
  storage:
    location: ./uploads  # PDF storage path
  signature:
    verify-on-upload: true  # Auto-verify on upload

spring:
  servlet:
    multipart:
      max-file-size: 50MB  # Max upload size
```

### Frontend (vite.config.ts)

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8080'  # Backend URL
  }
}
```

## Known Limitations

### Demo Mode
- Signing creates visible annotation, not cryptographic signature
- Uses demo certificate, not real smart card
- Signature verification is simulated

### Browser Support
- Smart card access requires Chrome/Edge on Windows
- Firefox has limited Web Crypto API support
- Safari not supported for smart card access

### Security
- No authentication/authorization
- CORS open for development
- H2 in-memory database (data lost on restart)
- No rate limiting
- Minimal error handling

## Troubleshooting

### Backend Won't Start
- Check Java version: `java -version` (need 17+)
- Verify port 8080 is free: `netstat -ano | findstr :8080`
- Check logs in console

### Frontend Won't Start
- Check Node version: `node -v` (need 18+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Verify port 3000 is free

### Upload Fails
- Check backend console for errors
- Verify file is valid PDF
- Check file size under limit (50MB)

### Signature Not Detected
- Ensure PDF has valid PKCS#7 signature
- Check signature is not corrupted
- Verify Apache PDFBox can read signature format

### Smart Card Not Working
- Install smart card middleware
- Check certificate in Windows store
- Try `certutil -scinfo` to test
- Ensure browser has permission

## Contributing

This is a demo application. For production use, please:
1. Complete the Web Crypto API integration
2. Implement proper PAdES signatures
3. Add comprehensive security measures
4. Include full test coverage
5. Add monitoring and logging

## License

Demo application for educational purposes.

## Support

For questions or issues:
1. Check the README files in backend/ and frontend/ directories
2. Review the code comments
3. Consult the inline documentation
4. Test with the provided demo scenarios

## Next Steps

To complete production implementation:

1. **Smart Card Integration**
   - Implement Web Crypto API certificate access
   - Test with real QEC smart card
   - Handle PIN entry and errors

2. **PAdES Compliance**
   - Implement proper PDF signature embedding
   - Add timestamp server integration
   - Include revocation data (OCSP/CRL)

3. **Security**
   - Add user authentication (OAuth2/SAML)
   - Implement role-based access control
   - Enable HTTPS
   - Add comprehensive audit logging

4. **Production Database**
   - Set up PostgreSQL/MySQL
   - Create migration scripts
   - Implement backup strategy

5. **Monitoring**
   - Add application metrics
   - Implement health checks
   - Set up error tracking
   - Create dashboards

6. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Deployment guide
   - User manual
   - Administrator guide
