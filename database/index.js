const mysql = require('mysql');
const config = require('../config')

const connection = mysql.createConnection({
  host: config.dataBase.host,
  user: config.dataBase.user,
  password: config.dataBase.password,
  port: config.dataBase.port,
  database: config.dataBase.database
});

connection.connect();

function insertVideo(video) {
  return new Promise((resolve, reject) => {
    connection.query("INSERT INTO videos VALUES (?, ?, ?, ?, ?)", [video.id, video.name, video.keyId, video.videoUrl, video.thumbnailUrl], (err, res) => {
      if (err) reject(err);
      resolve(res);
    });
  })
}

function getVideoById(id) {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM videos WHERE id = ?", [id], (err, res) => {
      if (err) reject(err);
      resolve(res[0]);
    });
  })
}

function getAllVideos() {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM videos", (err, res) => {
      if (err) reject(err);
      resolve(res);
    })
  });
}

module.exports = {
  insertVideo, getVideoById, getAllVideos
}

