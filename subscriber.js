var http = require("http");
var elasticsearch = require('elasticsearch');
var keys = require('./config.js')
var fs = require("fs");
var requestVar = require("request");


var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

var accesskey = keys.storageConfig.AWS_access_key;
var secretaccesskey = keys.storageConfig.AWS_secret_access_key;

var tweet_arn = "arn:aws:sns:us-east-1:130072839416:tweet-processing-2";
var access = new AWS.Credentials({
    accessKeyId: accesskey, secretAccessKey: secretaccesskey
});

var sns = new AWS.SNS({apiVersion: '2010-03-31',credentials : access});

http.createServer(function(request, response){

    if(request.method == 'POST') {
        console.log("Got a POST request");
        var msgBody = '';
        request.on( 'data', function( data ){
            msgBody += data;
        });
        request.on( 'end', function(){
            var msgData = JSON.parse( msgBody );
            var msgType = request.headers[ 'x-amz-sns-message-type' ];
            handleIncomingMessage( msgType, msgData );
        });
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end('OK');
    }

    else if (request.method == 'GET') {
        response.writeHead(200, {"Content-Type": "text",'Access-Control-Allow-Origin': '*'});
        var client = new elasticsearch.Client({
            host: 'https://search-realtimetweetmap-twl6f6qyheujjo6uxk5h3vij44.us-east-1.es.amazonaws.com/domain/realtweet'
        });
        hits = '';
        type = request.url.substring(1);
        var topics = ["Sports,Arsenal,virat,kohli,football,ManUtd,cricket,LaLiga,premierleague,wwe,goal,aussie,ChampionsLeague,SerieA_TIM",
            "Music,jayz,eminem,micheal,jackson,starboy,maroon 5,",
            "Trump,hilary,clinton,election,president,politics,modi",
            "Food,apple,banana,pizza,thai,continental,italian,mexican,indian,mughlai",
            "Dance,salsa,classical,western,hippop,freestyle,arts,belle",
            "Football,football,ManUtd,Arsenal,LaLiga,premierleague,ChampionsLeague,SerieA_TIM",
            "Movies,tom,cruise,srk,kim,kardashian,celebraties,western,drama,comedy,cinema,hollywood,bollywood",
            "Entertainment,Movies,tom,cruise,srk,kim,kardashian,celebraties,GOT,WalkingDead_AMC",
            "Election,Trump,hilary,clinton,election,politics,president,modi,kejriwal",
            "Disney,donald,duck,mickey,mouse,frozen,walt"];


        if(type == "Sports"){type = topics[0];}
        else if(type == "Music"){type = topics[1];}
        else if(type == "Trump"){type = topics[2];}
        else if(type == "Food"){type = topics[3];}
        else if(type == "Dance"){type = topics[4];}
        else if(type == "Football"){type = topics[5];}
        else if(type == "Movies"){type = topics[6];}
        else if(type == "Entertainment"){type = topics[7];}
        else if(type == "Election"){type = topics[8];}
        else if(type == "Disney"){type = topics[9];}


        console.log("the url caught is : "+type);
        client.search({
            q: type,
            size: 1000
        }).then(function (body) {
            var hits = body.hits.hits;
            console.log(request.url);
            console.log("hits: "+(JSON.stringify(hits.length)));
            response.write(JSON.stringify(hits,null,3));

            response.end();
        }, function (error) {
            console.trace(error.message);
        });
    }
    //concatenate POST data
    else
        response.end();

}).listen(8081);

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
            if (err) console.log(err, err.stack); 
            else     console.log(data);           
        });
    } else if ( msgType === 'Notification' ) {
      
        try {
            dataMessage = JSON.parse(msgData.Message);
            postToES(dataMessage);
        }catch(e) {}
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