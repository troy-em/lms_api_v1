const { Model } = require('objection');
const schema = require('./loanPayment.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);

class LoanPayment extends Model {
    static get tableName() {
        return 'loan_payment';
    }

    static get jsonSchema() {
        return schema;
    }

    static get relationMappings() {
        const LoanRequest = require('../loan-request/loanRequest.model');

        return {
            loanRequest: {
                relation: Model.BelongsToOneRelation,
                modelClass: LoanRequest,
                join: {
                    from: 'loan_payment.loan_request_id',
                    to: 'loan_request.id'
                }
            }
        };
    }
}

module.exports = LoanPayment;
