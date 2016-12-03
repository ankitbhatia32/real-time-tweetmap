/**
 * Created by ankitbhatia on 11/27/16.
 */
var fs = require("fs");
var request = require("request");
var keys = require('./config.js');
var Twitter = require('twit');
var AWS = require('aws-sdk');
var accesskey = keys.storageConfig.AWS_access_key;
var secretaccesskey = keys.storageConfig.AWS_secret_access_key;

var access = new AWS.Credentials({
    accessKeyId: accesskey, secretAccessKey: secretaccesskey
});
AWS.config.update({region:'us-east-1'});
var sqs = new AWS.SQS({apiVersion: '2012-11-05', credentials : access});
var sns = new AWS.SNS({apiVersion: '2010-03-31',credentials : access});

var tweet_arn = "arn:aws:sns:us-east-1:130072839416:tweet-processing-2"

var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
    api_key: keys.storageConfig.alchemy_key
});

var para = {
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/130072839416/tweet-map',
    MaxNumberOfMessages: 1,
    AttributeNames: [
        "All"
    ],
    /* more items */
    VisibilityTimeout: 43200,
    WaitTimeSeconds: 20
};



(function loop() {
    console.log("trying to fetch tweets from SQS queue...\n");
    sqs.receiveMessage(para, function(err, data) {
        if (err) {
            console.log(err);
        }// an error occurred
        else {
            fetchedText = JSON.parse(data.Messages[0].Body);
            console.log("Fetched: ",JSON.parse(data.Messages[0].Body))

            var alchemyParams = {
                text: fetchedText.text,
                outputMode: 'json',
                showSourceText: 1   };

            console.log("Doing Sentimental Analysis now...\n");
            alchemy_language.sentiment(alchemyParams, function (err, response) {
                if (err) {
                    console.log("Alchemy Error Occured...Moving on to next tweet\n"+JSON.stringify(err)); // an error occurred
                    process.nextTick(loop);
                }
                else {
                    var sentiment = JSON.parse(JSON.stringify(response)).docSentiment;
                    var message = {"default":`{"username": "${fetchedText.username}", 
                                    "text": "${fetchedText.text}", 
                                    "location": ${JSON.stringify(fetchedText.location)}, 
                                    "sentiment": ${JSON.stringify(sentiment)}}`};
                    console.log(sentiment);
                    var SNSParams = {
                        Message: JSON.stringify(message), /* required */
                        MessageStructure: 'json',
                        TopicArn: tweet_arn};
                    sns.publish(SNSParams, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        else     {
                            console.log(data);           // successful response
                            console.log("SNS Params: "+SNSParams.toString());

                            process.nextTick(loop);
                        }

                    });

                }

            });
        }
    });

}());



