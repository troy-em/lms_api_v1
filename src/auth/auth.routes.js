const controller = require("./authController");
const express = require('express');
const router = express.Router();

router.post("/create", controller.CreateClient);
router.post("/get-tokens", controller.GetTokens);
router.post("/refresh-token", controller.RefreshToken);
router.post("/initiate-password-reset", controller.InitiatePasswordReset);
router.post("/password-reset", controller.PasswordReset);



module.exports = router;