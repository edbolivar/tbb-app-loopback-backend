'use strict';
const request = require('request');
const endpoint = 'https://api.authy.com/protected/json/phones/verification';
const apiKey = '';
// const stripe = require('stripe')('pk_live_sgS1RlkHPrXFwsrGCulyv6X2');
const stripe = require('stripe')('sk_test_E9PIsa9IF9AMu6Vdhz23JaES');
var Mailchimp = require('mailchimp-api-v3')

var mailchimp = new Mailchimp("");
module.exports = function(User) {
  User.observe('before save', (ctx, next) => {
    const now = new Date();
    if (
      ctx.instance &&
      ctx.instance.firstName &&
      ctx.instance.lastName &&
      !ctx.instance.pin
    ) {
      console.log('create pin');
      ctx.instance.pin = makePIN(ctx.instance.firstName, ctx.instance.lastName);
    }
    return process.nextTick(() => next());
  });

  User.addInfoToMailChimp = (userEmail, firstName, lastName, cb) => {

      const requestData = {
        api_key: apiKey,
        via: 'sms',
        country_code: 1,
      };

      mailchimp.post('lists/0dad57e116/members', {
          email_address : userEmail,
          status : 'subscribed',
          merge_fields: {
            "FNAME": firstName,
            "LNAME": lastName
          }
        })
        .then(function(results) {
          cb(null, {status: false, message: results});
        })
        .catch(function (err) {
          cb(null, {status: false, message: err});
      })
    };

    User.remoteMethod(
      'addInfoToMailChimp', {
        accepts: [
          {
            arg: 'userEmail',
            type: 'string',
          },
          {
            arg: 'firstName',
            type: 'string',
          },
          {
            arg: 'lastName',
            type: 'string',
          },

        ],
        http: {
          path: '/addInfoToMailChimp',
          verb: 'post',
        },
        returns: {
          arg: 'status',
          type: 'object',
        },
      }
    );
  User.verifyPhone = (userEmail, number, cb) => {
    const requestData = {
      api_key: apiKey,
      via: 'sms',
      phone_number: number,
      country_code: 1,
    };

    User.find({where: {phoneNumber: number}}, (err, res) => {
      if (err) {
        cb(err, {status: false, message: 'Cannot save phone number on the current user!'});
        return;
      }
      if (res.length) {
        cb(err, {status: false, message: 'Phone number already registered.'});
        return;
      }
      request.post({url: `${endpoint}/start`, formData: requestData}, (err, httpResponse, body) => {
        if (err) {
          cb(null, {status: false, message: 'Verify request failed!'});
          return;
        }
        User.upsertWithWhere({email: userEmail}, {email: userEmail, phoneNumber: number},
          (err, res) => {
            if (err) {
              cb(err, {status: false, message: 'Cannot save phone number on the current user!'});
            } else {
              cb(err, {status: true, message: 'Successfully done!'});
            }
          }
        );
      });
    });
  };

  User.remoteMethod(
    'verifyPhone', {
      accepts: [
        {
          arg: 'userEmail',
          type: 'string',
        },
        {
          arg: 'number',
          type: 'string',
        },
      ],
      http: {
        path: '/verifyPhone',
        verb: 'post',
      },
      returns: {
        arg: 'status',
        type: 'object',
      },
    }
  );

  User.confirmCode = function(userEmail, phoneNumber, code, cb) {
    const requestData = {
      api_key: apiKey,
      verification_code: code,
      phone_number: phoneNumber,
      country_code: 1,
    };

    request.get({url: `${endpoint}/check`, qs: requestData}, (err, httpResponse, body) => {
      if (err) {
        cb(null, {status: false, message: 'Confirm request failed!'});
      } else {
        let jsonResult = JSON.parse(body);
        if (jsonResult.success) {
          User.upsertWithWhere({email: userEmail}, {phoneVerified: true},
            (err, res) => {
              if (err) {
                cb(null, {status: false, message: 'Cannot save confirmation status on the user\'s profile!'});
              } else {
                cb(null, {status: true, message: 'Successfully confirmed!'});
              }
            });
        } else {
          cb(null, {status: false, message: 'Incorrect code!'});
        }
      }
    });
  };

  User.remoteMethod(
    'confirmCode', {
      accepts: [
        {
          arg: 'userEmail',
          type: 'string',
        },
        {
          arg: 'phoneNumber',
          type: 'string',
        },
        {
          arg: 'code',
          type: 'string',
        },
      ],
      http: {
        path: '/confirmCode',
        verb: 'post',
      },
      returns: {
        arg: 'status',
        type: 'object',
      },
    }
  );

  User.payment = function(email, token, amount, cb) {
    stripe.charges.create({
      amount: amount * 100,
      currency: 'usd',
      description: 'Convenience Fee',
      source: token,
    }, function(err, charge) {
      if (err) {
        cb(null, {status: false, message: err.message});
      } else {
        User.upsertWithWhere({email: email}, {paymentConfirmed: true},
          (error, res) => {
            if (error) {
              cb(null, {status: false, message: 'Cannot save payment status on the user\'s profile!'});
            } else {
              cb(null, {status: true, message: 'Successfully!'});
            }
        });
      }
    });
  };

  User.remoteMethod(
    'payment', {
      accepts: [
        {
          arg: 'email',
          type: 'string',
        },
        {
          arg: 'token',
          type: 'string',
        },
        {
          arg: 'amount',
          type: 'number',
        },
      ],
      http: {
        path: '/payment',
        verb: 'post',
      },
      returns: {
        arg: 'status',
        type: 'object',
      },
    }
  );

  function makePIN(firstName, lastName) {
    var pin = firstName.charAt(0) + lastName.charAt(0);
    var possible = '0123456789';

    for (var i = 0; i < 4; i++)
      pin += possible.charAt(Math.floor(Math.random() * possible.length));

    return pin;
  }
};
