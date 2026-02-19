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
// function signPayload(payload) {
//     // console.log(payload);
//   const data = JSON.stringify(payload);
//   const signature = crypto
//     .createHmac("sha256", SECRET)
//     .update(data)
//     .digest("hex");

//   return { payload, signature };
// }
function signPayload(payload) {
  const data = `${payload.s}|${payload.t}|${payload.e}`;

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url"); // shorter than hex
  console.log(`Signed : ${data}`);
  return `${data}|${signature}`;
}


// function verifyPayload(payload, signature) {
//     // console.log(payload);
//   const expected = crypto
//     .createHmac("sha256", SECRET)
//     .update(JSON.stringify(payload))
//     .digest("hex");

//   return expected === signature;
// }
function verifyPayload(payload,sign) {
  console.log("Session id : "+ payload.s);
  const qrString = `${payload.s}|${payload.t}|${payload.e}`;
  console.log("Verifying : "+qrString);
  // const parts = qrString.split("|");

  // if (parts.length !== 4) return false;

  // const [s, t, e, signature] = parts;

  // const data = `${s}|${t}|${e}`;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(qrString)
    .digest("base64url");

    console.log("Expected : " + expected + " , Signature : " + sign);

  // if (expected !== sign) return false;

  // if (Date.now() > Number(e)) return false;

  return expected === sign;
}


module.exports = { signPayload, verifyPayload ,verifyOnce };
