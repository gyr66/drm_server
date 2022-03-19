const express = require('express')
const fs = require('fs')
const path = require('path')
const { STS } = require('ali-oss')

const oss_client = require('../oss')
const config = require('../config')

const { encryptVideo } = require('../service/encrypt')
const { generateThumbnail } = require('../service/thumbnail')
const { insertVideo } = require('../database')
const { getAllPaths } = require('../util/fileUtil')
const logger = require('../logger')

const router = express.Router()

// Authorize upload requests
router.get('/sts', (req, res) => {
  let sts = new STS({
    accessKeyId: config.OSS.accessKeyId,
    accessKeySecret: config.OSS.accessKeySecret
  })
  sts
    .assumeRole(config.OSS.uploadRoleArn)
    .then((result) => {
      res.json({
        AccessKeyId: result.credentials.AccessKeyId,
        AccessKeySecret: result.credentials.AccessKeySecret,
        SecurityToken: result.credentials.SecurityToken,
        Expiration: result.credentials.Expiration
      })
    })
    .catch((err) => {
      logger.error(err)
      res.status(400).json(err.message)
    })
})

// Deal with the video after the client finishes uploading
router.post('/upload_callback', async (req, res) => {
  res.json({
    status: 200,
    msg: 'OK'
  })
  let video = {
    id: req.body.id, // video id
    name: req.body.name, // video name
    remotePath: req.body.path, // video remote path
    localPath: path.join(config.upload.uploadDirName, req.body.id), // video local path
    outputDir: path.join(config.upload.resourceDirName, req.body.id), // video output dictionary
    thumbnailUrl: `${config.OSS.publicBucketDomain}/public/${req.body.id}/thumbnail.png`, // OSS thumbnail URL
    videoUrl: `${config.OSS.publicBucketDomain}/public/${req.body.id}/video.mpd`, // OSS video URL
    keyId: req.body.id // encrypt key id
  }
  // Grab from remote private bucket to local
  fs.mkdirSync(video.outputDir)
  await oss_client.get(video.remotePath, video.localPath)
  fs.renameSync(
    video.localPath,
    path.join(config.upload.uploadDirName, video.id)
  )
  video.localPath = path.join(config.upload.uploadDirName, video.id)
  logger.debug('video localPath: ', video.localPath)
  // encrypt
  await encryptVideo(video.localPath, video.outputDir, video.keyId)
  // generate thumbnail
  await generateThumbnail(video.localPath, video.outputDir, video.id)
  // delete the original video
  fs.rmSync(video.localPath)
  // upload the encrypted video to public bucket
  let files = getAllPaths(video.outputDir)
  let promises = []
  files.forEach((val) => {
    let promise = oss_client
      .put('public/' + path.relative('static', val).replace(/\\/g, '/'), val)
      .then(() => {
        // after finishing uploading, remove the file
        logger.debug('remove localFile: ', val)
        fs.rmSync(val)
      })
    promises.push(promise)
  })
  Promise.all(promises).then(async () => {
    // remove the empty folders
    fs.rmdirSync(path.join(video.outputDir, 'video'))
    fs.rmdirSync(path.join(video.outputDir, 'audio'))
    fs.rmdirSync(video.outputDir)
    // put the information of the vidoe to database
    await insertVideo(video)
    logger.info('uploaded video: ', video)
  })
})

module.exports = router
