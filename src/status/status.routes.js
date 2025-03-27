const controller = require("./status.controller");
const express = require('express');
const router = express.Router();

router.post("/create", controller.createStatus);
router.get("/:id", controller.getStatusById);
router.get("/", controller.getAllStatus);

module.exports = router;