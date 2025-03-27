const { Model } = require('objection');
const schema = require('./loanRequest.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);

class LoanRequest extends Model {
    static get tableName() {
        return 'loan_request';
    }

    static get jsonSchema() {
        return schema;
    }

    static get relationMappings() {
        const LoanStatus = require('../loan-status/loanStatus.model');
        const LoanPayment = require('../loan-payment/loanPayment.model');

        return {
            loanStatus: {
                relation: Model.HasOneRelation,
                modelClass: LoanStatus,
                join: {
                    from: 'loan_request.id',
                    to: 'loan_status.loan_request_id'
                }
            },
            payments: {
                relation: Model.HasManyRelation,
                modelClass: LoanPayment,
                join: {
                    from: 'loan_request.id',
                    to: 'loan_payment.loan_request_id'
                }
            }
        };
    }
}

module.exports = LoanRequest;
