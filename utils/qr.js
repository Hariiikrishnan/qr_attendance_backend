const crypto = require("crypto");

const SECRET = process.env.QR_SECRET;
const verifiedQRCache = new Map();

// function signPayload(payload) {
//   const data = `${payload.sessionId}|${payload.type}|${payload.expiresAt}`;

//   return crypto
//     .createHmac("sha256", SECRET)
//     .update(data)
//     .digest("hex");
// }

// function verifyPayload(payload, signature) {
//   const data = `${payload.sessionId}|${payload.type}|${payload.expiresAt}`;

//   const expected = crypto
//     .createHmac("sha256", SECRET)
//     .update(data)
//     .digest("hex");

//   return expected === signature;
// }


function verifyOnce(payload, signature) {
  if (!payload || !signature) return false;

  const key = signature; // ✅ immutable, unique

  if (verifiedQRCache.has(key)) return true;

  const valid = verifyPayload(payload, signature);
  if (!valid) return false;

  verifiedQRCache.set(key, true);
  setTimeout(() => verifiedQRCache.delete(key), 2 * 60 * 1000);

  return true;
}
function signPayload(payload) {
    // console.log(payload);
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");

  return { payload, signature };
}

function verifyPayload(payload, signature) {
    // console.log(payload);
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  return expected === signature;
}

module.exports = { signPayload, verifyPayload ,verifyOnce };
