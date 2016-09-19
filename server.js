var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

var MongoClient = require('mongodb').MongoClient;

var portNumber = 8080;
var app = express();

app.post('/api/test', function(req, res) {
	// console.log(req);
	console.log("Someone hit the test api");
	res.send({err : false, msg: "Thank you for hitting our api"});
});

console.log('Listening on port ', portNumber);

app.listen(portNumber);