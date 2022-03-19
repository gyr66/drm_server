const crypto = require('crypto')
const axios = require('axios')
const axiosRetry = require('axios-retry')
const { exec } = require('child_process')
const logger = require('../logger')
const uuid = require('node-uuid')
const config = require('../config')

const keyServerUrl =
  'https://key-server-management.axprod.net/api/WidevineProtectionInfo'

const signingKey = Buffer.from(config.widevine.signingKey, 'hex')
const signingIv = Buffer.from(config.widevine.signingIv, 'hex')
const signer = config.widevine.signer

async function encryptVideo(videoInputPath, videoOutputPath, contentId) {
  // console.log("content id: " + contentId);
  let contentKeyRequest = JSON.stringify({
    content_id: Buffer.from(contentId, 'ascii').toString('base64'),
    tracks: [{ type: 'SD' }]
  })

  let hash = crypto
    .createHash('sha1')
    .update(Buffer.from(contentKeyRequest))
    .digest()
  let cipher = crypto.createCipheriv('aes-256-cbc', signingKey, signingIv)
  let encryptedHash = cipher.update(hash, '', 'hex')
  encryptedHash += cipher.final('hex')

  let signature = Buffer.from(encryptedHash, 'hex').toString('base64')

  let keyServerRequest = JSON.stringify({
    request: Buffer.from(contentKeyRequest).toString('base64'),
    signature: signature,
    signer: signer
  })
  let res = await axios.post(keyServerUrl, keyServerRequest, {
    headers: { 'Content-Type': 'application/json' }
  })
  axiosRetry(axios, { retries: 3 })
  let contentKeyResponseBase64 = res.data.response
  let contentKeyResponse = JSON.parse(
    Buffer.from(contentKeyResponseBase64, 'base64').toString('ascii')
  )
  let key = Buffer.from(contentKeyResponse.tracks[0].key, 'base64').toString(
    'hex'
  )
  let keyId = uuid
    .unparse(Buffer.from(contentKeyResponse.tracks[0].key_id, 'base64'))
    .replace(/-/g, '')
  logger.debug('key: ' + key)
  logger.debug('keyId: ' + keyId)
  return new Promise((resolve) => {
    exec(
      `.\\packager 'in=${videoInputPath},stream=video,output=${videoOutputPath}/video.mp4,init_segment=${videoOutputPath}/video/init.mp4,segment_template=${videoOutputPath}/video/$Number$.m4s' \
    'in=${videoInputPath},stream=audio,output=${videoOutputPath}/audio.mp4,init_segment=${videoOutputPath}/audio/init.mp4,segment_template=${videoOutputPath}/audio/$Number$.m4s' \
    --generate_static_live_mpd \
    --enable_raw_key_encryption --keys=key_id=${keyId}:key=${key} --protection_scheme=cenc --mpd_output=${videoOutputPath}/video.mpd \
    --protection_systems Widevine \
    --clear_lead=0`,
      (err, stdout, stderr) => {
        if (err) logger.debug(err)
        if (stderr) logger.debug(stderr)
        resolve(stdout)
      }
    )
  })
}

module.exports = {
  encryptVideo
}
