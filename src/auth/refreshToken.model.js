const { Model } = require('objection');
const { v4: uuidv4 } = require("uuid");
const { knex } = require('../../config/db.config');
const schema = require('./refreshToken.schema.json');
const config = require("../../config/auth.config");

Model.knex(knex);

class RefreshToken extends Model {
    static get tableName() {
        return 'refresh_token';
    }

    static get jsonSchema() {
        return schema;
    }

    static async createToken(client) {
        const expiredAt = new Date();
        expiredAt.setSeconds(expiredAt.getSeconds() + config.jwtRefreshExpiration);
        const _token = uuidv4();

        const refreshToken = await RefreshToken.query().insert({
            token: _token,
            client_id: parseInt(client.id),
            expiry_date: expiredAt.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        return refreshToken.token;
    }

    static verifyExpiration(token) {
        return token.expiry_date.getTime() < new Date().getTime();
    }

    static get relationMappings() {
        const Client = require('../client-app/clientApp.model');

        return {
            client: {
                relation: Model.BelongsToOneRelation,
                modelClass: Client,
                join: {
                    from: 'refresh_token.client_id',
                    to: 'clients.id'
                }
            }
        };
    }
}

module.exports = RefreshToken;
