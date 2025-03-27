const LoanRequest = require('./loanRequest.model');
const LoanStatus = require('../loan-status/loanStatus.model');
const Subscription = require('../subscription/subscription.model');
const Status = require('../status/status.model');
const SubscriptionController = require('../subscription/subscription.controller');
const { GetCustomerKyc } = SubscriptionController;
const axios = require('axios');
require('dotenv').config();
const { delay } = require('../../utils/helpers');

exports.createLoanRequest = async (req, res) => {
    const requiredFields = ['customer_number', 'amount'];
    const data = req.body;
    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length) {
        return res.status(400).send({
            message: 'Missing required fields',
            missingFields
        });
    }

    if (isNaN(data.amount)) {
        return res.status(400).send({
            message: 'Invalid amount'
        });
    }

    try {
        // check if customer subscription exists
        const customerSubscription = await Subscription.query().where({customer_number: data.customer_number}).first();
        if (!customerSubscription) {
            return res.status(400).send({
                message: 'Customer subscription not found'
            });
        }

        const subStatus = await Status.query().findById(customerSubscription.status_id);

        if (subStatus.name !== 'active') {
            return res.status(400).send({
                message: 'Customer subscription is not active'
            });
        }

        // check if customer bank account is active
        const customerBankKyc = await GetCustomerKyc(req.body.customerNumber);

        if (!customerBankKyc) {
            return res.status(400).send({
                message: 'Failed: Customer not registered with the bank !'
            });
        }

        if (customerBankKyc.status !== "active") {
            return res.status(400).send({
                message: 'Failed: Customer is inactive !'
            });
        }

        // check if there's an active loan request for customer
        const activeLoanRequest = await hasActiveLoanRequest(data.customer_number);

        if (activeLoanRequest) {
            return res.status(400).send({
                message: 'Customer has an active loan'
            });
        }

        const processingStatus = await Status.query().where({name: "processing"}).first();

        if (!processingStatus) {
            return res.status(400).send({
                message: 'Failed: Could not fetch status'
            });
        }

        // create request
        const newRequest = await LoanRequest.query().insert({
            customer_number: data.customer_number,
            amount: parseFloat(data.amount)
        });

        // create loan status
        const newLoanStatus = await LoanStatus.query().insert({
            loan_request_id: newRequest.id,
            status_id: processingStatus.id
        });

        // Immediately respond to client
        res.status(200).send({
            message: 'Loan request created successfully. Scoring in progress.',
            requestId: newRequest.id
        });

        // Start background scoring process
        processScoringBackground(newRequest.id, data.customer_number, data.amount);

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal server error"
        });
    }
};

exports.searchLoanRequest = async (req, res) => {
    try {
        const {
            customer_number,
            loan_request_id,
            status_name,
            amount,
            max_amount,
            min_amount,
            startDate,
            endDate,
            sortBy = 'created_at',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = LoanRequest.query()
            .withGraphFetched({
                loanStatus: {
                    status: true
                },
                payments: true
            });

        // Direct LoanRequest filters
        if (customer_number) query.where('customer_number', customer_number);
        if (loan_request_id) query.where('id', loan_request_id);
        if (amount) query.where('amount', amount);

        // Amount range filters
        if (min_amount && max_amount) {
            query.whereBetween('amount', [min_amount, max_amount]);
        } else if (min_amount) {
            query.where('amount', '>=', min_amount);
        } else if (max_amount) {
            query.where('amount', '<=', max_amount);
        }

        // Status filter (through loanStatus relation)
        if (status_name) {
            query.modifyGraph('loanStatus', (builder) => {
                builder.joinRelated('status')
                .where('status.name', status_name);
            });
        }

        // Date filtering
        if (startDate && endDate) {
            query.whereBetween('loan_request.created_at', [new Date(startDate), new Date(endDate)]);
        } else if (startDate) {
            query.where('loan_request.created_at', '>=', new Date(startDate));
        } else if (endDate) {
            query.where('loan_request.created_at', '<=', new Date(endDate));
        }

        // Sorting
        if (sortBy.includes('.')) {
            const [relation, field] = sortBy.split('.');
            if (relation === 'loanStatus') {
                query.orderBy(`loanStatus:status.name`, sortOrder);
            } else {
                query.orderBy(`${relation}.${field}`, sortOrder);
            }
        } else {
            query.orderBy(sortBy, sortOrder);
        }

        // Pagination
        const result = await query.page((page - 1), limit);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error searching loan requests:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};



async function processScoringBackground(loanRequestId, customerNumber, amount) {
    const clientToken = process.env.CLIENT_TOKEN;
    const initiateUrl = `${process.env.INITIATE_SCORING_URL}/${customerNumber}`;
    const maxRetries = process.env.MAX_RETRY;
    const retryDelay = process.env.RETRY_DELAY;

    try {
        // Step 1: Initiate scoring
        const initiateResponse = await axios.get(initiateUrl, {
            headers: { 'client-token': clientToken }
        });
        const token = initiateResponse.data.token;

        // Step 2: Query score with retry logic
        let scoreData = null;
        let attempts = 0;

        while (attempts < maxRetries && !scoreData) {
            attempts++;
            try {
                const queryUrl = `${process.env.QUERY_SCORE_URL}/${token}`;
                const response = await axios.get(queryUrl, {
                    headers: { 'client-token': clientToken }
                });

                if (response.data && response.data.score !== undefined) {
                    scoreData = response.data;
                    break;
                }
            } catch (error) {
                console.log(`Scoring attempt ${attempts} failed for request ${loanRequestId}`);
            }

            if (attempts < maxRetries) {
                await delay(retryDelay);
            }
        }

        // Update loan based on scoring result
        if (scoreData) {
            // Success - update loan with score and limit
            await LoanRequest.query()
                .findById(loanRequestId)
                .patch({
                    customer_score: scoreData.score,
                    customer_limit: scoreData.limitAmount
                });

            if (parseFloat(amount) > parseFloat(scoreData.limitAmount) && scoreData.exclusion !== "No Exclusion") {
                // set failed
                const statusName = "rejected";
                const newStatus = await Status.query().where({ name: statusName }).first();

                if (newStatus) {
                    await LoanStatus.query()
                        .where({ loan_request_id: loanRequestId })
                        .patch({ status_id: newStatus.id, remarks: `Maximum limit is ${scoreData.limitAmount}` });
                }
            } else {
                // set active
                const statusName = "active";
                const newStatus = await Status.query().where({ name: statusName }).first();

                if (newStatus) {
                    await LoanStatus.query()
                        .where({ loan_request_id: loanRequestId })
                        .patch({ status_id: newStatus.id });
                }
            }

        } else {
            // Scoring failed after retries
            const failedStatus = await Status.query().where({ name: "failed" }).first();
            if (failedStatus) {
                await LoanStatus.query()
                    .where({ loan_request_id: loanRequestId })
                    .patch({ status_id: failedStatus.id, remarks: "Could not fetch scoring data" });
            }
        }
    } catch (error) {
        console.error(`Error processing scoring for request ${loanRequestId}:`, error);
        // Mark as failed if any error occurs
        const failedStatus = await Status.query().where({ name: "failed" }).first();
        if (failedStatus) {
            await LoanStatus.query()
                .where({ loan_request_id: loanRequestId })
                .patch({ status_id: failedStatus.id, remarks: "Could not fetch scoring data" });
        }
    }
}



async function hasActiveLoanRequest(customerNumber) {
    const activeStatusNames = ['active'];
    try {
        const exists = await LoanRequest.query()
            .where('customer_number', customerNumber)
            .whereExists(
                LoanStatus.query()
                    .whereColumn('loan_status.loan_request_id', 'loan_request.id')
                    .joinRelated('status')
                    .where('status.name', 'in', activeStatusNames)
            )
            .first();

        return !!exists;
    } catch (error) {
        console.error('Error checking active loan:', error);
        throw error;
    }
}