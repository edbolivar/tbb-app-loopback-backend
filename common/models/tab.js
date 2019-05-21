'use strict';
const twilioAccountSid = 'ACdca8b2d0bbc376b7ceca625a0ad90c85'; // TEST Credentials
const twilioAuthToken = 'c8f81034a71562b964fba70074a2f6c2'; // TEST AUTHTOKEN

module.exports = function(Tab) {
  Tab.updateStatus = function(tabId, status, url, cb) {
    Tab.findById(tabId, {include: ['business', 'customer']}, (err, res) => {
      if (err) {
        cb(err, {status: false, message: err.message});
        return;
      }

      const business = res.business();
      if (!business) {
        cb(err, {status: false, message: 'Business phone number is not found'});
        return;
      }

      const customer = res.customer();
      if (!customer) {
        cb(null, {status: false, message: 'User phone number is not found'});
        return;
      }

      let message = '';
      if (status === 'Closed') {
        message = `${customer.pin} is ready to close out!\n${url}`;
      } else if (status === 'TBBBOUT') {
        message = `${customer.pin} has paid their tab!\n${url}`;
      } else {
        cb(null, {status: true, message: 'Successfully done!'});
        return;
      }

      const client = require('twilio')(twilioAccountSid, twilioAuthToken);
      client.messages
          .create({
            from: `+1${customer.phoneNumber}`, // test phone number: +15005550006
            to: `+1${business.businessPhone}`,
            body: message,
          })
          .then(message => {
          })
          .catch(err => {
          });

      Tab.updateAttributes({id: tabId, status}, (err, res) => {
        if (err) {
          cb(null, {status: true, message: 'Successfully done!'});
        } else {
          cb(err, {status: false, message: 'Cannot update database'});
        }
      });
    });
  };

  Tab.remoteMethod('updateStatus', {
    accepts: [
      {
        arg: 'tabId',
        type: 'string',
      },
      {
        arg: 'status',
        type: 'string',
      },
      {
        arg: 'url',
        type: 'string',
      },
    ],
    http: {
      path: '/closeOut',
      verb: 'post',
    },
    returns: {
      arg: 'status',
      type: 'object',
    },
  });
};
