/**
 *  
 * Express-Websocket Chatserver
 * Storing Data as RDF Triples on a JENA FUSEKI Server
 * 
 * @author Florian Taute
 *         Achim Schliebener
 *         Mohamad Ali
 * 
 * @licence Public Domain
 * @version 1.0
 * 
 */

"use strict";

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const store = new (require('simple-memory-store'))();
const HttpError = require('./http-error.js');

const port = 3000;
const app = express();
const expressWs = require('express-ws')(app);
app.use(express.static('public'));
app.use(bodyParser.json());

var clients = {};

function postMessage(sender, recipient, text) {
    var request = require('request');
    var now = new Date();
    console.log(now);
    var myjsonld = {
        "@context" : "http://schema.org/",
        "@type" : "Message",
        "@id" : now,
        "sender" : {
            "@id" : sender,
            "@type" : "Person",
            "name" : sender,
        },
        "recipient" : {
            "@id" : recipient,
            "@type" : "Person",
            "name" : recipient,
        },
        "text" : text
    }

    request.post( {
        headers: {'content-type' : 'application/ld+json'},
        url:'http://localhost:3030/ds/data',
        method: 'post',
        json: true,
        body: myjsonld,
        function (error, response, body) {
            console.log(body);
            console.log(response.statusCode)
            console.warn(error);
        }
    });
}

function getMessages (sender, recipient, callback) {
    var request = require('request');
    var opt = {
        "Accept" : "application/json",
    }
    
    var options = {

        "to" : "PREFIX schema: <http://schema.org/>"
        + " SELECT ?text ?message ?person WHERE "
        + " {{"
        + " ?person schema:name '"+ sender+ "' ."
        + " ?message schema:sender ?person ."
        + " ?message schema:text ?text ."
        + " ?recipient schema:name '"+recipient+ "' ."
        + " ?message schema:recipient ?recipient ."
        + " }"
        + " UNION {"
        + " ?person schema:name '"+ recipient+ "' ."
        + " ?message schema:sender ?person ."
        + " ?message schema:text ?text ."
        + " ?recipient schema:name '"+ sender+ "' ."
        + " ?message schema:recipient ?recipient ."
        + "}}"
        + " ORDERBY DESC(?message)"
    }

    console.log("GET ALL NODES:");

    request.get('http://localhost:3030/ds/sparql?query='+encodeURIComponent(options.to),opt,function(error,response,body){
        if(error) {
            console.warn(error);
        } else if(response.statusCode == 200 ) {
            console.log(body);
            callback("History:"+body);
        } else {
            console.log("What happened?");
            console.log(response.statusCode);
            console.log(response);
        }
    });
}


app.ws('/', (client, req) => {
    client.on('message', message => {
        var parsedJson = JSON.parse(message);
        console.log("User connected: ")
        if ("name" in parsedJson) {
            clients[parsedJson.name] = client;
        } else {
            var text = parsedJson.message;
            var key = parsedJson.recipient;
            postMessage(parsedJson.sender, parsedJson.recipient, text);
            console.log(getMessages(parsedJson.sender, parsedJson.recipient, function(body) {
                client.send(body);
            }));
            if (!(clients[key] === undefined)) {
                clients[parsedJson.recipient].send(parsedJson.message);
            } else {
                client.send("Recipient is not online! He will get the message when he comes back.");
            }
        }
    });
    client.on('close', () => {
        console.log(client);
        console.log("Connection Closed");
    });
});

/**
 * Logging Middleware
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.use((req, res, next) => {
    console.log(`REQUEST-TYP: ${req.method} ----- PATH: ${req.originalUrl}`);
    next();
});

/**
 * Server-Start / Log
 * @param {*} err hochgereichtes Error-Argument
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.listen(port, (err) => {
    if (err !== undefined) {
        console.log('Error beim starten:' + err);
    } else { 
        console.log("Server läuft auf Port:" + port);
    }
});
