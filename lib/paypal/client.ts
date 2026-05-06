import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
} from '@paypal/paypal-server-sdk';

const env =
  process.env.PAYPAL_ENVIRONMENT === 'live' ? Environment.Production : Environment.Sandbox;

if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
}

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  },
  environment: env,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: { logBody: false },
    logResponse: { logHeaders: false },
  },
});

export const paypalOrders = new OrdersController(client);
export const paypalPayments = new PaymentsController(client);

export const PAYPAL_API_BASE =
  process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

/**
 * Get an OAuth access token for raw PayPal REST API calls
 * (used for subscriptions and webhook verification — features
 * not yet wrapped by the SDK at the time of writing).
 */
export async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
