const controller = require("./customerTransactions.controller");
const express = require('express');
const router = express.Router();

router.get("/get/:customerNumber", controller.GetTransactions);


module.exports = router;