const controller = require("./subscription.controller");
const express = require('express');
const router = express.Router();
const authMiddlewares = require('../../middleware/authJwt');

router.post("/create", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.createSubscription);
router.patch("/update/:id", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.updateSubscription);
router.get("/search", [authMiddlewares.verifyToken, authMiddlewares.isActive], controller.searchSubscriptions);


module.exports = router;