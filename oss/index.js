const OSS = require('ali-oss')
const config = require('../config')
const client = new OSS({
  endpoint: config.OSS.internalBucketDomain,
  region: config.OSS.region,
  accessKeyId: config.OSS.accessKeyId,
  accessKeySecret: config.OSS.accessKeySecret,
  bucket: config.OSS.bucket
})
module.exports = client
