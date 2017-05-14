const _ = require('lodash');
const assert = require('assert');
const postmark = require('postmark');
const Q = require('q');

const Mailer = function Mailer() {};

const convertEmailHelper = function convertEmailHelper(emailObject) {
  let emailString = '';
  if (_.isString(emailObject)) {
    emailString = emailObject;
  } else if (_.isObject(emailObject)) {
    if (emailObject.address && emailObject.name) {
      emailString = `${emailObject.name} <${emailObject.address}>`;
    } else if (emailObject.address) {
      emailString = emailObject.address;
    }
  }
  return emailString;
};

/**
 * Configure and create an instance of the connector
 */
const PostmarkConnector = function PostmarkConnector(settings) {
  assert(_.isObject(settings), 'cannot init connector without settings');
  assert(_.isString(settings.api_key), 'cannot init connector without api key');
  this.postmark = new postmark.Client(settings.api_key);
};

PostmarkConnector.initialize = function (dataSource, cb) {
  dataSource.connector = new PostmarkConnector(dataSource.settings); // eslint-disable-line
  cb();
};

PostmarkConnector.prototype.DataAccessObject = Mailer;

Mailer.send = function (options, cb) {
  const dataSource = this.dataSource;
  const connector = dataSource.connector;
  const deferred = Q.defer();

  const fn = function (err, result) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(result);
    }
    return cb && cb(err, result);
  };

  assert(connector, 'Cannot send mail without a connector!');

  if (connector.postmark) {
    const postmarkEmail = {
      From: convertEmailHelper(options.from),
      To: convertEmailHelper(options.to),
      Cc: convertEmailHelper(options.cc),
      Subject: options.subject || '',
      TextBody: options.text || '',
      HtmlBody: options.html || '',
      Tag: options.tag || '',
      Attachments: [],
    };

    if (_.isArray(options.attachments)) {
      _.each(options.attachments, function eachFile(attachment) {
        if (_.isObject(attachment)) {
          postmarkEmail.Attachments.push({
            Content: attachment.content,
            ContentType: attachment.type,
            Name: attachment.filename,
          });
        }
      });
    }

    connector.postmark.sendEmail(postmarkEmail, function sendEmail(error, result) {
      if (error) {
        fn(null, error);
      } else {
        fn(result);
      }
    });
  } else {
    process.nextTick(function nextTick() {
      fn(null, options);
    });
  }
  return deferred.promise;
};

/**
 * Send an email instance using instance
 */
Mailer.prototype.send = function protoSend(fn) {
  return this.constructor.send(this, fn);
};

/**
 * Export the connector class
 */
module.exports = PostmarkConnector;
