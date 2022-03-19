const ffmpeg = require('fluent-ffmpeg');

function generateThumbnail(videoPath, thumbnailPath, videoName) {
  return new Promise(resolve => {
    new ffmpeg(videoPath).screenshots({
      count: 1,
      filename: 'thumbnail',
      folder: thumbnailPath,
      size: '320x240'
    }).on('end', () => {
      resolve();
    });
  })
}

module.exports = {
  generateThumbnail
}
