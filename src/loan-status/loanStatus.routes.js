const controller = require("./loanStatus.controller");
const express = require('express');
const router = express.Router();
const authMiddlewares = require('../../middleware/authJwt');

router.patch("/update/:id", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.updateLoanStatus);
router.get("/search", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.searchLoanStatus);


module.exports = router;