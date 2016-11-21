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
		app.post('/api/test', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			// res.send({err : false, msg: "API is online"});
			findUser(req.username).done(function (result) {
                console.log(result);
                res.send(result);
            }, function (failure) {
                console.log(failure);
                res.send(failure);
            });
		});

		app.post('/api/test2', function(req, res) {
			// console.log(req);
			console.log("Someone hit the test api");
			// res.send({err : false, msg: "API is online"});
			findCourseObjectsCrns(req.crns).done(function (result) {
                console.log(result);
                res.send(result);
            }, function (failure) {
                console.log(failure);
                res.send(failure);
            });
		});

		//function to return course objects, or go find the course objects and cache them
		function findCourseObjectsCrns(crns) {
			var promise = new Promise(function(resolve, reject) {
				if (crns && crns.length > 0) {
					//TODO: validate crns
					db.collection('Courses').find({crn : {$in : crns}}, {"_id": false, "crn" : true, "courseNumber": true, "school": true, "instructor": true, "location": true}).toArray(function(err, data) {
						var i = 0;
						while (i < data.length) {
							data[i].course = data[i].school + " " + data[i].courseNumber;
							delete data[i]["school"]
							delete data[i]["courseNumber"]
							i++;
						}
						resolve(data);
					});
				} else {
					reject("No course objects found");
				}
			});
			return promise;
		}

		function findCourseObjectsCourseTitle(courseTitles) {
			//{school : "CS", courseNumber: "82304"}
			var promise = new Promise(function(resolve, reject) {
				if (courseTitles && courseTitles.length > 0) {
					
				} else {
					
				}
			});
			return promise;
		}

		function findUser(username) {
			var promise = new Promise(function(resolve, reject) {
				db.collection('Users').findOne({"username": username, "term": util.findTerm()}, {crns : 1, instructor : true, "_id": false}, function(err, result) {
					if (err) {
						reject(err);
					} else {
						if (result == null) {
							reject("No user found");
						} else {
							resolve(result);
						}
					}
				});
			});
			return promise;
		}

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

					//TODO: this parsing is not good: need a better way to do this
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
				var output = {};
				for (var i = 0; i < results.length; i++) {
					if (results[i] !== "Failed HTTP Request" && results[i] !== "Failed Parsing") {
						for (var j = 0; j < results[i].length; j++) {
							if (results[i][j].courseName in output) {
								output[results[i][j].courseName].push({section: results[i][j].section, crn: results[i][j].crn});
							} else {
								output[results[i][j].courseName] = [{section: results[i][j].section, crn: results[i][j].crn}];
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
						//TODO: need to check if this user is a teacher, and if so then go get all of the students that are in this course
						var curTerm = util.findTerm();
						db.collection('Users').findOne({"username": username, "term": curTerm, "instructor": true}, {crns : 1, "_id": false}, function(err, result) {
							if (err) {
								res.send({err : true, msg: "Invalid request"});
							} else {
								db.collection('Users').find({"term" : curTerm, "crns": crn, "instructor": false}, {"username": true, "_id": false}).toArray(function(err, data) {
									if (err) {
										res.send({err : true, msg: "Database issue"});
									} else {
										res.send({err : false, roster: data});
									}
								});
							}
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
				if (!username || !crn || !rLoc) {
					res.send({err : true, msg: "Invalid request"});
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