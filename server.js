var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var async = require('async');
var time = require('time');
var http = require('http');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var dbConfig = require('./dbConfig');
var util = require('./util');

var portNumber = 8080;
var app = express();
app.use(bodyParser.json())

console.log('Listening on port ', portNumber);

MongoClient.connect(dbConfig.url, function(err, db) {
	if (err) {
		console.log("Could not connect to the database");
		console.log(err);
	} else {
		//setup indicies for DB
		db.collection('Courses').createIndex({"crn": 1, "term": -1}, {unique: true, unique: true});
		db.collection('Users').createIndex({"username": 1, "term": -1}, {unique: true, unique: true});

		app.use("/", express.static("public"));

		app.get("/", function (req, res) {
			res.sendFile(path.resolve('./public/views/index.html'));
		});

		//routes
		app.post('/api/test', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			res.send({err : false, msg: "API is online"});
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
						if (result == null) {
							res.send({err : false, userExists: false, courses: []});
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
									res.send({err : false,  userExists: true, courses: data});
								}
							});
						}
					}
				});
			}
		});

		app.post('/api/coursePrompt', function(req, res) {
			if (!req.body || !req.body.courses || !req.body.courses.length || req.body.courses.length <= 0) {
				res.send({err : true, msg: "Invalid request"})
			}
			var courseTitles = req.body.courses;
			var asyncCalls = [];
			var term = util.findTerm();

			courseTitles.forEach(function (element, index, titles) {
				asyncCalls.push(function (callback) {
					var school = "";
					var courseNumber = "";
					if (element.indexOf("-") >= 0) {
						var fdash = element.indexOf("-");
						school = element.substring(0, fdash);
						var remaining = element.substring(fdash + 1, element.length);
						if (remaining.indexOf("-") >= 0) {
							var ndash = remaining.indexOf("-");
							courseNumber = remaining.substring(0, ndash);
						} else {
							console.log("Not sure how to parse this, second dash");
							callback(null, "Failed Parsing");
						}
						var searchString = 'http://coursesat.tech/' + term + '/' + school + '/' + courseNumber;
						http.get(searchString, (res) => {
								var body = [];
								res.on('data', function (data) {
									body.push(data);
								}).on('end', function () {
									response = JSON.parse(Buffer.concat(body).toString());
									var potentialCourses = [];
									var potentialCourseSections = [];
									response.sections.forEach(function (section, index, sections) {
										var incomingObject = {
											"courseNumber" : response.number,
											"school" : response.school,
											"crn" : section.crn,
											"instructor" : section.meetings[0].instructor[0], //TODO: may need to serialize this info
											"location" : section.meetings[0].location, //TODO: may need to consider case where there are multiple meetings
											"time" : section.meetings[0].time,
											"days" : section.meetings[0].days
										}
										potentialCourseSections.push({
											"courseName" : response.identifier,
											"section" : section.section_id,
											"crn" : section.crn
										})
										var course = util.createCourse(incomingObject);
										potentialCourses.push(course);
									});
									db.collection('Courses').insert(potentialCourses, {ordered: false}, function(err, result) {
										callback(null, potentialCourseSections);
									});
								})
							}).on('error', (e) => {
							 	callback(null, "Failed HTTP Request");
						});
					} else {
						console.log("Not sure how to parse this:", element);
						callback(null, "Failed Parsing");
					}
				});
			});
			async.parallel(asyncCalls, function(err, results) {
				var output = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i] !== "Failed HTTP Request" && results[i] !== "Failed Parsing") {
						for (var j = 0; j < results[i].length; j++) {
							output.push(results[i][j]);
						}
					}
				}
				res.send({err : false, courses: output})
			});
		});

		//first time setup
		app.post('/api/userSetup', function(req, res) {
			if (!req.body || !util.validate(req.body.username) || !req.body.courses || !req.body.courses.length || req.body.courses.length <= 0) {
				res.send({err : true, msg: "Invalid request"})
			} else {
				var validatedCRNS = []
				for (var i = 0; i < req.body.courses.length; i++) {
					var x = util.validate(req.body.courses[i], "int");
					if (x) {
						validatedCRNS.push(x);
					}
				}
				var user = {
					"username" : req.body.username,
					"term" : util.findTerm(),
					"crns" : validatedCRNS
				};
				db.collection('Users').insert(user, {w:1}, function(err, result) {
					if (err) {
						res.send({err : true, msg: "Invalid Request"});
					} else {
						res.send({err : false, msg: "Created User"});
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