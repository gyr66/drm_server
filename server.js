const https = require('https')
const http = require('http')
const fs = require('fs')
const express = require('express')

const OSSRouter = require('./router/OSS_router')
const videoRouter = require('./router/video_router')

const app = express()
app.use(express.json())

// app.all('*', function (req, res, next) {
//   res.header('Access-Control-Allow-Origin', req.header('origin'))
//   res.header(
//     'Access-Control-Allow-Methods',
//     'GET, POST, DELETE, UPDATE, PATCH, HEAD, OPTIONS'
//   )
//   res.header(
//     'Access-Control-Allow-Headers',
//     'Accept,Authorization,DNT,Content-Type,Referer,User-Agent, tus-resumable, upload-length, upload-metadata, Location, upload-offset'
//   )
//   res.header(
//     'Access-Control-Expose-Headers',
//     'Location, upload-offset, Upload-Length'
//   )
//   res.header('Access-Control-Allow-Credentials', 'true')

//   next()
// })

app.use(
  '/',
  express.static('static', {
    maxAge: 3600
  })
)

app.use('/OSS', OSSRouter)
app.use('/videos', videoRouter)

// http.createServer(app).listen(1080)

https
  .createServer(
    {
      key: fs.readFileSync('./certificate/videos.cqupt-gyr.xyz.key'),
      cert: fs.readFileSync('./certificate/videos.cqupt-gyr.xyz.pem')
    },
    app
  )
  .listen(443)

http
  .createServer((req, res) => {
    res.writeHead(301, { Location: 'https://' + req.headers['host'] + req.url })
    res.end()
  })
  .listen(80)
