const LoanStatus = require('./loanStatus.model');
const LoanRequest = require('../loan-request/loanRequest.model');
const LoanPayment = require('../loan-payment/loanPayment.model');

// update loan status
exports.updateLoanStatus = async (req, res) => {
    const { id } = req.params;

    const { status_id } = req.body;

    if (!status_id) {
        return res.status(400).send({
            message: "At least one editable field must be provided for update!"
        });
    }

    try {
        // Check if loan status exists
        const loanStatus = await LoanStatus.query().findById(id);

        if (!loanStatus) {
            return res.status(404).send({
                message: "Loan status not found!"
            });
        }

        if (status_id) {
            if (isNaN(status_id)) {
                return res.status(400).send({
                    message: "Invalid status_id"
                });
            }

            const statusExists = await Status.query().findById(status_id);
            if (!statusExists) {
                return res.status(400).send({
                    message: "Status not found"
                });
            }
        }

        // Update the fields
        const updatedFields = {};
        if (status_id) updatedFields.status_id = parseInt(status_id);

        const updatedLoanStatus = await LoanStatus.$query().patchAndFetchById(id, updatedFields);

        return res.status(200).send({
            message: "Loan status updated successfully!",
            data: {
                ...updatedLoanStatus
            }
        });

    } catch (error) {
        return res.status(500).send({
            message: "Internal server error"
        });
    }
};


// search loan status
exports.searchLoanStatus = async (req, res) => {
    try {
        const {
            customer_number,
            loan_request_id,
            status_id,
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

        const query = LoanStatus.query()
            .withGraphFetched({
                loanRequest: true,
                payments: true,
                status: true
            })
            .modifyGraph('loanRequest', (builder) => {
                if (customer_number) builder.where('customer_number', customer_number);
                if (amount) builder.where('amount', amount);
                if (min_amount && max_amount) {
                    builder.whereBetween('amount', [min_amount, max_amount]);
                } else if (min_amount) {
                    builder.where('amount', '>=', min_amount);
                } else if (max_amount) {
                    builder.where('amount', '<=', max_amount);
                }
            });

        // Apply direct filters
        if (loan_request_id) query.where('loan_request_id', loan_request_id);
        if (status_id) query.where('status_id', status_id);

        // Date filtering
        if (startDate && endDate) {
            query.whereBetween('loan_status.created_at', [new Date(startDate), new Date(endDate)]);
        } else if (startDate) {
            query.where('loan_status.created_at', '>=', new Date(startDate));
        } else if (endDate) {
            query.where('loan_status.created_at', '<=', new Date(endDate));
        }

        // Sorting
        if (sortBy.includes('.')) {
            const [relation, field] = sortBy.split('.');
            query.orderBy(`${relation}.${field}`, sortOrder);
        } else {
            query.orderBy(sortBy, sortOrder);
        }

        // Pagination
        const result = await query.page((page - 1), limit);


        return res.status(200).json(result);
    } catch (error) {
        console.error('Error searching loan status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};