const express = require('express')

const router = express.Router()

const { signToken } = require('../service/entitlement')
const { getAllVideos } = require('../database')

router.get('/getAllVideos', async (req, res) => {
  let videos = await getAllVideos()
  res.json(videos)
})

router.get('/getLicenseById/:id', async (req, res) => {
  let token = await signToken(req.params.id)
  res.json(token)
})

module.exports = router
