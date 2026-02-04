const crypto = require("crypto");

const SECRET = process.env.QR_SECRET;
const verifiedQRCache = new Map();

function signPayload(payload) {
  
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");

  return { payload, signature };
}

function verifyPayload(payload, signature) {

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  return expected === signature;
}

function verifyOnce(payload, signature) {
  const key = payload.sessionId + payload.type;

  if (verifiedQRCache.has(key)) return true;

  const valid = verifyPayload(payload, signature);
  if (valid) {
    verifiedQRCache.set(key, true);
    setTimeout(() => verifiedQRCache.delete(key), 2 * 60 * 1000);
  }
  return valid;
}

module.exports = { signPayload, verifyPayload ,verifyOnce };
