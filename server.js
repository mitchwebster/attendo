var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var async = require('async');
var time = require('time');
var MongoClient = require('mongodb').MongoClient;
var dbConfig = require('./dbConfig');
var util = require('./util');

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
		//setup indicies for DB
		db.collection('Courses').createIndex({"crn": 1, "term": -1}, {unique: true, unique: true});
		db.collection('Users').createIndex({"username": 1, "term": -1}, {unique: true, unique: true});

		//routes
		app.post('/api/test', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			res.send({err : false, msg: "API is online"});
		});

		//first time setup
		app.post('/api/userSetup', function(req, res) {
			if (!req.body || !util.validate(req.body.username) || !req.body.courses || !req.body.courses.length || req.body.courses.length <= 0) {
				res.send({err : true, msg: "Invalid request"})
			} else {
				var courses = [];
				var invalid = false;
				var crns = [];
				for (var i = 0; i < req.body.courses.length && !invalid; i++) {
					var incomingObject = {
						"courseNumber" : req.body.courses[i].courseNumber,
						"school" : req.body.courses[i].school,
						"crn" : req.body.courses[i].crn,
						"instructor" : req.body.courses[i].instructor,
						"location" : req.body.courses[i].location,
						"time" : req.body.courses[i].time,
						"days" : req.body.courses[i].days
					}
					var course = util.createCourse(incomingObject);
					if (course === null) {
						invalid = true;
					} else {
						courses.push(course);
						crns.push(course.crn);
					}
				}
				if (invalid) {
					res.send({err : true, msg: "Invalid request"})
				} else {
					var term = util.findTerm();
					var user = {
						"username" : req.body.username,
						"term" : term,
						"crns" : crns
					}

					var asyncCalls = [];
					asyncCalls.push(function (callback) {
						db.collection('Courses').insert(courses, {ordered: false}, function(err, result) {
							if (err) {
								callback(null, "CoursesFailure");
							} else {
								callback(null, "Success");
							}
						});
					});
					asyncCalls.push(function (callback) {
						db.collection('Users').insert(user, {w:1}, function(err, result) {
							if (err) {
								callback(null, "UsersFailure");
							} else {
								callback(null, "Success");
							}
						});
					});
					async.parallel(asyncCalls, function(err, results) {
						if (results[1] !== "Success") {
							res.send({err : true, msg: "Invalid Request"});
						} else {
							res.send({err : false, msg: "Properly Setup User"})
						}
					});
				}
			}
		});

		//Post request to find their courses
		app.post('/api/myCourses', function(req, res) {
			if (!req.body || !util.validate(req.body.username)) {
				res.send({err : true, msg: "Invalid username"})
			} else {
				db.collection('Users').findOne({"username": req.body.username, "term": util.findTerm()}, {crns : 1, "_id": false}, function(err, result) {
					if (err) {
						res.send({err : true, msg: "Invalid Request"});
					} else {
						crns = result.crns
						db.collection('Courses').find({crn : {$in : crns}}, {"_id": false, "crn" : true, "courseNumber": true, "school": true, "instructor": true, "location": true}).toArray(function(err, data) {
							var i = 0;
							while (i < data.length) {
								data[i].course = data[i].school + " " + data[i].courseNumber;
								delete data[i]["school"]
								delete data[i]["courseNumber"]
								i++;
							}
							if (err) {
								res.send({err : true, msg: "Invalid Request"});
							} else {
								res.send({err : false, courses: data});
							}
						});
					}
				});
			}
		});

		//Post to checkin
		app.post('/api/checkin', function(req, res) {
			if (!req.body) {
				res.send({err : true, msg: "Invalid request"})
			} else {
				var username = util.validate(req.body.username);
				var crn = util.validate(req.body.crn, "int")
				var rLoc = util.validate(req.body.routerLocation);
				var term = util.findTerm();
				if (!username || !crn || !rLoc) {
					res.send({err : true, msg: "Invalid request"})
				} else {
					db.collection('Courses').findOne({crn : crn, term: term}, {"_id": false, "crn" : true, "location": true, "startTime": true, "days": true}, function(err, result) {
						if (err || result === null) {
							res.send({err : true, msg: "Invalid Request"});
						} else {
							//Time validation
							var now = new time.Date();
							now.setTimezone("America/New_York");
							var startDate = util.startTimeNow(result.startTime);
							if (util.dateDiffMinutes(startDate, now) < 5 && util.dayMapper(result.days, now)) {
								//TODO: continue with location testing
								var attendanceObject = {
									"username": username,
									"term" : term,
									"crn" : crn,
									"time" : new Date()
								}

								db.collection('Attendance').insert(attendanceObject, {w:1}, function(err, result) {
									if (err) {
										res.send({err : true, msg: "Invalid Request"});
									} else {
										res.send({err : false, msg: "Checked In"});
									}
								});
							} else {
								//failed time validation
								res.send({err : true, msg: "Invalid request"});
							}
						}
					});
				}
			}
		});

		//TODO: should probably be paged 
		//TODO: may need some sort of authentication here
		app.post('/api/attendanceData', function(req, res) {
			if (!req.body || !util.validate(req.body.username)) {
				res.send({err : true, msg: "Invalid username"})
			} else {
				var usrname = req.body.username;
				var course = util.validate(req.body.crn, "int");
				if (course === null) {
					db.collection('Attendance').find({"username" : usrname}, {"time": true, "_id": false}).toArray(function(err, data) {
						if (err) {
							res.send({err : true, msg: "Database issue"});
						} else {
							res.send({err : false, attendance: data});
						}
					});
				} else {
					db.collection('Attendance').find({"username" : usrname, "crn": course}, {"time": true, "_id": false}).toArray(function(err, data) {
						if (err) {
							res.send({err : true, msg: "Database issue"});
						} else {
							res.send({err : false, attendance: data});
						}
					});
				}
			}
		});
		
		app.listen(portNumber);
	}
});