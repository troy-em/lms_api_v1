
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const helpers = {
    delay
}

module.exports = helpers;