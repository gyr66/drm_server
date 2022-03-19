const tus = require('tus-node-server');
const EVENTS = require('tus-node-server').EVENTS;
const uuid = require("node-uuid");
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const express = require('express');
const oss_client = require('./oss');
const { STS } = require('ali-oss');

const config = require('./config');
const { encryptVideo } = require('./service/encrypt');
const { signToken } = require('./service/entitlement')
const { generateThumbnail } = require('./service/thumbnail');
const { getAllVideos, insertVideo } = require('./database');
const { getAllPaths } = require('./util/fileUtil');
const logger = require('./logger');

const server = new tus.Server();

const bucketDomain = "https://my-video-platform.oss-cn-chengdu.aliyuncs.com";

server.datastore = new tus.FileStore({
  path: `/${config.upload.uploadDirName}`
});

server.on(EVENTS.EVENT_UPLOAD_COMPLETE, async (event) => {
  let metadata = event.file.upload_metadata;
  let videoId = event.file.id;
  let video = {
    id: videoId,
    name: Buffer.from(metadata.substring(metadata.indexOf('name ') + 5, metadata.indexOf(',type')), 'base64').toString('utf8'), //视频名字
    path: path.join(config.uploadDirName, videoId + '.mp4'),
    outputDir: path.join(config.resourceDirName, videoId),
    thumbnailUrl: `${bucketDomain}/${videoId}/thumbnail.png`,
    videoUrl: `${bucketDomain}/${videoId}/video.mpd`,
    keyId: uuid.v4()
  }
  fs.renameSync(path.resolve(config.uploadDirName, videoId), video.path);
  logger.info(`${video.id}上传成功!`);

  // 视频加密
  logger.info(`已提交加密任务! ${video.id}`);
  await encryptVideo(video.path, video.outputDir, video.keyId);
  logger.info(`加密任务执行完毕! ${video.id}`);

  // 生成缩略图
  await generateThumbnail(video.path, video.outputDir, video.id);
  logger.info('视频缩略图生成完成!');

  // 上传到OSS服务器
  let files = getAllPaths(video.outputDir);
  files.forEach(val => {
    oss_client.put(path.relative('static', val).replace(/\\/g, '/'), val);
  });

  // 插入数据库
  await insertVideo(video);
});

const app = express();
const uploadApp = express();

app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.header("origin"));
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, UPDATE, PATCH, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Accept,Authorization,DNT,Content-Type,Referer,User-Agent, tus-resumable, upload-length, upload-metadata, Location, upload-offset");
  res.header("Access-Control-Expose-Headers", "Location, upload-offset, Upload-Length");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

uploadApp.all('*', server.handle.bind(server));

app.use('/upload', uploadApp);

app.use('/', express.static('static'));

app.use(express.json());

app.get('/getAllVideos', async (req, res) => {
  let videos = await getAllVideos();
  res.json(videos);
});

app.get('/getLicenseById/:id', async (req, res) => {
  let token = await signToken(req.params.id);
  res.json(token);
});

app.post('/test', (req, res) => {
  console.log(req.params);
  console.log(req.body);
  console.log(req.headers);
  let video = {
    id: req.body.id, // 视频id
    name: req.body.name, // 视频名称
    remotePath: req.body.path, // 视频远端地址
    localPath: path.join(config.upload.uploadDirName, req.body.name), // 视频本地地址
    outputDir: path.join(config.upload.resourceDirName, req.body.id), // 视频输出目录
    thumbnailUrl: `${bucketDomain}/${req.body.id}/thumbnail.png`, // OSS缩率图URL
    videoUrl: `${bucketDomain}/${req.body.id}/video.mpd`, // OSS视频URL
    keyId: req.body.id // 加密用的keyId
  }
  // 从远端私有桶抓取到本地
  fs.mkdirSync(video.outputDir);
  oss_client.get(video.remotePath, video.localPath).then(async res => {
    // 加密
    await encryptVideo(video.localPath, video.outputDir, video.keyId);
    // 生成缩略图
    await generateThumbnail(video.localPath, video.outputDir, video.id);
    // 上传到OSS公共桶
    let files = getAllPaths(video.outputDir);
    files.forEach(val => {
      if (val === video.localPath) return;
      oss_client.put(path.relative('static', val).replace(/\\/g, '/'), val);
    });
    // 将视频信息插入到数据库中
    await insertVideo(video);
  })
  res.json({
    status: 200,
    msg: 'OK'
  })
});

app.get('/sts', (req, res) => {
  let sts = new STS({
    accessKeyId: config.OSS.accessKeyId,
    accessKeySecret: config.OSS.accessKeySecret
  });
  let policy = {
    "Version": "1",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "oss:PutObject"
        ],
        "Resource": [
          "acs:oss:*:*:my-video-platform/upload/*"
        ],
        "Condition": {}
      },
      {
        "Effect": "Allow",
        "Action": [
          "oss:ListObjects"
        ],
        "Resource": [
          "acs:oss:*:*:my-video-platform"
        ],
        "Condition": {
          "StringLike": {
            "oss:Prefix": [
              "",
              "upload/*"
            ]
          },
          "StringEquals": {
            "oss:Delimiter": "/"
          }
        }
      }
    ]
  }
  sts.assumeRole('acs:ram::1498528490532628:role/aliyunosstokengeneratorrole', policy).then((result) => {
    console.log(result);
    res.json({
      AccessKeyId: result.credentials.AccessKeyId,
      AccessKeySecret: result.credentials.AccessKeySecret,
      SecurityToken: result.credentials.SecurityToken,
      Expiration: result.credentials.Expiration
    });
  }).catch((err) => {
    console.log(err);
    res.status(400).json(err.message);
  });
});

http.createServer(app).listen(1080)

// https.createServer({
//   key: fs.readFileSync('./certificate/videos.cqupt-gyr.xyz.key'),
//   cert: fs.readFileSync('./certificate/videos.cqupt-gyr.xyz.pem'),
// }, app).listen(443);

// http.createServer((req, res) => {
//   res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//   res.end();
// }).listen(80);