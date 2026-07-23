import { createHash, createHmac } from "node:crypto";

interface VolcengineSignInput {
  accessKeyId: string;
  secretAccessKey: string;
  method: string;
  url: URL;
  body: string;
  now?: Date;
  region: string;
  service: string;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function canonicalQuery(searchParams: URLSearchParams) {
  return [...searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function signVolcengineRequest(input: VolcengineSignInput): Record<string, string> {
  const now = input.now || new Date();
  const xDate = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const shortDate = xDate.slice(0, 8);
  const payloadHash = sha256(input.body);
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders = [
    "content-type:application/json",
    `host:${input.url.host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.url.pathname || "/",
    canonicalQuery(input.url.searchParams),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${shortDate}/${input.region}/${input.service}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    xDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(input.secretAccessKey, shortDate), input.region), input.service),
    "request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    "Content-Type": "application/json",
    "X-Date": xDate,
    "X-Content-Sha256": payloadHash,
    Authorization: `HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
