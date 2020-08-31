/**
 *  
 * Simple Express Server / Twitter APP
 * with SimpleMemoryStore
 * - PUT/POST akzeptiert nur JSONs
 * 
 * @author Florian Taute
 *         Duygu Koese
 *         Achim Schliebener
 *         Mohamad Ali
 * 
 * @licence Public Domain
 * @version 1.0
 * 
 */

// Testkommentar
"use strict";

    // 1. - REQUIRES ----------------------------------------------
    // ------------------------------------------------------------
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const store = new (require('simple-memory-store'))();
const HttpError = require('./http-error.js');

    // 2. - CONFIG ------------------------------------------------
    // ------------------------------------------------------------    
const port = 3000;
store.initWithDefaultData();    // Füllt DB-Objekt mit ein paar Testdaten
const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

    // 3. - FUNCTIONS ---------------------------------------------
    // ------------------------------------------------------------

/**
 * createUrl() erstellt eine zusammengesetzt URL aus dem Hostnamen,
 * verwendeten Serverport und dem übergebenen Pfad.
 * 
 * @param {*} req (übergebenes) HTTP-Anforderungsargument
 * @param {*} path (übergebener) Ordner-Pfad der an die URL angehängt wird
 */
function createUrl(req, path){
    return 'http://' + req.hostname + ':' + port + path;
}

    // 4. - MIDDLEWARE --------------------------------------------
    // ------------------------------------------------------------

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

    // 5. - ERRORHANDLING -----------------------------------------
    // ------------------------------------------------------------

// Accept Version

// app.use((req, res, next) => {
//     console.log(req.headers);
//     console.log("-------------");
//     console.log(req.get('accept-version'));
//     if ( req.get("accept-version") !== "1" ) {
//         var err = new HttpError('Falsche Version!', 500)
//         next(err);
//         return;
//     }
//     next();
// });

/**
 * Wrong-Method Middleware
 * Überprüft auf nicht erlaubte Anfragemethoden. Nur GET/PUT/POST/DELETE erlaubt.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.use((req,res,next) => {
    if (req.method != "GET" && req.method != "PUT" && req.method != "POST" && req.method != "DELETE") {
        var err = new HttpError('Methode:' + req.method + ' ist nicht erlaubt!',405);
        next (err);
        return;
    } else {
        next();
    }
});

/**
 * Wrong-Content-Type Middleware
 * Überprüft PUT/POST Anfragen auf nicht erlaubte Medientypen. Nur JSON erlaubt.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.use ((req, res, next) => {
    if (req.method == "PUT" && req.is('json') != 'json' ) {
        var err = new HttpError('Nur JSON erlaubt! Sorry!' , 406);
        next(err);
        return;
    }
    if (req.method == "POST" && req.is('json') != 'json' ) {
        var err = new HttpError('Nur JSON erlaubt! Sorry!' , 406);
        next(err);
        return;
    } else {
        next();
    }
});

    // 6. - ROUTES ------------------------------------------------
    // ------------------------------------------------------------

/**
 * GET Tweets Route 
 * bei GET Anfrage auf /tweets/ werden alle Tweets als JSON zurückgegeben
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.get('/tweets', (req,res, next) => {
    if (store.select('tweets') == undefined) {
        // Fehlerbehandlung keine Daten
        var err = new HttpError('Keine Tweets gefunden!', 404);
        next(err);
        return;
    }
    // Antwort mit Daten befüllen
    var result = {
        items: store.select('tweets'),
        href: createUrl(req, '/tweets/')
    };
    // href
    result.items.forEach((item) => {
        item.href = createUrl(req, '/tweets/' + item.id);
        item.user.href = createUrl(req, '/users/' + item.user.id);
    })
    res.json(result);
});

/**
 * POST Tweet Route 
 * bei POST Anfrage auf /tweets/ wird (wenn Daten vorhanden) ein neuer Tweet 
 * erstellt. Bei Erfolg wird der Statuscode "created" gesetzt und die Daten als JSON übergeben
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.post('/tweets', (req,res,next) => {
    if (req.body.message && req.body.user){
        // füge Timestamp hinzu
        req.body.timestamp = new Date().getTime();
        var result = {
            items: store.insert('tweets', req.body),
            href: createUrl(req, '/tweets/')
        };
        res.status(201).json(result);
    } else {
        // Fehlerbehandlung falsche Daten
        var err = new HttpError('Falsche Daten!', 400);
        next(err)
        return;
    }
});
    

/**
 * GET Tweet by ID Route 
 * bei GET Anfrage auf /tweets/ mit dem Zusatz :id  wird ein einzelner Tweet, sofern vorhanden,
 * auf Basis der ID gesucht und als JSON zurückgegeben.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.get('/tweets/:id', (req,res,next) => {
    var request = store.select('tweets', req.params.id);
    if (request == null){
        // Fehlerbehandlung keine Daten
        var err = new HttpError('Diesen Tweet gibt es nicht', 404)
        next(err)
        return;
    } else {
        request.href = createUrl(req, '/tweets/' + req.params.id)
        request.user.href = createUrl(req, '/users/' + request.user.id);
        res.json(request);
    }
});

/**
 * DELETE Tweet by ID Route 
 * bei DELETE Anfrage auf /tweets/ mit dem Zusatz :id  wird ein einzelner Tweet, sofern vorhanden,
 * auf Basis der ID gesucht und aus dem Speicher entfernt.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.delete('/tweets/:id', (req,res,next) => {
    var request = store.select('tweets', req.params.id);
    if (request == null) {
        var err = new HttpError('Diesen Tweet gibt es nicht!', 404)
        next(err)
        return;
    }
    store.remove('tweets', req.params.id);
    res.status(200).json(check);
});

/**
 * GET Users Route 
 * bei GET Anfrage auf /users/ werden alle Nutzer, sofern welche vorhanden sind,
 * mit dynamisch hinzugefügtem href als JSON zurückgegeben.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.get('/users', (req,res) => {
    var result = {
        items: store.select('users'),
        href: createUrl(req, '/users')
    };
    result.items.forEach((item) => {
        item.href = createUrl(req, '/users/' + item.id);
        item.tweets = {};
        item.tweets.href = createUrl(req, '/users/' + item.id + '/tweets');
    })
    res.json(result);
});

/**
 * GET User by ID Route 
 * bei GET Anfrage auf /users/ mit dem Zusatz :id  wird der Nutzer dieser ID, sofern vorhanden,
 * mit dynamisch hinzugefügtem href als JSON zurückgegeben.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.get('/users/:id', (req,res,next) => {
    var request = store.select('users', req.params.id);
    if (request == null){
        let err = new HttpError('Diesen User gibt es nicht!',404)
        next(err)
        return;
    }else {
        request.href = createUrl(req, '/users/' + request.id);
        request.tweets = { };
        request.tweets.href = createUrl(req, '/users/' + request.id + '/tweets');
        res.json(request);
    }
});


    // 7. - RESTE-EIMER -------------------------------------------
    // ------------------------------------------------------------

/**
 * 404 Error-Handling
 * wenn eine Anfrage hier ankommt, hat sie keine passende Route, oder Error Handler passiert/gefunden
 * und ist demzufolge nicht zustellbar. Die Anfrage kann nicht weiter bearbeitet werden. Wir geben
 * einen 404 Error mit "page not found" aus.
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.use((req, res, next) => {
    var err = new HttpError('Seite nicht gefunden', 404);
    next(err);
    return;
});

/**
 * Error-Message Handler
 * fängt hochgereichte Error auf und übergibt die Message gefiltert an den Anfrager zurück
 * @param {*} err hochgereichtes Error-Argument
 * @param {*} req HTTP-Anforderungsargument
 * @param {*} res HTTP-Antwortsargument
 * @param {*} next Callback-Argument zur Middlewarefunktion (next ist konventionell)
 */
app.use((err, req, res, next) => {
    //res.status(err.status || 500);
    //console.log(err.message + '  Status-Code: ' +err.status);
    //res.send(err.message + '  Status-Code: ' +err.status);
    var error = {
        error: {
            message: err.message,
            path: req.path,
            error: err.stack.toString()
        }
    };
    console.log('ERROR: ' + err.stack.toString());
    res.status(err.status);
    res.json(error);
});

    // 8. - SERVERSTART -------------------------------------------
    // ------------------------------------------------------------

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
