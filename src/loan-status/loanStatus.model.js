const { Model } = require('objection');
const schema = require('./loanStatus.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);

class LoanStatus extends Model {
    static get tableName() {
        return 'loan_status';
    }

    static get jsonSchema() {
        return schema;
    }

    static get relationMappings() {
        const LoanRequest = require('../loan-request/loanRequest.model');
        const LoanPayment = require('../loan-payment/loanPayment.model');
        const Status = require('../status/status.model');

        return {
            loanRequest: {
                relation: Model.BelongsToOneRelation,
                modelClass: LoanRequest,
                join: {
                    from: 'loan_status.loan_request_id',
                    to: 'loan_request.id'
                }
            },
            payments: {
                relation: Model.HasManyRelation,
                modelClass: LoanPayment,
                join: {
                    from: 'loan_status.loan_request_id',
                    to: 'loan_payment.loan_request_id'
                }
            },
            status: {
                relation: Model.BelongsToOneRelation,
                modelClass: Status,
                join: {
                    from: 'loan_status.status_id',
                    to: 'status.id'
                }
            }
        };
    }
}

module.exports = LoanStatus;
