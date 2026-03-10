import { PDFDocument, PDFName, PDFHexString, PDFDict, PDFArray } from 'pdf-lib';
import forge from 'node-forge';

interface SignatureResult {
  signedPdf: Uint8Array;
  signerName: string;
  certificateInfo: string;
}

/**
 * Client-side PDF signing service
 * 
 * IMPORTANT: This demonstrates the client-side signing workflow.
 * In a real implementation with QEC smart cards, you would:
 * 1. Use Web Crypto API to access certificates from Windows certificate store
 * 2. The smart card middleware must be installed and configured
 * 3. The browser will prompt for smart card PIN via native OS dialog
 * 
 * For demo purposes, this creates a self-signed certificate.
 * To use with real QEC smart card, replace getClientCertificate() with Web Crypto API calls.
 */
export class PdfSigningService {
  
  /**
   * Sign a PDF document with client certificate
   */
  async signPdfWithCertificate(pdfBytes: Uint8Array): Promise<SignatureResult> {
    try {
      // Get client certificate (from smart card in production)
      const certData = await this.getClientCertificate();
      
      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Create signature placeholder
      const signaturePlaceholder = this.createSignaturePlaceholder(certData.certificate);
      
      // Prepare PDF for signing
      const preparedPdf = await this.preparePdfForSigning(pdfDoc, signaturePlaceholder);
      
      // Calculate hash of PDF content
      const dataToSign = preparedPdf.contentToSign;
      
      // Sign the hash with private key
      const signature = this.signData(dataToSign, certData.privateKey);
      
      // Create PKCS#7 signature
      const pkcs7Signature = this.createPkcs7Signature(
        signature,
        certData.certificate,
        dataToSign
      );
      
      // Embed signature into PDF
      const signedPdf = this.embedSignature(preparedPdf.pdf, pkcs7Signature);
      
      return {
        signedPdf,
        signerName: this.getCertificateSubject(certData.certificate),
        certificateInfo: this.getCertificateInfo(certData.certificate)
      };
      
    } catch (error) {
      console.error('PDF signing error:', error);
      throw new Error(`Failed to sign PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get client certificate from Windows certificate store
   * 
   * PRODUCTION IMPLEMENTATION:
   * This should use Web Crypto API to access smart card certificates:
   * 
   * const certs = await window.crypto.subtle.getCertificates?.();
   * // User selects certificate via browser UI
   * // Browser prompts for smart card PIN
   * 
   * For now, this creates a demo self-signed certificate.
   */
  private async getClientCertificate(): Promise<{ certificate: forge.pki.Certificate, privateKey: forge.pki.PrivateKey }> {
    // Generate demo certificate (replace with Web Crypto API for smart card)
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [
      { name: 'commonName', value: 'Demo QEC User' },
      { name: 'countryName', value: 'PL' },
      { name: 'organizationName', value: 'Demo Organization' },
      { shortName: 'OU', value: 'QEC Demo' }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Self-sign
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    return {
      certificate: cert,
      privateKey: keys.privateKey
    };
  }

  /**
   * Create signature placeholder in PDF
   */
  private createSignaturePlaceholder(certificate: forge.pki.Certificate): any {
    const subject = this.getCertificateSubject(certificate);
    
    return {
      name: subject,
      reason: 'Document signed with QEC smart card',
      location: 'Intranet',
      contactInfo: '',
      date: new Date()
    };
  }

  /**
   * Prepare PDF for signing by adding signature dictionary
   */
  private async preparePdfForSigning(
    pdfDoc: PDFDocument,
    _placeholder: any
  ): Promise<{ pdf: Uint8Array, contentToSign: Uint8Array }> {
    // For simplicity, we'll create a basic signed PDF structure
    // In production, use proper PDF signing libraries that handle ByteRange correctly
    
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    
    // This is a simplified version - real implementation needs proper ByteRange handling
    return {
      pdf: pdfBytes,
      contentToSign: pdfBytes
    };
  }

  /**
   * Sign data with private key
   */
  private signData(data: Uint8Array, privateKey: forge.pki.PrivateKey): Uint8Array {
    const md = forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(data));
    
    const signature = (privateKey as any).sign(md);
    return new Uint8Array(forge.util.binary.raw.decode(signature));
  }

  /**
   * Create PKCS#7 signature structure
   */
  private createPkcs7Signature(
    _signature: Uint8Array,
    certificate: forge.pki.Certificate,
    data: Uint8Array
  ): Uint8Array {
    const p7 = forge.pkcs7.createSignedData();
    
    p7.content = forge.util.createBuffer(forge.util.binary.raw.encode(data));
    p7.addCertificate(certificate);
    
    p7.addSigner({
      key: certificate.publicKey as any,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date().toISOString()
        }
      ]
    });
    
    // Note: This is simplified. In production, properly sign with actual private key
    const der = forge.asn1.toDer(p7.toAsn1() as any).getBytes();
    return new Uint8Array(forge.util.binary.raw.decode(der));
  }

  /**
   * Embed signature into PDF
   */
  private embedSignature(pdfBytes: Uint8Array, _signature: Uint8Array): Uint8Array {
    // This is a simplified version
    // Real implementation should properly modify PDF structure to embed signature
    
    // For demo purposes, we'll append signature metadata
    // In production, use proper PDF signing library or pdf-lib signature embedding
    
    return pdfBytes; // Return original for now - full implementation needed
  }

  /**
   * Get certificate subject name
   */
  private getCertificateSubject(certificate: forge.pki.Certificate): string {
    const subject = certificate.subject.attributes
      .map(attr => `${attr.shortName}=${attr.value}`)
      .join(', ');
    return subject;
  }

  /**
   * Get certificate information
   */
  private getCertificateInfo(certificate: forge.pki.Certificate): string {
    return `Subject: ${this.getCertificateSubject(certificate)}\n` +
           `Issuer: ${certificate.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', ')}\n` +
           `Serial: ${certificate.serialNumber}\n` +
           `Valid From: ${certificate.validity.notBefore}\n` +
           `Valid To: ${certificate.validity.notAfter}`;
  }

  /**
   * Check if browser supports required APIs
   */
  static isBrowserSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.crypto !== 'undefined' &&
           typeof window.crypto.subtle !== 'undefined';
  }

  /**
   * Get available certificates from Windows certificate store
   * 
   * PRODUCTION IMPLEMENTATION:
   * This would use Web Crypto API or browser extensions to list certificates
   */
  static async getAvailableCertificates(): Promise<any[]> {
    // In production, this would call browser API to list certificates
    // For demo, return empty array
    console.warn('Certificate listing not implemented - demo mode');
    return [];
  }
}

/**
 * Alternative: Simple signature using pdf-lib
 * This creates a DEMO signature with signature dictionary (not cryptographic)
 */
export async function addVisibleSignature(
  pdfBytes: Uint8Array,
  signerName: string,
  signatureNumber: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const pageWidth = lastPage.getWidth();
  const fieldWidth = 220;
  const fieldHeight = 70;
  const margin = 36;
  const gap = 12;

  const slotPositions = [
    { x: margin, y: margin + fieldHeight + gap },
    { x: pageWidth - margin - fieldWidth, y: margin + fieldHeight + gap },
    { x: margin, y: margin },
    { x: pageWidth - margin - fieldWidth, y: margin },
  ];

  const slotIndex = Math.min(Math.max(signatureNumber, 1), 4) - 1;
  const slot = slotPositions[slotIndex];
  
  // Add signature text annotation
  lastPage.drawText(`Signature ${signatureNumber}: ${signerName}`, {
    x: slot.x,
    y: slot.y + 26,
    size: 12,
  });
  
  lastPage.drawText(`Date: ${new Date().toLocaleString()}`, {
    x: slot.x,
    y: slot.y + 11,
    size: 10,
  });

  // Create a DEMO signature dictionary
  // This creates a signature entry that the backend can recognize
  const context = pdfDoc.context;
  
  const signatureDict = context.obj({
    Type: 'Sig',
    Filter: 'DEMO_SIGNATURE',
    SubFilter: 'DEMO',
    Name: PDFHexString.fromText(`DEMO - ${signerName}`),
    M: PDFHexString.fromText(new Date().toISOString()),
    Reason: PDFHexString.fromText('DEMO signature for testing purposes'),
    Location: PDFHexString.fromText('Demo Environment'),
  });

  const signatureRef = context.register(signatureDict);

  // Create a signature field and add it to AcroForm
  const catalog = pdfDoc.catalog;
  let acroForm = catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
  
  if (!acroForm) {
    // Create AcroForm if it doesn't exist
    acroForm = context.obj({
      Fields: context.obj([]),
      SigFlags: 3,
    });
    catalog.set(PDFName.of('AcroForm'), acroForm);
  }

  // Create a signature field
  const signatureField = context.obj({
    FT: 'Sig',
    T: PDFHexString.fromText(`DemoSignature${signatureNumber}`),
    V: signatureRef,
    Type: 'Annot',
    Subtype: 'Widget',
    Rect: [slot.x, slot.y, slot.x + fieldWidth, slot.y + fieldHeight],
    P: lastPage.ref,
  });

  const signatureFieldRef = context.register(signatureField);

  // Add the field to AcroForm
  const fields = acroForm.lookupMaybe(PDFName.of('Fields'), PDFArray);
  if (fields && fields instanceof PDFArray) {
    fields.push(signatureFieldRef);
    acroForm.set(PDFName.of('Fields'), fields);
  } else {
    const newFields = context.obj([signatureFieldRef]);
    acroForm.set(PDFName.of('Fields'), newFields);
  }

  // Add the field to the page's annotations
  const annots = lastPage.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (annots && annots instanceof PDFArray) {
    annots.push(signatureFieldRef);
    lastPage.node.set(PDFName.of('Annots'), annots);
  } else {
    const newAnnots = context.obj([signatureFieldRef]);
    lastPage.node.set(PDFName.of('Annots'), newAnnots);
  }
  
  return await pdfDoc.save();
}


