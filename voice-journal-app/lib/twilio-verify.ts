import twilio from 'twilio';

/**
 * Verify Twilio webhook signature to ensure requests are from Twilio
 */
export function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Extract and verify Twilio webhook request
 * Returns the parsed body if valid, null if invalid
 */
export async function verifyTwilioWebhook(
  request: Request,
  authToken: string
): Promise<Record<string, string> | null> {
  const signature = request.headers.get('X-Twilio-Signature');

  if (!signature) {
    console.warn('Missing X-Twilio-Signature header');
    return null;
  }

  // Get the full URL that Twilio used to sign
  const url = request.url;

  // Parse form data
  const formData = await request.formData();
  const params: Record<string, string> = {};

  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // In development, skip signature validation if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_TWILIO_SIGNATURE === 'true') {
    console.log('Skipping Twilio signature verification in development');
    return params;
  }

  // Verify the signature
  const isValid = verifyTwilioSignature(authToken, signature, url, params);

  if (!isValid) {
    console.warn('Invalid Twilio signature');
    return null;
  }

  return params;
}

/**
 * Helper to parse Twilio webhook form data without verification
 * Use only for development/testing
 */
export async function parseTwilioWebhook(
  request: Request
): Promise<Record<string, string>> {
  const formData = await request.formData();
  const params: Record<string, string> = {};

  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  return params;
}
