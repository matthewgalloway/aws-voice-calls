import crypto from 'crypto';

/**
 * Verify Telnyx webhook signature to ensure requests are from Telnyx
 * Telnyx uses a different signature format than Twilio
 */
export function verifyTelnyxSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  payload: string
): boolean {
  try {
    // Telnyx signature verification
    // The signature is a base64-encoded Ed25519 signature
    const signedPayload = `${timestamp}|${payload}`;

    const verify = crypto.createVerify('ed25519');
    verify.update(signedPayload);

    return verify.verify(
      Buffer.from(publicKey, 'base64'),
      Buffer.from(signature, 'base64')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Extract and verify Telnyx webhook request
 * Returns the parsed body if valid, null if invalid
 */
export async function verifyTelnyxWebhook(
  request: Request,
  publicKey: string
): Promise<Record<string, unknown> | null> {
  const signature = request.headers.get('telnyx-signature-ed25519');
  const timestamp = request.headers.get('telnyx-timestamp');

  if (!signature || !timestamp) {
    console.warn('Missing Telnyx signature headers');
    return null;
  }

  // Get raw body for signature verification
  const rawBody = await request.text();

  // In development, skip signature validation if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_TELNYX_SIGNATURE === 'true') {
    console.log('Skipping Telnyx signature verification in development');
    return JSON.parse(rawBody);
  }

  // Verify the signature
  const isValid = verifyTelnyxSignature(publicKey, signature, timestamp, rawBody);

  if (!isValid) {
    console.warn('Invalid Telnyx signature');
    return null;
  }

  return JSON.parse(rawBody);
}

/**
 * Helper to parse Telnyx webhook JSON without verification
 * Use only for development/testing
 */
export async function parseTelnyxWebhook(
  request: Request
): Promise<Record<string, unknown>> {
  const body = await request.json();
  return body;
}
