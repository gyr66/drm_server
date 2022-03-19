const fs = require('fs');
const path = require('path');

function getAllPaths(currentPath) {
  let status = fs.statSync(currentPath);
  if (status.isFile()) return [currentPath];
  let res = [];
  let files = fs.readdirSync(currentPath);
  files.forEach(val => res = res.concat(getAllPaths(path.join(currentPath, val))));
  return res;
}

module.exports = {
  getAllPaths
}