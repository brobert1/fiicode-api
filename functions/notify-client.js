/* eslint-disable no-console */

const handlebars = require('handlebars');
const sgMail = require('@sendgrid/mail');
const { confirmAccount } = require('views');
const { Confirm } = require('@models');
const crypto = require('crypto');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const template = handlebars.compile(confirmAccount);

async function sendConfirmationEmail({ client }) {
  const hash = crypto
    .createHash('sha256')
    .update(client._id.toString() + Date.now()?.toString())
    .digest('hex');

  await Confirm.create({
    hash,
    identity: client.id,
    expirationDate: Date.now() + 24 * 3600 * 1000,
  });

  const htmlToSend = template({
    username: client.name,
    platformLink: `${process.env.APP_BASE_URL}/client/${hash}`,
  });

  const msg = {
    to: client.email,
    from: process.env.SENDGRID_EMAIL,
    subject: 'Account created successfully',
    html: htmlToSend,
  };

  if (!process.env.SENDGRID_API_KEY) {
    console.info('Email nu a fost trimis pentru că nu a fost setat SENDGRID_API_KEY');
    return;
  }

  try {
    await sgMail.send(msg);
    console.info(`Email trimis cu succes către ${client.email}`);
  } catch (error) {
    console.error('Eroare la trimiterea mail-ului:', error);
  }
}

module.exports = {
  sendConfirmationEmail,
};
