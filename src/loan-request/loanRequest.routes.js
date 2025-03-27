const controller = require("./loanRequest.controller");
const express = require('express');
const router = express.Router();
const authMiddlewares = require('../../middleware/authJwt');

router.post("/create", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.createLoanRequest);
router.get("/search", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.searchLoanRequest);


module.exports = router;