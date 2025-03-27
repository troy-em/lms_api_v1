const ClientApp = require("../client-app/clientApp.model");
const Status = require("../status/status.model");
const bcrypt = require('bcryptjs');
const config = require("../../config/auth.config");
const jwt = require('jsonwebtoken');
const RefreshToken = require("./refreshToken.model");
require('dotenv').config();



exports.CreateClient = async (req, res) => {

  const requiredAttributes = ['name', 'url', "password", "email"];
  const missingAttributes = requiredAttributes.filter(attr => !req.body[attr]);

  if (missingAttributes.length > 0) {
    return res.status(400).send({ message: `Missing attributes: ${missingAttributes.join(', ')}` });
  }

  // Check if all required attributes have non-undefined values
  const hasUndefinedAttributes = requiredAttributes.some(attr => req.body[attr] === undefined);

  if (hasUndefinedAttributes) {
    return res.status(400).send({ message: 'All attributes must have values.' });
  }

  try {

    // Password strength check
    const password = req.body.password;
    if (!isStrongPassword(password)) {
      return res.status(400).send({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    // check if cient already exists
    const clientExists = await ClientApp.query().where({"name": req.body.name}).first();

    if (clientExists) {
      return res.status(400).send({message: 'Failed: Client name already exists'});
    }

    // get active status
    const activeStatus = await Status.query().where({name: "active"}).first();

    if (!activeStatus) {
      return res.status(400).send({message: 'Failed: Could not get status details'});
    }

    const payload = {
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      url: req.body.url,
      status_id: parseInt(activeStatus.id)
    };


    const newClientApp = await ClientApp.query().insert(payload);

    // Generate JWT token
    const token = jwt.sign({ id: newClientApp.id }, config.secret, { expiresIn: config.jwtExpiration });

    // Create refresh token
    const refreshToken = await RefreshToken.createToken(newClientApp);

    return res.status(201).send({
      message: "Client was registered successfully!",
      client: {
        id: newClientApp.id,
        name: newClientApp.name,
        email: newClientApp.email,
        url: newClientApp.url
      },
      status: {
        id: activeStatus.id,
        name: activeStatus.name
      },
      accessToken: token,
      refreshToken: refreshToken
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
};

exports.GetTokens = async (req, res) => {
  try {
    const client = await ClientApp.query().where({ name: req.body.name }).first();

    if (!client) {
      return res.status(401).send({ message: "Incorect login credentials." });
    }

    const passwordIsValid = bcrypt.compareSync(req.body.password, client.password);

    if (!passwordIsValid) {
      return res.status(401).send({ message: "Incorect login credentials." });
    }

    const client_status = await client.$relatedQuery('status');

    if (!client_status.id){
      return res.status(401).send({ message: "Access not allowed for this client !." });
    }

    if (client_status.name !== "active"){
      return res.status(401).send({ message: "Sorry, client is " +  client_status.name + " !."});
    }

    const token = jwt.sign({ id: client.id }, config.secret, { expiresIn: config.jwtExpiration });
    // console.log(config.jwtExpiration)

    let refreshToken = await RefreshToken.createToken(client);


    return res.status(200).send({
      accessToken: token,
      refreshToken: refreshToken,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Cannot read properties of undefined (reading 'id')"){
      return res.status(401).send({ message: "Access not allowed for this client !." });
    }
    return res.status(500).send({ message: error.message });
  }
};

exports.RefreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;

  if (!requestToken) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }

  try {
    let refreshToken = await RefreshToken.query().where({ token: requestToken }).first();

    if (!refreshToken) {
      return res.status(403).json({ message: "Refresh token not found!" });
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      await RefreshToken.query().delete().where({ id: refreshToken.id });

      return res.status(403).json({
        message: "Refresh token Has expired. Please make a new tokens request",
      });
    }

    const client = await refreshToken.$relatedQuery('client');

    let newAccessToken = jwt.sign({ id: client.id }, config.secret, { expiresIn: config.jwtExpiration });

    return res.status(200).json({ accessToken: newAccessToken, refreshToken: refreshToken.token });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
};

exports.InitiatePasswordReset = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(404).send({ message: 'Invalid request' });
    }

    // Check if the name exists
    const client = await ClientApp.query().where({ name }).first();
    if (!client) {
      return res.status(404).send({ message: 'Client not found' });
    }

    const otp = await PasswordResetOTP.createOTP(client.id);

    if (otp) {
      emailTransporter.sendMail({
        from: process.env.SMTP_MAIL_SENDER,
        to: client.email,
        subject: 'Password Reset Code',
        html: `<b>Hi,</b><br>
                <p>You requested for a code to facilitate your account password reset.<br>
                Please use the code below;<br>
                <span style="font-weight:bold;font-size:26px;color:darkgray;">${otp}</span></p>
                <h2>If this wasn't you !</h2>
                <p>This email was sent because someone attempted to reset your credable lms client account password.<br>The attempt included your correct email address.<br>
                Please  ignore this email or contact us at <em>support@credablelms.com</em></p>`,
      }).then(info => {
        console.log('Email sent:', info.response);
        return res.status(200).send({ message: 'Password reset code sent successfully.' });
      }).catch(error => {
        console.error('Error sending email:', error);
        return res.status(400).send({ message: 'Error sending password reset code.' });
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
}

exports.PasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const { otp } = req.body;
    const { password } = req.body;

    // console.log(email, otp, password)
    if (!email || !otp || !password) {
      return res.status(404).send({ message: 'Invalid request' });
    }

    // Check if the email exists in the database
    const client = await ClientApp.query().where({ email }).first();
    if (!client) {
      return res.status(404).send({ message: 'Invalid request' });
    }

    // check password strength
    if (!isStrongPassword(password)) {
      return res.status(400).send({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    // Validate OTP
    const validOTP = await PasswordResetOTP.verifyOTP(otp, client.id);

    if (!validOTP) {
      return res.status(404).send({ message: 'Invalid or Expired Code' });
    }

    // Update client password
    const hashedPassword = bcrypt.hashSync(password, 8);
    client.password = hashedPassword;
    client.updated_at = new Date().toISOString();

    await client.$query().patch();

    emailTransporter.sendMail({
      from: process.env.SMTP_MAIL_SENDER,
      to: client.email,
      subject: 'Password Reset Successfully',
      html: `<b>Hi,</b><br>
              <p>Your Client password was reset successfully.</p><br>
              <h2>If this wasn't you !</h2>
              <p>This email was sent because someone successfully reset your credable lms client account password.<br>
              Urgently contact us at <em>support@credablelms.com</em></p>`,
    }).then(info => {
      console.log('Email sent:', info.response);
      return res.status(200).send({ message: 'Password reset successfully.' });
    }).catch(error => {
      console.error('Error sending email:', error);
      return res.status(400).send({ message: 'Error sending password reset code.' });
    });


  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }

}

const ValidateClient = async (username, password) => {

  try {
    const client = await ClientApp.query().where({ username }).first();

    if (!client) {
      return false;
    }

    const passwordIsValid = bcrypt.compareSync(password, client.password);

    if (!passwordIsValid) {
      return false;
    }

    const client_status = await client.$relatedQuery('status');

    if (!client_status.id){
      return false;
    }

    if (client_status.name !== "active"){
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }

}

exports.ValidateClient = ValidateClient;

function isStrongPassword(password) {
  // Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

