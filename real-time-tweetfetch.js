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

var client = new Twitter({
    consumer_key: keys.storageConfig.TWITTER_key,
    consumer_secret: keys.storageConfig.TWITTER_secret,
    access_token: keys.storageConfig.TWITTER_access_token,
    access_token_secret: keys.storageConfig.TWITTER_access_token_secret
});

var topics = 'Arsenal,virat,kohli,football,trump,kim,kardashian,music,ManUtd,religion,food, ' +
    'movies,hilary,clinton,chelsea,africa,asia,europe,america,celebraties,disney,goal,GOT,WalkingDead_AMC,cricket,'+
    'president,debate,wwe,india,entertainment,faith,god,premierleague,LaLiga,ChampionsLeague,SerieA_TIM,election,apple'+
    'social,politics,rvp,dance,australia,';


var stream = client.stream('statuses/filter', {track: topics}, {locations: ['-180','-90','180','90']});

stream.on('tweet', function(tweet) {
    if((tweet.geo != null) && (tweet.text.lang = 'en')) {
        console.log("Tweet: "+tweet.text);

        var obj = {
            'username': tweet.user.name,
            'text': tweet.text,
            'location': tweet.geo
        };

        console.log(obj);

        var sendParams = {
            MessageBody: JSON.stringify(obj),
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/130072839416/tweet-map', /* required */
            DelaySeconds: 0,
            MessageAttributes: {

            }
        };
        sqs.sendMessage(sendParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else    { console.log("Pushed to SQS\n");

            }
        });

    }
});
stream.on('error', function(error) {
    throw error;
});

