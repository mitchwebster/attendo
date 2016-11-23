var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var async = require('async');
var time = require('time');
var http = require('http');
var path = require('path');
var Promise = require('promise');
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
		// app.post('/api/test', function(req, res) {
		// 	// res.send({err : false, msg: "API is online"});
		// 	findUser(req.body.username).done(function (result) {
  //               console.log(result);
  //               res.send(result);
  //           }, function (failure) {
  //               console.log(failure);
  //               res.send(failure);
  //           });
		// });

		//Post request to find their courses
		app.post('/api/myCourses', function(req, res) {
			if (!req.body || !util.validate(req.body.username)) {
				res.send({err : true, msg: "Invalid username"})
			} else {
				util.findUser(req.body.username, db).done(function (userObject) {
	                util.findCourseObjects(userObject.crns, db, time).done(function (courseObjects) {
	                	//successfully got the course objects
	                	res.send({err : false,  userExists: true, courses: courseObjects, instructor: userObject.instructor});
	                }, function (failure) {
	                	//some issue with course objects
	                	console.log(failure);
	                	res.send({err : true, msg: "Invalid Request"});
	                });
	            }, function (failure) {
	            	//no user found
	                console.log(failure);
	                res.send({err : false, userExists: false, courses: []});
	            });
			}
		});

		app.post('/api/coursePrompt', function(req, res) {
			if (!req.body || !req.body.courses || !req.body.courses.length || req.body.courses.length <= 0) {
				res.send({err : true, msg: "Invalid request"})
			}
			var asyncCalls = [];
			var out_titles = [];
			req.body.courses.forEach(function (element, index, titles) {
				var curTitle = util.parseCourseTitle(element);
				if (curTitle !== null) {
					out_titles.push(curTitle);
				}
			});
			out_titles.forEach(function (element, index, titles) {
				asyncCalls.push(function (callback) {
					util.lookupCourse(element.school, element.courseNumber, db).done(function (result) {
		                callback(null, result);
		            }, function (failure) {
		                callback(null, failure);
		            });
				});
			});
			async.parallel(asyncCalls, function(err, results) {
				var output = {};
				for (var i = 0; i < results.length; i++) {
					if (results[i] !== "Failed HTTP Request" && results[i] !== "Failed Parsing" && results[i] !== "Not JSON") {
						for (var j = 0; j < results[i].length; j++) {
							if (results[i][j].courseName in output) {
								output[results[i][j].courseName].push({section: results[i][j].section, crn: results[i][j].crn, valid: results[i][j].valid});
							} else {
								output[results[i][j].courseName] = [{section: results[i][j].section, crn: results[i][j].crn, valid: results[i][j].valid}];
							}
						}
					}
				}
				courseObjects = [];
				keys = Object.keys(output);
				for (var i = 0; i < keys.length; i++) {
					courseObjects.push({courseName: keys[i], sections: output[keys[i]]});
				}
				res.send({err : false, courses: courseObjects})
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
					"crns" : validatedCRNS,
					"instructor" : false
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

		app.post('/api/instructorSetup', function(req, res) {
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
					"crns" : validatedCRNS,
					"instructor" : true
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

		app.post('/api/course/roster', function(req, res) {
				if (!req.body) {
					res.send({err : true, msg: "Invalid request"});
				} else {
					var username = util.validate(req.body.username);
					var crn = util.validate(req.body.crn, "int");
					if (!username || !crn) {
						res.send({err : true, msg: "Invalid request"});
					} else {
						util.findUser(req.body.username, db).done(function (userObject) {
							if (userObject.instructor && userObject.crns.indexOf(crn) >= 0) {
								util.findStudents(userObject.crns, db, time).done(function (rosterData) {
				                	res.send({err : false,  roster: rosterData});
				                }, function (failure) {
				                	console.log(failure);
				                	res.send({err : true, msg: "Invalid Request"});
				                });
							} else {
			                	res.send({err : true, msg: "Invalid Permissions"});
							}
			            }, function (failure) {
			            	//no user found
			                console.log(failure);
			                res.send({err : true, msg: "Invalid Permissions"});
			            });
					}
				}
		});
		
		//Post to checkin
		app.post('/api/checkin', function(req, res) {
			if (!req.body) {
				res.send({err : true, msg: "Invalid request"});
			} else {
				var username = util.validate(req.body.username);
				var crn = util.validate(req.body.crn, "int");
				var rLoc = util.validate(req.body.routerLocation);
				var term = util.findTerm();
				var pastDate = util.validate(req.body.pastDate, "date");
				if (!username || !crn) {
					res.send({err : true, msg: "Invalid request"});
				} else {
					if (pastDate) {
						util.createAttendanceRecord(username, crn, rLoc, pastDate, db, time).done(function (rosterData) {
		                	res.send({err : false});
		                }, function (failure) {
		                	console.log(failure);
		                	res.send({err : true, msg: "Invalid Request"});
		                });
					} else if (rLoc) {
						util.createAttendanceRecord(username, crn, rLoc, null, db, time).done(function (rosterData) {
		                	res.send({err : false});
		                }, function (failure) {
		                	console.log(failure);
		                	res.send({err : true, msg: "Invalid Request"});
		                });
					} else {
						res.send({err : true, msg: "Invalid request"});
					}
				}
			}
		});

		//TODO: should probably be paged
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