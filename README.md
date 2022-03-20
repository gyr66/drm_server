# DRM Server
A video upload and sharing platform using DRM Technology.
## Highlights
- DRM Video Protection
  - Anti recording screen.
  - Anti playback in virtual machine. 
  - External playback devices can be restricted.
  - Video encryption cannot be cracked.
- Video Storage
  - Using S3 storage.
  - Using RAM. The storage space is divided into public bucket and private bucket. For public bucket, only reading is permitted. For private bucket, only writing with a valid token is permitted.
- Video Playback and Page Loading
  - With Alibaba cloud, the video upload and download bandwidth can reach 10Gbps.
  - Using CDN to accelerate the static resources of web pages.
## Expansibility
This platform is mainly used for DRM Technology and video storage and playback technology experiments. It can be very convenient and easy to integrate with business logic. For example, it can restrict users' playback through authentication and authorization frameworks.