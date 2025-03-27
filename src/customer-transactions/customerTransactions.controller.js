const soap = require('soap');
require('dotenv').config();
const authController = require('../auth/authController');
const { ValidateClient } = authController;

exports.GetTransactions = async (req, res) => {

    try {

        // POSSIBLEISSUE - there was not directions on how the [BASIC AUTHENTICATION USERNAME] and [BASIC AUTHENTICATION PASSWORD] will be posted by the scoring engine
        // so I used the req.body to get the username and password from the request body and validate

        // .............................. * no clear directive * .................... //

        if (!req.body.username || !req.body.password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const validClient = await ValidateClient(req.body.username, req.body.password);

        if (!validClient) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // .......................................................................... //
        //

        const wsdlUrl = process.env.CUSTOMER_TRANSACTIONS_URL;
        const username = process.env.CBS_USERNAME;
        const password = process.env.CBS_PASSWORD;

        const { customerNumber } = req.params;

        const Authorization = {
            username,
            password
        };

        const request = {
            TransactionsRequest: {
                customerNumber: customerNumber
            }
        };

        const client = await soap.createClientAsync(wsdlUrl);

        client.setSecurity(new soap.BasicAuthSecurity(Authorization.username, Authorization.password));


        const result = await client.TransactionsAsync(request);
        const transactions = result[0]?.TransactionsResponse?.transactions || [];

        return res.status(200).send({transactions});

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

