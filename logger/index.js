const log4js = require('log4js')
log4js.configure({
  appenders: {
    fileAppender: { type: 'dateFile', filename: './logs/note.log' },
    consoleAppender: { type: 'console' }
  },
  categories: {
    default: { appenders: ['fileAppender', 'consoleAppender'], level: 'debug' },
    production: { appenders: ['fileAppender'], level: 'info' }
  }
})

const logger = log4js.getLogger()

module.exports = logger
