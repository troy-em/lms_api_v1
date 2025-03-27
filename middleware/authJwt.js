const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const Client = require("../src/client-app/clientApp.model.js");


verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized!' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).send({
      message: "No token provided!"
    });
  }
  jwt.verify(token, config.secret, (err) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized!"
      });
    }
    next();
  });
};


isActive = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized!' });
  }

  const accessToken = authHeader.split(' ')[1];
  const decodedToken = jwt.verify(accessToken, config.secret);
  const clientId = decodedToken.id;

  try {
    const client = await Client.query().findById(clientId);
    const client_status = await client.$relatedQuery('status');

    if (client_status.name === "active"){
      next();
    } else {
      return res.status(401).send({ message: "Sorry, client is " +  client_status.name + " !."});
    }

  } catch (error) {
    console.error("Error in isActive middleware:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
}


const authJwt = {
  verifyToken: verifyToken,
  isActive: isActive,
};

module.exports = authJwt;