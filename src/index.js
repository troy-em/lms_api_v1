const express = require('express');
const router = express.Router();


router.get('/v1', (req, res) => {
    res.json({
        message: "Credable LMS API Endpoint",
    });
});

//
const auth = require('./auth/auth.routes');
const status = require('./status/status.routes');
const subscriptions = require('./subscription/subscription.routes');
const customertransactions = require('./customer-transactions/customerTransactions.routes');
const loanrequest = require('./loan-request/loanRequest.routes');
const loanstatus = require('./loan-status/loanStatus.routes');

//
router.use('/v1/auth', auth);
router.use('/v1/status', status);
router.use('/v1/subscriptions', subscriptions);
router.use('/v1/customer-transactions', customertransactions);
router.use('/v1/loan-request', loanrequest);
router.use('/v1/loan-status', loanstatus);

module.exports = router;