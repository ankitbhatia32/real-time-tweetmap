var http = require("http");
var elasticsearch = require('elasticsearch');
var keys = require('./config.js')
var fs = require("fs");
var requestVar = require("request");

var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

var accesskey = keys.storageConfig.AWS_access_key;
var secretaccesskey = keys.storageConfig.AWS_secret_access_key;

var tweet_arn = "arn:aws:sns:us-east-1:130072839416:tweet-processing";
var access = new AWS.Credentials({
    accessKeyId: accesskey, secretAccessKey: secretaccesskey
});

var sns = new AWS.SNS({apiVersion: '2010-03-31',credentials : access});

http.createServer(function(request, response){

    if(request.method == 'POST') {
        console.log("Got a POST request");
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('OK');
    }

    else if (request.method == 'GET') {
        response.writeHead(200, {"Content-Type": "text",'Access-Control-Allow-Origin': '*'});
        var client = new elasticsearch.Client({
            host: 'https://search-realtimetweetmap-twl6f6qyheujjo6uxk5h3vij44.us-east-1.es.amazonaws.com/domain/realtweet'
        });
        hits = '';
        url = request.url;
        console.log(url);
        /*client.search({
         q: url.substring(1),
         size: 100000
         }).then(function (body) {
         var hits = body.hits.hits;
         console.log(request.url);
         console.log("hits: "+(JSON.stringify(hits.length)));
         response.write(JSON.stringify(hits,null,3));
         //for( i =0; i < hits.length; i++)
         // console.log(i+": "+(hits[i]._source.location.coordinates)+"|| Sentiment: "+ (hits[i]._source.sentiment.type));
         response.end();
         }, function (error) {
         console.trace(error.message);
         });*/
    }
    //concatenate POST data
    var msgBody = '';
    request.on( 'data', function( data ){
        msgBody += data;
    });
    request.on( 'end', function(){
        var msgData = JSON.parse( msgBody );
        var msgType = request.headers[ 'x-amz-sns-message-type' ];
        handleIncomingMessage( msgType, msgData );
    });

    response.end( 'OK' );

}).listen(8080);

console.log("Listening...");

function handleIncomingMessage( msgType, msgData ) {
    if( msgType === 'SubscriptionConfirmation') {
        //confirm the subscription.
        console.log("got SnS Confirm message");
        console.log(msgData.Token);
        snsParams = {
            Token: msgData.Token,
            TopicArn: msgData.TopicArn
        };
        sns.confirmSubscription(snsParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    } else if ( msgType === 'Notification' ) {
        // That's where the actual messages will arrive
        dataMessage = JSON.parse(msgData.Message);
        postToES(dataMessage);
    } else {
        console.log( 'Unexpected message type ' + msgType );
    }
}

function postToES(dataMessage){
    console.log(dataMessage);
    try
    {
        requestVar({
            uri: 'https://search-realtimetweetmap-twl6f6qyheujjo6uxk5h3vij44.us-east-1.es.amazonaws.com/domain/realtweet',
            method: "POST",
            json: dataMessage
        }).on('response', function(response) {
            console.log("Row "+response.statusMessage+" with location: "+JSON.stringify(dataMessage.location));
        });
    }
    catch(e) {
        console.log (e);
    }
}