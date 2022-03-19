const jwt = require("jsonwebtoken");
const moment = require("moment");
const { getVideoById } = require("../database");
const config = require('../config')

const communicationKeyId = config.communicationKeyId;
const communicationKey = config.communicationKey;

async function signToken(videoId) {
  let res = await getVideoById(videoId);
  let keyId = res.key_id;
  // console.log(keyId);
  // Config the license.
  let now = moment();
  let validFrom = now.clone().subtract(1, "minutes");
  let validTo = now.clone().add(1, "minutes");
  let message = {
    "type": "entitlement_message",
    "version": 2,
    "license": {
      "allow_persistence": false,
    },
    "content_keys_source": {
      "inline": [
        {
          "id": keyId,
          "usage_policy": "Policy A"
        }
      ]
    },
    "content_key_usage_policies": [
      {
        "name": "Policy A",
        "widevine":
        {
          "cgms-a": "once",
          // "hdcp": "2.0",
          "disable_analog_output": true
        },
      }
    ]
  };

  //Config the token.
  let envelope = {
    "version": 1,
    "com_key_id": communicationKeyId, // We may have several communicationKeys
    "message": message,
    "begin_date": validFrom.toISOString(),
    "expiration_date": validTo.toISOString()
  };

  let licenseToken = jwt.sign(envelope, Buffer.from(communicationKey, "base64"), {
    "algorithm": "HS256",
    "noTimestamp": true
  });

  return licenseToken;
}

module.exports = {
  signToken
}

