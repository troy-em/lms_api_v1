const { Model } = require('objection');
const schema = require('./status.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);


class Status extends Model {
    static get tableName() {
        return 'status';
    }

    static get jsonSchema() {
        return schema;
    }

}

module.exports = Status;
