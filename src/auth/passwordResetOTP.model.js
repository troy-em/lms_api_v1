const { Model } = require('objection');
const { knex } = require('../../config/db.config');
const schema = require('./passwordResetOTP.schema.json');
require('dotenv').config();

Model.knex(knex);

class PasswordResetOTP extends Model {
    static get tableName() {
        return 'password_reset_otp';
    }

    static get jsonSchema() {
        return schema;
    }

    static async createOTP(clientId) {
        const expiredAt = new Date();
        const expirationTimeInSeconds = parseTimeToSeconds(process.env.OTP_EXPIRATION_TIME)
        expiredAt.setSeconds(expiredAt.getSeconds() + expirationTimeInSeconds);
        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const passwordResetOTP = await PasswordResetOTP.query().insert({
            otp: otp,
            client_id: parseInt(clientId),
            expiry_date: expiredAt.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        return passwordResetOTP.otp;
    }

    static async verifyOTP(otp, clientId) {
        const otpRecord = await PasswordResetOTP.query()
            .where({ clientId, otp }).first();

        if (!otpRecord) {
            // No OTP record found for the client
            return false;
        }

        // Check if the OTP has expired
        const currentTime = new Date().getTime();
        const expiryTime = new Date(otpRecord.expiry_date).getTime();

        // remove  all OTP for clientId from the database after verification to prevent reuse
        await PasswordResetOTP.query().delete().where('client_id', clientId);

        return currentTime < expiryTime;

    }

    static get relationMappings() {
        const Client = require('../client-app/clientApp.model');

        return {
            client: {
                relation: Model.BelongsToOneRelation,
                modelClass: Client,
                join: {
                    from: 'password_reset_otp.client_id',
                    to: 'clients.id'
                }
            }
        };
    }
}

function parseTimeToSeconds(timeString) {
    const units = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400,
        'w': 604800
    };

    const match = timeString.match(/^(\d+)([smhdw])$/);
    if (!match) {
        throw new Error('Invalid time string format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    if (!(unit in units)) {
        throw new Error('Invalid time unit');
    }

    return value * units[unit];
}

module.exports = PasswordResetOTP;
