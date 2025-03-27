const { Model } = require('objection');
const schema = require('./clientApp.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);

class ClientApp extends Model {
  static get tableName() {
    return 'client';
  }

  static get jsonSchema() {
    return schema;
  }

  static get relationMappings() {
    const ClientStatus = require('../status/status.model');

    return {
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: ClientStatus,
        join: {
          from: 'client.status_id',
          to: 'status.id',
        },
      },
    };
  }
}

module.exports = ClientApp;
