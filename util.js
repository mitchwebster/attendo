var Promise = require('promise');
var http = require('http');

//sends back a string of the current term
function findTerm() {
	var curDate = new Date();
	month = curDate.getUTCMonth() + 1;
	year = curDate.getUTCFullYear();
	var curTerm = "";
	if  (month <= 5) {
		curTerm = "spring"
	} else if (month >= 8) {
		curTerm = "fall"
	} else {
		curTerm = "summer"
	}
	return curTerm + year
}

//sends back a true or false value of whether the current day belongs in the set of days passed in
function dayMapper(dayCharacters, curDate) {
	var day = new Array(7);
	day[0]=  "S";
	day[1] = "M";
	day[2] = "T";
	day[3] = "W";
	day[4] = "R";
	day[5] = "F";
	day[6] = "S";
	return dayCharacters.indexOf(day[curDate.getDay()]) >= 0;
}

//validates a string using overloading
function validate(someValue){
	validate(someValue, undefined)
}

//finds the difference between two dates in minutes
function dateDiffMinutes(date1, date2) {
	var diff = date2 - date1;
	diff = diff / (1000 * 60);
	return diff;
}

//finds the difference between two dates in days
function dateDiffDays(date1, date2) {
	var diff = date2 - date1;
	diff = diff / (1000 * 60 * 60 * 24);
	return Math.abs(diff);
}

//creates a date object that is the current date, but the hour/minute value is the start time of the class
function startTimeNow(someTime){
	var str = validate(someTime);
	if (str == null) {
		return null;
	}
	var index = str.indexOf(":");
	var indexSpace = str.indexOf(" ");
	if (index < 0 || indexSpace < 0) {
		return null;
	}
	//if it is in the correct format then convert the hour and minute to ints
	var hour = validate(str.substring(0, index), "int");
	var minute = validate(str.substring(index + 1, indexSpace), "int");
	var indexPM = str.indexOf("pm");
	//Can also infer this from the hour in most cases
	hour = indexPM < 0 ? hour : (hour + 12);
	var date = new Date();
	date.setHours(hour);
	date.setMinutes(minute);
	return date;
}

//performs validation on the string input to make sure we are getting the right type of data
function validate(someValue, potentialCondtion) {
	//verify that it is a string input
	if (someValue == undefined || someValue === null || (typeof someValue !== "string") || someValue.length <= 0) {
		console.log("Invalid string input")
		return null;
	}
	//if we want to parse to int
	if (potentialCondtion === "int") {
		//use the built in parse int if applicable
		return isNaN(someValue) ? null : parseInt(someValue)
	} else if (potentialCondtion === "customTimeStartStop") {
		//this is the format of an hour-minute combo
		var start = someValue.indexOf("-");
		if (start < 0) {
			return {
				"start" : "Unknown",
				"end" : "Unknown"
			}
		} else {
			//get the start and end time from the string and return an object
			var startTime = someValue.substring(0, start);
			var endTime = someValue.substring(start + 2, someValue.length);
			return {
				"start" : startTime.trim(),
				"end" : endTime.trim()
			}
		}
		//should never get to this return statement
		return {
			"start" : "2:05 pm",
			"end" : "2:55 pm"
		}
	} else if (potentialCondtion === "someFutureFormat") {
		console.log("Have this here so we can check other formats down the line");
	} else if (potentialCondtion === "date") {
		try {
			//try to parse the string to a date
		    var date = Date.parse(someValue);
		    date = new Date(date);
		    //verify that it is a valid date
		    if (isNaN(date.getTime())) {
		    	return null;
		    } else {
		    	return date;
		    }
		} catch (e) {
		    return null;
		}
	} else {
		return someValue;//just return the string
	}
}

//creates a course object that has its fields all validated
function createCourse(incomingObject) {
	if (incomingObject !== null) {
		//validate all of the fields in the course object
		cNum = validate(incomingObject.courseNumber, "int");
		schl = validate(incomingObject.school);
		crn = validate(incomingObject.crn, "int");
		instr = validate(incomingObject.instructor);
		if (instr == null) {
			instr = "No instructor listed";
		}
		location = validate(incomingObject.location);
		time = validate(incomingObject.time, "customTimeStartStop");
		days = validate(incomingObject.days);
		section = validate(incomingObject.section);
		//if it is all good, then create an object and return it
		if (cNum && schl && crn && instr && location && time && days && section) {
			courseObject = {
				"courseNumber" : cNum,
				"school" : schl,
				"term" : findTerm(),
				"crn" : crn,
				"instructor" : instr,
				"location" : location,
				"startTime" : time.start,
				"endTime" : time.end,
				"days" : days,
				"createTime" : new Date(),
				"section" : section
			}
			return courseObject;
		} else {
			console.log("Invalid input object");
			return null;
		}
	} else {
		console.log("No input object");
		return null;
	}
}

//takes a Tsquare title and return a json containing the school and course number
function parseCourseTitle(courseTitle) {
	var output = null;
	var school = "";
	var courseNumber = "";
	//check that the title has length
	if (courseTitle && courseTitle.length && courseTitle.length > 0) {
		courseTitle += "-"; //add a dash to the end in case we don't get the section
		var initialDash = courseTitle.indexOf("-");
		if (initialDash >= 0) {
			//if we find an initial dash then split 
			school = courseTitle.substring(0, initialDash);
			var remaining = courseTitle.substring(initialDash + 1, courseTitle.length);
			if (remaining && remaining.length && remaining.length > 0) {
				initialDash = remaining.indexOf("-");
				//split again to find the course number
				if (initialDash >= 0) {
					courseNumber = remaining.substring(0, initialDash);
					if (school && school.length > 0 && courseNumber && courseNumber.length > 0) {
						output = {school: school.toUpperCase(), courseNumber: courseNumber};
					}
				}
			}
		}
	}
	return output;
}

//function to return course objects, or go find the course objects and cache them
function findCourseObjects(crns, db, time) {
	var promise = new Promise(function(resolve, reject) {
		if (crns && crns.length > 0) {
			//go find the course objects for the list of crns
			db.collection('Courses').find({crn : {$in : crns}}, {"_id": false, "crn" : true, "courseNumber": true, "school": true, "instructor": true, "location": true, "createTime" : true}).toArray(function(err, data) {
				if (err) {
					console.log(err);
					reject("Courses not found");
				}
				var i = 0;
				//for each course object get it into display mode (gets a display: i.e. CS 3510 and gets rid of the createTime)
				while (i < data.length) {
					data[i].course = data[i].school + " " + data[i].courseNumber;
					delete data[i]["school"];
					delete data[i]["courseNumber"];
					//update the course object if it is out of date
					var lastUpdateTime = new time.Date(data[i].createTime);
					lastUpdateTime.setTimezone("America/New_York");
					var now = new time.Date();
					now.setTimezone("America/New_York");
					if (dateDiffDays(lastUpdateTime, now) > 1) {
						updateCourseObject(data[i].school, data[i].courseNumber);
					}
					delete data[i]["createTime"];
					i++;
				}
				//return the data in display mode
				resolve(data);
			});
		} else {
			reject("No course objects found");
		}
	});
	return promise;
}

//function that removes a given course object from the database and creates a new updated one from a coursesat scrape
function updateCourseObject(school, courseNumber, db) {
	courseNumber = validate(courseNumber + "", "int");
	if (school && courseNumber) {
		//remove the old object and then go parse coursesat
		db.collection('Courses').remove({"school" : school, "courseNumber" : courseNumber, "term": findTerm()}, function(err, result) {
			if (err) {
				console.log(err);
			} else {
				parseCoursesat(school, courseNumber);
			}
		});
	}
}

//finds an array of course objects by first loooking in the course cache and eventually looking at coursesat
function lookupCourse(school, courseNumber, db) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		courseNumber = validate(courseNumber + "", "int");
		if (courseNumber) {
			//query the course information based on the schoool and course number
			db.collection('Courses').find({"school" : school, "courseNumber" : courseNumber, "term": findTerm()}, {"_id" : false, "courseNumber" : true, "section": true, "crn" : true}).toArray( function(err, result) {
				if (err) {
					reject(err);
				} else {
					//if we don't find it then reparse coursesat
					if (result.length === 0) {
						parseCoursesat(school, courseNumber, db).done(function (result) {
			                resolve(result);
			            }, function (failure) {
			                reject(failure);
			            });
					} else {
						//if we do find it then get all of the sections and add them to the response array
						for (var i = 0; i < result.length; i++) {
							result[i]["courseName"] = school + " " + courseNumber;
							result[i]["valid"] = true;
						}
						resolve(result);
					}
				}
			});
		} else {
			reject("Invalid Course Number");
		}
	});
	return promise;
}

//visits the coursesat site and parses all of the sections for a given course and creates course objects for each of them
//also returns some section objects for a given school - courseNumber combination
function parseCoursesat(school, courseNumber, db) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		var searchString = 'http://coursesat.tech/' + term + '/' + school + '/' + courseNumber;
		//begin a http get request to the course info site
		http.get(searchString, (res) => {
				var body = [];
				res.on('data', function (data) {
					body.push(data);
				}).on('end', function () {
					response = "";
					//try to parse the json
					try {
					    response = JSON.parse(Buffer.concat(body).toString());
					} catch (e) {
					    reject("Not JSON");
					}
					//if the response has information then proceed
					if (response !== "") {
						var potentialCourses = [];
						var potentialCourseSections = [];
						//if we have information, then we can go through each section and create a new course object for it 
						response.sections.forEach(function (section, index, sections) {
							var incomingObject = {
								"courseNumber" : response.number,
								"school" : response.school,
								"crn" : section.crn,
								"instructor" : section.meetings[0].instructor[0], //TODO: may need to serialize this info
								"location" : section.meetings[0].location, //TODO: may need to consider case where there are multiple meetings
								"time" : section.meetings[0].time,
								"days" : section.meetings[0].days,
								"section" : section.section_id
							}
							//validate the course object
							var course = createCourse(incomingObject);
							if (course) {
								potentialCourses.push(course);
							}
							//add the section information to the response array
							potentialCourseSections.push({
								"courseName" : response.identifier,
								"section" : section.section_id,
								"crn" : section.crn,
								"valid" : course !== null
							});
						});
						//add the courses to the db
						db.collection('Courses').insert(potentialCourses, {ordered: false}, function(err, result) {
							if (err) {
								console.log(err);
							}
							resolve(potentialCourseSections);
						});
					}
				})
			}).on('error', (e) => {
			 	reject("Failed HTTP Request");
		});
	});
	return promise;
}

//finds a user in the database
function findUser(username, db) {
	var promise = new Promise(function(resolve, reject) {
		//find a given user based on the username, return their courses and whether they are an instructor
		db.collection('Users').findOne({"username": username, "term": findTerm()}, {crns : 1, instructor : true, "_id": false}, function(err, result) {
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

//finds the students for a given course in the database
function findStudents(crn, db) {
	var promise = new Promise(function(resolve, reject) {
		//assume the crn has already been validated
		//query based on the term and the crn passed in
		db.collection('Users').find({"term" : findTerm(), "crns": {"$in" : crn}, "instructor": false}, {"username": true, "_id": false}).toArray(function(err, data) {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
	return promise;
}

//creates an attendance record for a given student at a given time
function createAttendanceRecord(username, crn, routerLocation, curTime, db, time) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		findUser(username, db).done(function (userObject) {
			//once we have the user, check if they are registered for this course
			if (userObject.crns.indexOf(crn) >= 0) {
				//if they are then get this courses information from the DB
				db.collection('Courses').findOne({crn : crn, term: term}, {"_id": false, "crn" : true, "location": true, "startTime": true, "days": true}, function(err, result) {
					if (err || result === null) {
						res.send({err : true, msg: "Invalid Request"});
					} else {
						var addRecord = false;
						var attendanceRecord = {};
						var startEnd = oneDayRange(curTime);
						//if we have a startEnd date then the instructor has sent this request (note this needs to be token authenticated later on)
						if (startEnd) {
							//the instructor has sent in this request
							addRecord = true;
							attendanceObject = {
								"username": username,
								"term" : term,
								"crn" : crn,
								"time" : startEnd.start
							}
						} else {
							//if an instructor has not sent the request, get the time in the eastern timezone
							var now = new time.Date();
							now.setTimezone("America/New_York");
							var startDate = startTimeNow(result.startTime);
							var minDiff = dateDiffMinutes(startDate, now);
							//check that it is during the class period, on the correct day, and at the right location
							if (minDiff < 55 && minDiff >= 0 && dayMapper(result.days, now) && result.location == routerLocation) {
								addRecord = true;
								var startEnd = oneDayRange(new Date());
								attendanceObject = {
									"username": username,
									"term" : term,
									"crn" : crn,
									"time" : startEnd.start
								}
							}
						}
						//if we are supposed to add the record then insert it in the database
						if (addRecord) {
							db.collection('Attendance').insert(attendanceObject, {w:1}, function(err, result) {
								if (err) {
									reject("Unable to store the attendance record");
								} else {
									resolve("Success");
								}
							});
						} else {
							reject("Invalid parameters");
						}
					}
				});
			} else {
            	reject("User does not belong to this course");
			}
        }, function (failure) {
        	//no user found
            reject("User does not exist");
        });
	});

	return promise;
}

//deletes a request for attendance from the database
function removeRequest(username, crn, mistakeDate, db) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		//validate the user, crn, and mistake date
		if (username && crn && mistakeDate) {
			var startEnd = oneDayRange(mistakeDate);
			if (startEnd) {
				//remove the request given the query parameters
				db.collection('Requests').remove({"username" : username, "crn" : crn, "term": term, "mistakeDate": {$gte: startEnd.start, $lt: startEnd.end}}, function(err, result) {
					if (err) {
						reject(err);
					} else {
						if (result.result.n > 0) {
							resolve("Successfully removed request");
						} else {
							reject("Could not find request");
						}
					}
				});
			} else {
				reject("Unable to find date range");
			}
		} else {
			reject("Invalid parameters");
		}
	});
	return promise;
}

//takes a date object and removes the hour/minute/second etc, so it is easier to compare dates
function dateToMonthDayYear(date) {
	var d = new Date(date);
	var year = d.getUTCFullYear();
	var month = d.getUTCMonth();
	var day = d.getUTCDate();
	return new Date(year, month, day);
}

//returns a one day range around a date object, again just for easy date comparisons
function oneDayRange(date) {
	//try parse it into an object
	if (date) {
		try {
			//get the month day year
			var d = new Date(date);
			var year = d.getUTCFullYear();
			var month = d.getUTCMonth();
			var day = d.getUTCDate();
			//build a new date from this
			d = new Date(year, month, day);
			//create a new date that is one day later
			var d2 = new Date(d);
			d2.setDate(d2.getDate() + 1);
			return {start: d, end: d2};
		} catch (e) {
			return null;
		}
	} else {
		return null;
	}
}

//module exports
utilPkg = {}
utilPkg.findTerm = findTerm;
utilPkg.validate = validate;
utilPkg.startTimeNow = startTimeNow;
utilPkg.dateDiffMinutes = dateDiffMinutes;
utilPkg.dateDiffDays = dateDiffDays;
utilPkg.dayMapper = dayMapper;
utilPkg.dateToMonthDayYear = dateToMonthDayYear;
utilPkg.oneDayRange = oneDayRange;
//course and user functions
utilPkg.createCourse = createCourse;
utilPkg.parseCourseTitle = parseCourseTitle;
utilPkg.findCourseObjects = findCourseObjects;
utilPkg.updateCourseObject = updateCourseObject;
utilPkg.parseCoursesat = parseCoursesat;
utilPkg.findUser = findUser;
utilPkg.findStudents = findStudents;
utilPkg.lookupCourse = lookupCourse;
utilPkg.createAttendanceRecord = createAttendanceRecord;
utilPkg.removeRequest = removeRequest;
module.exports = utilPkg;