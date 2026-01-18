const crypto = require("crypto");

const SECRET = process.env.QR_SECRET;

function signPayload(payload) {
    console.log(payload);
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");

  return { payload, signature };
}

function verifyPayload(payload, signature) {
    console.log(payload);
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  return expected === signature;
}

module.exports = { signPayload, verifyPayload };
