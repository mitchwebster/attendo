var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var dbConfig = require('./dbConfig');

var portNumber = 8080;
var app = express();

console.log('Listening on port ', portNumber);

MongoClient.connect(dbConfig.url, function(err, db) {
	if (err) {
		console.log("Could not connect to the database");
		console.log(err);
	} else {
		var collection = db.collection('Users');

		var testDoc = {"username": "mitch"};

		//routes
		app.post('/api/test', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			collection.insert(testDoc, {w:1}, function(err, result) {
				if (err) {
					res.send({err : true, msg: "Something went wrong"});
				} else {
					res.send({err : false, msg: "Thank you for hitting our api"});
				}
			});
		});
		
		app.listen(portNumber);
	}
});