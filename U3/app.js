/*****************************************************************/
/*  RESTful Express Server with Support for GraphCool            */
/*  based on SPARQL                                              */
/** @author Florian Taute                                        */
/** @licence MIT                                                 */
/** @version 1.0                                                 */
/*****************************************************************/

/*
ADD TEST DATA ON SERVER IN THE FOLLOWING FORM, SERVER NOT PERSISTENT WHILE PRODUCTION:
PREFIX schema: <http://schema.org/>
INSERT DATA
{ <http://localhost:3030/users> schema:user <http://localhost:3030/users/101> .
  <http://localhost:3030/users/101> schema:name "Florian Taute" .
  <http://localhost:3030/users/101> schema:tweets <http://localhost:3030/users/101/tweets/> .
  <http://localhost:3030/users/101/tweets/> schema:tweet  <http://localhost:3030/users/101/tweets/1> . 
  <http://localhost:3030/users/101/tweets/> schema:tweet  <http://localhost:3030/users/101/tweets/2> . 
  <http://localhost:3030/users/101/tweets/1> schema:text "Mein erster schöner Tweet..." .
  <http://localhost:3030/users/101/tweets/2> schema:text "Mein zweiter schöner Tweet..." .
  <http://localhost:3030/users> schema:user <http://localhost:3030/users/102> .
  <http://localhost:3030/users/102> schema:name "Achim Schliebener" .
  <http://localhost:3030/users/102> schema:tweets <http://localhost:3030/users/102/tweets/> .
  <http://localhost:3030/users/102/tweets/> schema:tweet  <http://localhost:3030/users/102/tweets/1> . 
  <http://localhost:3030/users/102/tweets/> schema:tweet  <http://localhost:3030/users/102/tweets/2> . 
  <http://localhost:3030/users/102/tweets/1> schema:text "Erstens: Bleib ruhig!" .
  <http://localhost:3030/users/102/tweets/2> schema:text "Zweitens: Bleib ruhiger!" .
}
*/

const express = require('express')
const app = express()
const port = 3000
var bodyParser = require('body-parser')
app.use(bodyParser.json());

/***************************************/
/*          SPARQL FUNCTION            */
/***************************************/
function sparqlQuery (method, action, query, data) {
    /* 
        ATTENTION - SUBJECT TO CHANGE - probably use request-promise instead
        We are using manual Promise on our functions, because we cant access our variables from
        an asynchronous callback within a synchronous Graphqool Resolver function --
        since we use this functions for every other Route, we use async/await everywhere
        Following the advise we got here: https://stackoverflow.com/questions/56496776/how-to-get-data-from-an-asynchronous-callback-inside-a-synchronous-root-function
    */
    return new Promise(function (resolve, reject) {
        /***************************************/
        /*          SPARQL QUERYS              */
        /***************************************/
        var queryGetUsers = `
        PREFIX schema: <http://schema.org/>
        SELECT ?user ?name ?tweets
        WHERE {
          ?users schema:user ?user .
          ?user schema:name ?name .
          ?user schema:tweets ?tweets
        }`
        var queryGetUser = `
        PREFIX schema: <http://schema.org/>
        SELECT (<http://localhost:3030/users/${data.id}>) ?name ?tweets
        WHERE {
        <http://localhost:3030/users/${data.id}> schema:name ?name .
        <http://localhost:3030/users/${data.id}> schema:tweets ?tweets
        }`
        var queryPostUser = `
        PREFIX schema: <http://schema.org/>
        INSERT DATA {
        <http://localhost:3030/users> schema:user <http://localhost:3030/users/${data.id}> .
        <http://localhost:3030/users/${data.id}> schema:name "${data.name}" .
        <http://localhost:3030/users/${data.id}> schema:tweets <http://localhost:3030/users/${data.id}/tweets/>
        }`
        var queryGetTweets = `
        PREFIX schema: <http://schema.org/>
        SELECT ?user ?tweet ?text
        WHERE {
          ?user schema:tweets ?tweets .
          ?tweets schema:tweet ?tweet .
          ?tweet schema:text ?text
        }`
        var queryGetTweetsByUserID = `
        PREFIX schema: <http://schema.org/>
        SELECT ?user ?tweet ?text
        WHERE {
            <http://localhost:3030/users/${data.userid}> schema:tweets ?tweets .
            ?tweets schema:tweet ?tweet .
            ?tweet schema:text ?text
        }
        `
        var queryGetTweet = `
        PREFIX schema: <http://schema.org/>
        SELECT (<http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}>) ?text
        WHERE {
        <http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}> schema:text ?text
        }`
        var queryPostTweet = `
        PREFIX schema: <http://schema.org/>
        INSERT DATA {
            <http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}> schema:text "${data.text}"
        }`
        var queryDeleteTweet = `
        PREFIX schema: <http://schema.org/>
        DELETE WHERE {
        ?tweets schema:tweet <http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}> .
        <http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}> schema:text ?text;
        }`
        var queryDeleteTweetOnly = `
        PREFIX schema: <http://schema.org/>
        DELETE WHERE {
        <http://localhost:3030/users/${data.userid}/tweets/${data.tweetid}> schema:text ?text;
        }`
        var queryDeleteUser = `
        PREFIX schema: <http://schema.org/>

        DELETE WHERE { ?users schema:user <http://localhost:3030/users/${data.userid}>.
          <http://localhost:3030/users/${data.userid}> schema:name ?name.
          <http://localhost:3030/users/${data.userid}> schema:tweets ?tweets.
          ?tweets schema:tweet ?tweet .
          ?tweet schema:text ?text;
        }`
        var queryDeleteUserOnly = `
        PREFIX schema: <http://schema.org/>

        DELETE WHERE { ?users schema:user <http://localhost:3030/users/${data.userid}>.
          <http://localhost:3030/users/${data.userid}> schema:name ?name
        }
        `

        /***************************************/
        /*           QUERY SETTERS             */
        /***************************************/
        console.log("SPARQL TRANSLATOR FUNCTION CALLED")
        console.log("Method: "+method+" Action: "+action)
        console.log("Data: "+JSON.stringify(data))
        console.log("----------------------------")
        if (action == "getusers") {
            query = queryGetUsers;
        }
        if (action == "getuser") {
            query = queryGetUser;
        }
        if (action == "postuser") {
            query = queryPostUser;
        }
        if (action == "deleteuser") {
            query = queryDeleteUser;
        }
        if (action == "deleteuseronly") {
            query = queryDeleteUserOnly;
        }
        if (action == "gettweets") {
            query = queryGetTweets;
        }
        if (action == "gettweet") {
            query = queryGetTweet;
        }
        if (action == "gettweetsbyuserid") {
            query = queryGetTweetsByUserID;
        }
        if (action == "posttweet") {
            query = queryPostTweet;
        }
        if (action == "deletetweet") {
            query = queryDeleteTweet;
        }
        if (action == "deletetweetonly") {
            query = queryDeleteTweetOnly;
        }
        /***************************************/
        /*           SPARQL METHODS            */
        /***************************************/
        if (method == "get") {
            var request = require('request')
            request.get('http://localhost:3030/ds/sparql?query='+encodeURIComponent(query)+'&format=json',function(error,response,body) {
                temp = JSON.parse(body).results.bindings
                resolve(temp)
            })
        }
        // We are using POST for the FUSEKI Server, even when the intention is PUT. We simply delete the original
        // RDF Triple inside our query before inserting new Data - which resolves to smth "like" PUT
        if (method == "post") {
            var request = require('request')
            request.post({
                headers: {'content-type':'application/x-www-form-urlencoded'},
                url: 'http://localhost:3030/ds/update?update='+encodeURIComponent(query),
            },
                function (error, response, body) {
                    resolve(body)
                })
            }
        })
}

/***************************************/
/*           SPARQL BLOCK              */
/***************************************/
app.route('/sparql')
    .get( async (req, res) => {
        if (req.body.query != null) {
            let data = await sparqlQuery("get", "", req.body.query, "")
            res.send(data);
        } else {
            res.error(400);
        }
    })
    .post( async (req, res) => {
        if (req.query != null) {
            let data = await sparqlQuery("post", "", req.body.query, "")
            res.send(data);
        } else {
            res.error(400);
        }
    })
    .put((req, res) => {
        res.send("PUT on /sparql not supported. Use POST instead")
    })
    .delete((req, res) => {
        res.send("DELETE on /sparql not supported. Use POST instead")
    })

/***************************************/
/*          GRAPHQL METHODS            */
/***************************************/
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');

const schema = buildSchema(`
    input UserInput {
        name: String!
    }
    input UserDeleteInput {
        userid: Int!
    }
    input TweetInput {
        userid: Int!
        text: String!
    }
    input TweetDeleteInput {
        userid: Int!
        tweetid: Int!
    }
    type Query {
        users: String
        user (id: Int!): String
        tweets: String
        tweet (id: Int!): String
    }
    type Mutation {
        createUser(input: UserInput): String
        deleteUser(input: UserDeleteInput): String
        createTweet(input: TweetInput): String
        deleteTweet(input: TweetDeleteInput): String
    }
    `)
    // Todo: deleteUser and deleteTweet
const root = {
    users: async () => {
        let data = await sparqlQuery("get", "getusers", "","")
        return JSON.stringify(data)
    },
    user: async (id) => {
        let data = await sparqlQuery("get", "getuser", "", id)
        return JSON.stringify(data)
    },
    tweets: async () => {
        let data = await sparqlQuery("get", "gettweets", "","")
        return JSON.stringify(data)
    },
    tweet: async (id) => {
        let data = await sparqlQuery("get", "gettweet", "", id)
        return JSON.stringify(data)
    },
    createUser: async (user) => {
        let tempUsers = await sparqlQuery("get", "getusers", "","")
        user.input.id = tempUsers.length+101
        let data = await sparqlQuery("post", "postuser", "", user.input)
        return JSON.stringify(data)
    },
    createTweet: async (tweet) => {
        let tempTweet = await sparqlQuery("get", "gettweetsbyuserid", "",tweet.input)
        tweet.input.tweetid = tempTweet.length+1
        let data = await sparqlQuery("post", "posttweet", "", tweet.input)
        return JSON.stringify(data)
    },
    deleteUser: async (userid) => {
        let data = await sparqlQuery("post", "deleteuser", "", userid.input)
        return JSON.stringify(data)
    },
    deleteTweet: async (tweetid) => {
        let data = await sparqlQuery("post", "deletetweet", "", tweetid.input)
        return JSON.stringify(data)
    }
}

app.use('/graphql', graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
}))

/***************************************/
/*             USERS BLOCK             */
/***************************************/
app.route('/users')
    .get( async (req, res) => {
        let data = await sparqlQuery("get", "getusers", "", "")
        res.send(data);
    })
    .put( (req, res) => {
        console.log("app.put auf /users wurde aufgerufen. Das Ersetzen aller User mit einem put ist nicht gestattet. Liefer Fehlermeldung zurück.")
        res.send('Operation not allowed')
    })
    .post( async (req, res) => {
        let tempUsers = await sparqlQuery("get", "getusers", "","")
        req.body.id = tempUsers.length+101
        let data = await sparqlQuery("post", "postuser", "", req.body)
        res.send(data)
    })
    .delete((req, res) => {
        console.log("app.delete auf /users wurde aufgerufen. Das Löschen aller User auf einmal ist nicht gestattet. Liefere Fehlermeldung aus. ")
        res.send('Operation not allowed')
    })

app.route('/users/:id')
    .get( async (req, res) => {
        let data = await sparqlQuery("get", "getuser", "", req.params)
        res.send(data);
    })
    .put( async (req, res) => {
        req.params.userid = req.params.id
        req.params.name = req.body.name
        let temp = await sparqlQuery("post", "deleteuseronly", "", req.params)
        let data = await sparqlQuery("post", "postuser", "", req.params)
        res.send(data)
    })
    .post((req, res) => {
        console.log("app.post auf users:" + req.params.id + " wurde aufgerufen. Post auf spezielle ID ist nicht gestattet. Fehlermeldung wird ausgeliefert.")
        res.send('Operation not allowed')
    })
    .delete( async (req, res) => {
        req.params.userid = req.params.id
        let data = await sparqlQuery("post", "deleteuser", "", req.params)
        res.send(data)
    })

/***************************************/
/*         tweets  block               */
/***************************************/
app.route('/tweets')
    .get( async (req, res) => {
        let data = await sparqlQuery("get", "gettweets", "", "")
        res.send(data)
    })
    .put((req, res) => {
        console.log("app.put auf /tweets wurde aufgerufen, aber PUT auf allen tweets ist nicht gestattet. ")
        res.send('Operation not allowed')
    })
    .post((req, res) =>{
        res.send("post on /tweets not supported. Use /users/:userid/tweets/:tweetid instead")
    })
    .delete((req, res) => {
        console.log("app.delete auf /tweets wurde aufgerunfen. Das Löschen aller Tweets ist nicht erlaubt.")
        res.send('Operation not allowed')
    })

app.all('/tweets/:id', (req,res) => {
    res.send("Operation not allowed. Use /users/:userid/tweets/:tweetid instead")
})

/***************************************/
/*      tweets of user block           */
/***************************************/
app.route('/users/:userid/tweets')
    .get( async (req, res) => {
        let data = await sparqlQuery("get", "gettweetsbyuserid", "",req.params)
        res.send(data)
    })

app.route('/users/:userid/tweets/:tweetid')
    .get( async (req, res) => {
        let data = await sparqlQuery("get", "gettweet", null, req.params)
        res.send(data);
    })
    .put( async (req, res) => {
        req.params.text = req.body.text
        let temp = await sparqlQuery("post", "deletetweetonly", "", req.params)
        let data = await sparqlQuery("post", "posttweet", "", req.params)
        res.send(data)
    })
    .post((req, res) => {
        console.log("app.put auf tweets:" + req.params.id + " wurde aufgerufen. POST auf ID ist nicht erlaubt.")
        res.send('Operation not allowed')
    })
    .delete( async (req, res) =>  {
        let temp = await sparqlQuery("post", "deletetweetonly", "", req.params)
        res.send(temp)
    })

/******************************************/
/*       express.static, start server     */
/******************************************/
app.use(express.static('public'))
app.use('*', (req, res) => res.contentType('text/plain').sendStatus(404))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))