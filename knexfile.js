
require('dotenv').config();

module.exports = {
    development: {
        client: 'pg',
        connection: {
            database: process.env.POSTGRES_DB,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            host: process.env.POSTGRES_HOST,
        },
        // migrations: {
        //   directory: './db/migrations',
        // },
        // seeds: {
        //   directory: './db/seeds',
        // },
    },
};
