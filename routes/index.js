const express = require('express');

const api = require('../src/index');

const router = express.Router();

router.use('/creadable-lms/api', api);

module.exports = router;
