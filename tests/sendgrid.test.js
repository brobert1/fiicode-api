require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const sgMail = require('@sendgrid/mail');
const { expect } = require('chai');
const { describe, it } = require('mocha');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

describe('SendGrid', () => {
  it('sends an email', async () => {
    // Arrange
    const msg = {
      to: 'test@example.com', // Change to your recipient
      from: process.env.SENDGRID_EMAIL, // Change to your verified sender
      subject: 'Sending with SendGrid is Fun',
      text: 'and easy to do anywhere, even with Node.js',
      html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    };

    // Act
    const response = await sgMail.send(msg);

    // Assert
    expect(response).to.be.an('array');
    expect(response[0]?.statusCode).to.equal(202);
  });
});
