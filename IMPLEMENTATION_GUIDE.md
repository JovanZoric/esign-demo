# QEC Smart Card PDF Signing - Implementation Guide

## Production Implementation Checklist

This guide helps transition from demo to production-ready QEC smart card PDF signing.

---

## Phase 1: Smart Card Integration

### 1.1 Client Environment Setup

**Windows Configuration:**

```powershell
# Verify smart card middleware installation
certutil -scinfo

# List all certificates with private keys
certutil -store -user My

# Check smart card readers
certutil -SCInfo -silent
```

**Required Components:**
- Smart card middleware (vendor-specific)
- USB smart card reader (or built-in reader)
- QEC certificate installed on card
- Certificate chain in Trusted Root store

**Browser Setup:**
- Chrome/Edge 90+ recommended
- Enable certificate selection in browser settings
- Test certificate access in browser:
  ```javascript
  // Browser console test
  navigator.credentials.get({
    publicKey: { challenge: new Uint8Array(32) }
  })
  ```

### 1.2 Web Crypto API Integration

**Replace Demo Certificate Access:**

File: `frontend/src/services/pdfSigningService.ts`

```typescript
private async getClientCertificate(): Promise<CertificateData> {
  // Check if Web Crypto API is available
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not supported');
  }

  // Note: Direct certificate access is limited in browsers
  // Consider these approaches:

  // Option 1: Use browser's native certificate selection
  // Triggered when accessing resources requiring client certificates
  
  // Option 2: Use WebAuthn API (for newer implementations)
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      userVerification: 'required'
    }
  });

  // Option 3: Use browser extension for smart card access
  // Extension communicates with native smart card API
  
  // Option 4: Server-side signing (smart card on server)
  // Client authenticates, server signs on behalf
  
  // For most QEC scenarios, Option 3 (browser extension) 
  // or Option 4 (server-side) are most reliable
}
```

**Recommended Approach: Browser Extension**

Create a browser extension that:
1. Uses Native Messaging to communicate with native app
2. Native app accesses Windows CryptoAPI/CNG
3. Extension exposes API to web page
4. Web page calls extension to sign data

**Extension Architecture:**
```
Web Page ↔ Extension (Content Script) 
             ↔ Background Script 
             ↔ Native Host Application 
             ↔ Windows CryptoAPI 
             ↔ Smart Card
```

### 1.3 Alternative: Server-Side Signing

**When to use:**
- Smart cards managed centrally
- Better control over signing process
- Easier certificate management

**Implementation:**

Backend: `src/main/java/com/esign/service/ServerSigningService.java`

```java
@Service
public class ServerSigningService {
    
    public byte[] signPdfWithSmartCard(
        byte[] pdfData, 
        String userId
    ) throws Exception {
        // 1. User authenticates with smart card
        // 2. Server retrieves user's certificate from smart card
        // 3. Server creates signature using smart card
        
        KeyStore keyStore = KeyStore.getInstance("Windows-MY");
        keyStore.load(null, null);
        
        // Get certificate by alias (user identifier)
        X509Certificate cert = (X509Certificate) keyStore
            .getCertificate(userId);
        PrivateKey privateKey = (PrivateKey) keyStore
            .getKey(userId, null);
        
        // Sign PDF
        return createPdfSignature(pdfData, cert, privateKey);
    }
}
```

---

## Phase 2: PAdES Signature Implementation

### 2.1 Proper PDF Signature Structure

Current demo creates visible annotation. Replace with cryptographic signature.

**Key Concepts:**
- **ByteRange**: Specifies which bytes of PDF are signed
- **Signature Dictionary**: Contains signature metadata
- **PKCS#7 Container**: Contains actual signature and certificate

**Implementation Options:**

**Option A: Use Apache PDFBox (Java)**

```java
// Backend signs, frontend uploads unsigned PDF
PDDocument document = PDDocument.load(pdfBytes);
PDSignature signature = new PDSignature();

signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
signature.setSubFilter(PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
signature.setName("QEC Signer Name");
signature.setLocation("Intranet");
signature.setReason("Document approval");
signature.setSignDate(Calendar.getInstance());

// Create signature interface
SignatureInterface signatureInterface = new SignatureInterface() {
    @Override
    public byte[] sign(InputStream content) throws IOException {
        // Create PKCS#7 signature
        // Use Bouncy Castle to create CMS signed data
    }
};

// Add signature to document
document.addSignature(signature, signatureInterface);

// Save with incremental update
ByteArrayOutputStream output = new ByteArrayOutputStream();
document.saveIncremental(output);
```

**Option B: Use iText (Commercial Alternative)**

```java
PdfReader reader = new PdfReader(pdfBytes);
PdfSigner signer = new PdfSigner(reader, output, 
    new StampingProperties().useAppendMode());

PdfSignatureAppearance appearance = signer.getSignatureAppearance();
appearance.setReason("Signed with QEC");
appearance.setLocation("Intranet");

IExternalSignature pks = new PrivateKeySignature(
    privateKey, DigestAlgorithms.SHA256, "BC");

signer.signDetached(pks, chain, null, null, null, 0, 
    PdfSigner.CryptoStandard.CADES);
```

### 2.2 PAdES-B Implementation

**Minimum Requirements:**
- PDF signature dictionary
- PKCS#7 detached signature
- Complete certificate chain
- Signing time

**Backend Service:**

```java
@Service
public class PadesSigningService {
    
    public byte[] createPadesSignature(
        byte[] pdfData,
        X509Certificate certificate,
        PrivateKey privateKey
    ) throws Exception {
        
        // Load PDF
        PDDocument doc = PDDocument.load(pdfData);
        
        // Create signature
        PDSignature signature = new PDSignature();
        signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
        signature.setSubFilter(PDSignature.SUBFILTER_ETSI_CADES_DETACHED);
        
        // Set PAdES specific attributes
        Calendar signDate = Calendar.getInstance();
        signature.setSignDate(signDate);
        
        // Prepare signing
        FileOutputStream fos = new FileOutputStream(outputFile);
        
        SignatureOptions options = new SignatureOptions();
        options.setPreferredSignatureSize(
            SignatureOptions.DEFAULT_SIGNATURE_SIZE * 2);
        
        doc.addSignature(signature, new CMSSignatureInterface(), options);
        doc.saveIncremental(fos);
        
        return Files.readAllBytes(outputFile.toPath());
    }
    
    private class CMSSignatureInterface implements SignatureInterface {
        @Override
        public byte[] sign(InputStream content) throws IOException {
            // Create CMS/PKCS#7 signature
            // Include certificate chain
            // Add signed attributes (signing time, etc.)
        }
    }
}
```

### 2.3 PAdES-T (with Timestamp)

**Add Trusted Timestamp:**

```java
// Add timestamp to signature
TSAClient tsaClient = new TSAClient() {
    @Override
    public byte[] getTimeStampToken(byte[] imprint) 
        throws IOException {
        // Call RFC 3161 timestamp server
        // Return timestamp token
    }
};

// Include in signature
signature.setTimeStampClient(tsaClient);
```

**Timestamp Server Configuration:**

```yaml
# application.yml
pades:
  timestamp:
    url: "http://timestamp.server.com/tsa"
    username: "tsa_user"
    password: "***"
```

---

## Phase 3: QEC Certificate Validation

### 3.1 Update OID Constants

File: `backend/src/main/java/com/esign/service/PdfSignatureVerificationService.java`

```java
// Replace with your QEC authority's OIDs
private static final String QEC_POLICY_OID = "1.2.616.1.113527.2.5.1.1"; // Example
private static final String ETSI_QCS_QC_COMPLIANCE = "0.4.0.1862.1.1";
private static final String ETSI_QCS_QC_TYPE = "0.4.0.1862.1.6";

// Add your country-specific OIDs
private static final String POLAND_QEC_OID = "1.2.616.1.113527.2.5.1.1";
private static final String EU_QEC_OID = "0.4.0.19495.1.1";
```

**How to find your OIDs:**

```bash
# Export certificate
certutil -user -store My "Certificate Name" cert.cer

# View certificate details
certutil -dump cert.cer

# Look for:
# - Certificate Policies extension
# - QC Statements extension
# - Extended Key Usage
```

### 3.2 Certificate Chain Validation

```java
@Service
public class CertificateValidationService {
    
    public ValidationResult validateCertificateChain(
        X509Certificate cert
    ) throws Exception {
        
        // 1. Build certificate chain
        CertPathBuilder builder = CertPathBuilder.getInstance("PKIX");
        X509CertSelector selector = new X509CertSelector();
        selector.setCertificate(cert);
        
        PKIXBuilderParameters params = new PKIXBuilderParameters(
            getTrustedRootStore(), selector);
        
        // 2. Validate chain
        PKIXCertPathBuilderResult result = 
            (PKIXCertPathBuilderResult) builder.build(params);
        
        // 3. Check revocation
        checkRevocation(cert);
        
        // 4. Verify QEC policies
        boolean isQEC = checkQECPolicies(cert);
        
        return new ValidationResult(true, isQEC, result);
    }
    
    private void checkRevocation(X509Certificate cert) 
        throws Exception {
        
        // Check CRL
        X509CRL crl = getCRL(cert);
        if (crl.isRevoked(cert)) {
            throw new CertificateRevokedException(
                "Certificate has been revoked");
        }
        
        // Check OCSP
        OCSPResp ocspResp = checkOCSP(cert);
        if (ocspResp.getStatus() != OCSPResp.SUCCESSFUL) {
            throw new Exception("OCSP validation failed");
        }
    }
}
```

### 3.3 OCSP Checking

```java
public OCSPResp checkOCSP(X509Certificate cert) throws Exception {
    // Get OCSP URL from certificate AIA extension
    String ocspUrl = getOCSPUrl(cert);
    
    // Build OCSP request
    OCSPReqBuilder builder = new OCSPReqBuilder();
    CertificateID certID = new CertificateID(
        new JcaDigestCalculatorProviderBuilder().build()
            .get(CertificateID.HASH_SHA1),
        new JcaX509CertificateHolder(issuerCert),
        cert.getSerialNumber()
    );
    builder.addRequest(certID);
    OCSPReq request = builder.build();
    
    // Send request
    byte[] requestBytes = request.getEncoded();
    HttpURLConnection connection = 
        (HttpURLConnection) new URL(ocspUrl).openConnection();
    connection.setDoOutput(true);
    connection.setRequestMethod("POST");
    connection.setRequestProperty("Content-Type", 
        "application/ocsp-request");
    
    OutputStream out = connection.getOutputStream();
    out.write(requestBytes);
    out.flush();
    
    // Get response
    InputStream in = connection.getInputStream();
    return new OCSPResp(in);
}
```

---

## Phase 4: Security Hardening

### 4.1 Add Authentication

**Spring Security Configuration:**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) 
        throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/documents/**")
                    .authenticated()
                .anyRequest().permitAll()
            )
            .oauth2Login() // Or SAML, LDAP, etc.
            .csrf().disable(); // Use proper CSRF in production
        
        return http.build();
    }
}
```

### 4.2 Audit Logging

```java
@Entity
public class AuditLog {
    @Id
    @GeneratedValue
    private Long id;
    
    private String userId;
    private String action; // UPLOAD, SIGN, VERIFY, DOWNLOAD, DELETE
    private Long documentId;
    private String documentName;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String userAgent;
    private Boolean success;
    private String errorMessage;
}

@Service
public class AuditService {
    
    @Async
    public void logAction(
        String userId, 
        String action, 
        Long documentId,
        boolean success
    ) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setDocumentId(documentId);
        log.setTimestamp(LocalDateTime.now());
        log.setSuccess(success);
        
        auditRepository.save(log);
    }
}
```

### 4.3 Rate Limiting

```java
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    private final Map<String, RateLimiter> limiters = 
        new ConcurrentHashMap<>();
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String clientId = getClientId(request);
        RateLimiter limiter = limiters.computeIfAbsent(
            clientId,
            k -> RateLimiter.create(10.0) // 10 requests per second
        );
        
        if (!limiter.tryAcquire()) {
            response.setStatus(429);
            response.getWriter().write("Rate limit exceeded");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

---

## Phase 5: Production Database

### 5.1 PostgreSQL Setup

**Update application.yml:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/esign
    username: esignuser
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate  # Use Flyway for migrations
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

**Add dependencies:**

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>

<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
```

### 5.2 Database Migration

**Create migration:** `src/main/resources/db/migration/V1__initial_schema.sql`

```sql
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP NOT NULL,
    is_signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_date TIMESTAMP,
    signer_name VARCHAR(1000),
    signer_certificate_issuer VARCHAR(1000),
    certificate_serial_number VARCHAR(2000),
    signature_algorithm VARCHAR(500),
    is_qec_certificate BOOLEAN,
    certificate_policies VARCHAR(2000),
    verification_status VARCHAR(2000),
    file_size BIGINT NOT NULL,
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_signed ON documents(is_signed);
CREATE INDEX idx_documents_qec ON documents(is_qec_certificate);
CREATE INDEX idx_documents_upload_date ON documents(upload_date DESC);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    document_id BIGINT,
    document_name VARCHAR(255),
    timestamp TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

---

## Phase 6: Deployment

### 6.1 Production Build

**Backend:**
```bash
cd backend

# Using Maven Wrapper (recommended)
./mvnw clean package -DskipTests

# Or using installed Maven
mvn clean package -DskipTests
```

**Frontend:**
```bash
cd frontend
npm run build
```

### 6.2 Docker Deployment

**Dockerfile (Backend):**
```dockerfile
FROM openjdk:17-jdk-slim
COPY target/qec-signing-demo-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**Dockerfile (Frontend):**
```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: esign
      POSTGRES_USER: esignuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/esign
      SPRING_DATASOURCE_USERNAME: esignuser
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      APP_STORAGE_LOCATION: /var/esign/uploads
    volumes:
      - esign-uploads:/var/esign/uploads
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres-data:
  esign-uploads:
```

---

## Testing Checklist

- [ ] Smart card detected by OS
- [ ] Certificate visible in browser
- [ ] PIN prompt appears
- [ ] Signature created successfully
- [ ] Signature verifies correctly
- [ ] QEC certificate detected
- [ ] Certificate chain validates
- [ ] OCSP check succeeds
- [ ] Audit log created
- [ ] Rate limiting works
- [ ] Authentication required
- [ ] HTTPS enforced

---

## Support Resources

**Standards:**
- ETSI EN 319 122 (CAdES)
- ETSI EN 319 142 (PAdES)
- RFC 3161 (Timestamping)
- RFC 5280 (X.509 Certificates)

**Libraries:**
- Apache PDFBox Documentation
- Bouncy Castle API
- Web Crypto API Specification

**QEC Authorities (Examples):**
- Poland: Krajowa Izba Rozliczeniowa (KIR)
- EU: eIDAS regulation compliance

---

This guide provides the foundation for production QEC signing. Customize based on your specific requirements and certificate authority.
