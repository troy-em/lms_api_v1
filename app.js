const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();


const indexRouter = require('./routes/index');

// var corsOptions = {
//     origin: "http://localhost:8081",
//     origin: "http://localhost:3031",
//     origin: "http://127.0.0.1:3031",
// };

const corsOptions = {
    origin: '*',
    credentials: true, // access-control-allow-credentials:true
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(express.json({ limit: '50mb' }));
app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//const db = require("./api/models");

app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const elapsed = Date.now() - start;
        let statusCodeColor;
        switch (Math.floor(res.statusCode / 100)) {
            case 2:
                statusCodeColor = '\x1b[32m'; // Green for 2xx status codes
                break;
            case 4:
                statusCodeColor = '\x1b[33m'; // Yellow for 4xx status codes
                break;
            case 5:
                statusCodeColor = '\x1b[31m'; // Red for 5xx status codes
                break;
            default:
                statusCodeColor = '\x1b[0m'; // Default color (reset)
        }
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${statusCodeColor}${res.statusCode}\x1b[0m ${elapsed} ms - -`);
    });
    next();
});

// // simple route
// require('./app/routes/auth.routes')(app);
// require('./app/routes/user.routes')(app);
app.use('/', indexRouter);

module.exports = app;
