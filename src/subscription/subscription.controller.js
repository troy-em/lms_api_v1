const Subscription = require('./subscription.model');
const ClientApp = require('../client-app/clientApp.model');
const Status = require("../status/status.model");
const soap = require('soap');
require('dotenv').config();

exports.createSubscription = async (req, res) => {
    const requiredFields = ['customer_number', 'client_name'];
    const data = req.body;
    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length) {
        return res.status(400).send({
            message: 'Missing required fields',
            missingFields
        });
    }

    try {
        // check if customer exists
        const customer = await Subscription.query().where({ customer_number: data.customer_number }).first();
        if (customer) {
            return res.status(400).send({
                message: 'Failed: Customer already registered !',
            });
        }

        // check if client exists
        const client = await ClientApp.query().where({ name: data.client_name }).first();
        if (!client) {
            return res.status(400).send({
                message: 'Failed: Client not found !'
            });
        }

        // ISSUE would fetch the customer KCY from the bank system to check if it's a valid customer
        // unfortunately the SOAP api wsdl provided points to a local url and I cannot test
        // here's the check logic anyway

        //
        // ..............* NOT WORKING *................ //

        // const customerExists = await GetCustomerKyc(req.body.customerNumber);

        // if (!customerExists) {
        //     return res.status(400).send({
        //         message: 'Failed: Customer not registered with the bank !'
        //     });
        // }

        // if (customerExists.status !== "active") {
        //     return res.status(400).send({
        //         message: 'Failed: Customer is inactive !'
        //     });
        // }

        // ................................................... //
        //

        // get active status
        const activeStatus = await Status.query().where({name: "active"}).first();

        if (!activeStatus) {
        return res.status(400).send({message: 'Failed: Could not get status details'});
        }

        const payload = {
            customer_number: req.body.customer_number,
            client_id: parseInt(client.id),
            status_id: parseInt(activeStatus.id)
        };

        const newSubscription = await Subscription.query().insert(payload);

        return res.status(201).send({
            message: "Subscription was registered successfully!",
            subscription: {
                ...newSubscription
            }
        })

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: "Internal server error"
        });
    }
}

// update subscription
exports.updateSubscription = async (req, res) => {
    const { id } = req.params;

    const { status_id, client_id } = req.body;

    if (!status_id && !client_id) {
        return res.status(400).send({
            message: "At least one editable field must be provided for update!"
        });
    }

    try {
        // Check if sub exists
        const subscription = await Subscription.query().findById(id);

        if (!subscription) {
            return res.status(404).send({
                message: "Subscription not found!"
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

        if (client_id) {
            if (isNaN(client_id)) {
                return res.status(400).send({
                    message: "Invalid client_id"
                });
            }

            const clientExists = await ClientApp.query().findById(client_id);
            if (!clientExists) {
                return res.status(400).send({
                    message: "Client not found"
                });
            }

            // TODO check if client is active
        }

        // Update the fields
        const updatedFields = {};
        if (status_id) updatedFields.status_id = parseInt(status_id);
        if (client_id) updatedFields.client_id = parseInt(client_id);

        const updatedSubscription= await Subscription.$query().patchAndFetchById(id, updatedFields);

        return res.status(200).send({
            message: "Subscription updated successfully!",
            data: {
                ...updatedSubscription
            }
        });

    } catch (error) {
        return res.status(500).send({
            message: "Internal server error"
        });
    }
};

// search subscriptions
exports.searchSubscriptions = async (req, res) => {
    try {
        const {
            customer_number,
            client_id,
            client_name,
            startDate,
            endDate,
            sortBy = 'created_at',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = Subscription.query();

        // Filters
        if (customer_number) query.where('customer_number', customer_number);
        if (client_id) query.where('client_id', client_id);
        if (client_name) {
            const client = await ClientApp.query().where({name: client_name}).first();
            if (client) query.where('client_id', client.id);
        }
        if (startDate && endDate) {
            // Case: Both startDate and endDate are provided
            const formattedStartDate = new Date(startDate).toISOString();
            const formattedEndDate = new Date(endDate).toISOString();
            query.whereBetween('subscriptions.created_at', [formattedStartDate, formattedEndDate]);
        } if (startDate) {
            // Case: Only startDate is provided (search from that date to today)
            const formattedStartDate = new Date(startDate).toISOString();
            const today = new Date().toISOString();
            query.whereBetween('subscriptions.created_at', [formattedStartDate, today]);
        } else if (endDate) {
            // Case: Only endDate is provided (search up to that date)
            const formattedEndDate = new Date(endDate).toISOString();
            query.where('subscriptions.created_at', '<=', formattedEndDate);
        }

        // Sorting
        query.orderBy(sortBy, sortOrder);

        // Pagination
        const offset = (page - 1) * limit;
        const logs = await query.page(offset / limit, limit);

        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error searching logs:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const GetCustomerKyc = async (customerNumber) => {

    let customerData = null;

    try {
        const wsdlUrl = process.env.CUSTOMER_KYC_URL;
        const username = process.env.CBS_USERNAME;
        const password = process.env.CBS_PASSWORD;


        const Authorization = {
            username,
            password
        };

        const request = {
            CustomerRequest: {
                customerNumber: customerNumber
            }
        };

        const client = await soap.createClientAsync(wsdlUrl);

        client.setSecurity(new soap.BasicAuthSecurity(Authorization.username, Authorization.password));


        const result = await client.CustomerAsync(request);
        customerData = result[0]?.CustomerResponse?.customer;

        return customerData;

    } catch (error) {
        console.log(error);
        return null;
    }
}

exports.GetCustomerKyc = GetCustomerKyc;