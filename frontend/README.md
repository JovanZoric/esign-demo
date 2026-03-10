# QEC Smart Card PDF Signing Demo - Frontend

React TypeScript frontend for QEC smart card PDF signing demonstration.

## Features

- **PDF Upload**: Drag-and-drop or browse to upload PDF documents
- **PDF Viewer**: View PDFs using pdf.js with zoom and navigation controls
- **Client-Side Signing**: Sign PDFs in the browser (demo mode with visible signatures)
- **Signature Verification**: Display signature details and QEC certificate status
- **Document Management**: List, view, download, and delete documents

## Technology Stack

- React 18
- TypeScript
- Vite (build tool)
- pdf.js (PDF rendering)
- pdf-lib (PDF manipulation)
- node-forge (cryptographic operations)
- Axios (HTTP client)

## Components

### Core Components

- **App.tsx**: Main application component
- **FileUpload.tsx**: Drag-and-drop file upload
- **DocumentList.tsx**: Display all documents with status badges
- **DocumentViewer.tsx**: Modal viewer for PDF documents
- **PdfViewer.tsx**: PDF rendering with controls using pdf.js
- **SignatureDetails.tsx**: Display signature verification information

### Services

- **api.ts**: API client for backend communication
- **pdfSigningService.ts**: Client-side PDF signing logic

## Installation

```bash
cd frontend
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Configuration

The frontend is configured to proxy API requests to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

## Client-Side Signing Implementation

### Demo Mode (Current Implementation)

The current implementation demonstrates the signing workflow using visible signature annotations:

```typescript
// Creates a visible text signature on the PDF
await addVisibleSignature(pdfBytes, signerName);
```

### Production Implementation with QEC Smart Card

For production use with real QEC smart cards, implement the following:

#### 1. Access Smart Card Certificate

```typescript
// Use Web Crypto API to access certificates from Windows store
const certs = await window.crypto.subtle.getCertificates?.();

// User selects their QEC certificate via browser UI
// Browser prompts for smart card PIN via native OS dialog
```

#### 2. Create Cryptographic Signature

```typescript
const signingService = new PdfSigningService();
const result = await signingService.signPdfWithCertificate(pdfBytes);
```

#### 3. Prerequisites for Smart Card Access

**Windows Configuration:**
1. Install smart card middleware (e.g., Gemalto, Oberthur, etc.)
2. Ensure certificate is in Windows Certificate Store
3. Test certificate access with: `certmgr.msc`

**Browser Requirements:**
- Use Chrome/Edge on Windows (best Web Crypto API support)
- Enable certificate access in browser settings
- May require browser extension depending on smart card vendor

**Certificate Requirements:**
- Certificate must have digitalSignature key usage
- Private key must be marked as non-exportable
- Certificate chain must be trusted

#### 4. Update Signing Code

Replace the demo signing in `DocumentViewer.tsx`:

```typescript
// Current (demo):
const signedPdfBytes = await addVisibleSignature(pdfData, signerName);

// Production (real QEC):
const signingService = new PdfSigningService();
const result = await signingService.signPdfWithCertificate(pdfData);
const signedPdfBytes = result.signedPdf;
```

#### 5. PAdES Signature Format

For compliance, implement PAdES (PDF Advanced Electronic Signatures):

- **PAdES-B**: Basic level (signature + certificate)
- **PAdES-T**: With trusted timestamp
- **PAdES-LT**: Long-term validation (includes revocation data)
- **PAdES-LTA**: Long-term archival

Consider using a specialized library like:
- SignPDF (npm package)
- Adobe PDF Library
- Custom implementation with proper ByteRange handling

## API Endpoints Used

- `POST /api/documents/upload` - Upload PDF
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}/content` - Get PDF content
- `GET /api/documents/{id}/download` - Download PDF
- `POST /api/documents/{id}/verify-signature` - Verify signature
- `POST /api/documents/{id}/update-signed` - Upload signed PDF
- `DELETE /api/documents/{id}` - Delete document

## Browser Compatibility

### Recommended
- Chrome 90+ (Windows)
- Edge 90+ (Windows)

### Supported
- Firefox 88+ (limited smart card support)
- Safari 14+ (macOS only, limited features)

### Smart Card Access
Smart card access via Web Crypto API works best on:
- Chrome/Edge on Windows with proper middleware
- May require browser extensions for certain smart card types

## Security Considerations

⚠️ **This is a demo application. For production:**

1. **Certificate Validation**: Implement full certificate chain validation
2. **Revocation Checking**: Check OCSP/CRL before accepting signatures
3. **Timestamp Server**: Add trusted timestamps to signatures
4. **HTTPS Only**: Always use HTTPS in production
5. **Content Security Policy**: Implement strict CSP headers
6. **Input Validation**: Validate all file uploads
7. **Rate Limiting**: Prevent abuse of signing operations
8. **Audit Logging**: Log all signing attempts
9. **Error Handling**: Don't expose sensitive error details
10. **Authentication**: Require user authentication before signing

## Troubleshooting

### PDF.js Worker Error
If you see worker-related errors, ensure the worker path is correct:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

### Smart Card Not Detected
1. Check smart card middleware is installed
2. Verify certificate in Windows Certificate Store
3. Test with `certutil -scinfo`
4. Ensure browser has permission to access certificates
5. Try different browser (Chrome/Edge recommended)

### CORS Errors
Backend must allow frontend origin:
```java
@CrossOrigin(origins = "http://localhost:3000")
```

### Upload Fails
- Check file size limits in backend configuration
- Ensure PDF is valid format
- Check browser console for detailed errors

## Development Tips

### Hot Module Replacement
Vite provides fast HMR. Changes to components will update instantly.

### TypeScript Errors
Run type checking:
```bash
npm run build
```

### Debugging
Use React Developer Tools browser extension for component inspection.

## License

Demo application for educational purposes.
