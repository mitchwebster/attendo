var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var dbConfig = require('./dbConfig');

var portNumber = 8080;
var app = express();
app.use(bodyParser.json())

console.log('Listening on port ', portNumber);


function validateInput(value) {
	return value != null && value != "";
}

MongoClient.connect(dbConfig.url, function(err, db) {
	if (err) {
		console.log("Could not connect to the database");
		console.log(err);
	} else {
		//routes
		app.post('/api/test', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			res.send({err : false, msg: "API is online"});
		});

		app.post('/api/login', function(req, res) {
			if (!req.body || !validateInput(req.body.username)) {
				res.send({err : true, msg: "Invalid username"})
			} else {
				var collection = db.collection('Attendance');
				var curTime = new Date();
				var usrname = req.body.username;
				//TODO: need to look up the building, also need to add the course
				var building = "Klaus 2164";
				var course = "CS 3510"
				var attendanceData = {"username": usrname, "time": curTime, "building": building, "course": course};

				collection.insert(attendanceData, {w:1}, function(err, result) {
					if (err) {
						res.send({err : true, msg: "Database issue"});
					} else {
						res.send({err : false, msg: ("Checked in to " + course + " at " + curTime) });
					}
				});
			}
		});

		//TODO: should probably be paged 
		//TODO: may need some sort of authentication here
		app.post('/api/attendanceData', function(req, res) {
			if (!req.body || !validateInput(req.body.username)) {
				res.send({err : true, msg: "Invalid username"})
			} else {
				var usrname = req.body.username;
				db.collection('Attendance').find({"username" : usrname}, {"username": true, "building": true, "course": true, "time": true, "_id": false}).toArray(function(err, data) {
					if (err) {
						res.send({err : true, msg: "Database issue"});
					} else {
						res.send({err : false, attendance: data});
					}
				});
			}
		});
		
		app.listen(portNumber);
	}
});