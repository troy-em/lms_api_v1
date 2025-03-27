const { Model } = require('objection');
const schema = require('./subscription.schema.json');
const { knex } = require('../../config/db.config')
Model.knex(knex);

class Subscription extends Model {
    static get tableName() {
        return 'subscription';
    }

    static get jsonSchema() {
        return schema;
    }

    static get relationMappings() {
        const SubscriptionStatus = require('../status/status.model');
        const SubscriptionClient = require('../client-app/clientApp.model');

        return {
        status: {
            relation: Model.BelongsToOneRelation,
            modelClass: SubscriptionStatus,
            join: {
            from: 'subscription.status_id',
            to: 'status.id',
            },
        },

        client: {
            relation: Model.BelongsToOneRelation,
            modelClass: SubscriptionClient,
            join: {
            from: 'subscription.client_id',
            to: 'clients.id',
            },
        },
        };
    }
}

module.exports = Subscription;
