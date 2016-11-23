var Promise = require('promise');
var http = require('http');

function findTerm() {
	//TODO: can probably cache this value
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

function validate(someValue){
	validate(someValue, undefined)
}

function dateDiffMinutes(date1, date2) {
	var diff = date2 - date1;
	diff = diff / (1000 * 60);
	return Math.abs(diff);
}

function dateDiffDays(date1, date2) {
	var diff = date2 - date1;
	diff = diff / (1000 * 60 * 60 * 24);
	return Math.abs(diff);
}

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

function validate(someValue, potentialCondtion) {
	if (someValue === null || (typeof someValue !== "string") || someValue.length <= 0) {
		console.log("Invalid string input")
		return null;
	}
	if (potentialCondtion === "int") {
		return isNaN(someValue) ? null : parseInt(someValue)
	} else if (potentialCondtion === "customTimeStartStop") {
		var start = someValue.indexOf("-");
		if (start < 0) {
			return {
				"start" : "Unknown",
				"end" : "Unknown"
			}
		} else {
			var startTime = someValue.substring(0, start);
			var endTime = someValue.substring(start + 2, someValue.length);
			return {
				"start" : startTime.trim(),
				"end" : endTime.trim()
			}
		}
		return {
			"start" : "2:05 pm",
			"end" : "2:55 pm"
		}
	} else if (potentialCondtion === "someFutureFormat") {
		console.log("Have this here so we can check other formats down the line");
	} else if (potentialCondtion === "date") {
		try {
		    date = Date.parse(someValue);
		    return date;
		} catch (e) {
		    return null;
		}
	} else {
		return someValue;//just return the string
	}
}

function createCourse(incomingObject) {
	if (incomingObject !== null) {
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


function parseCourseTitle(courseTitle) {
	var output = null;
	var school = "";
	var courseNumber = "";
	if (courseTitle && courseTitle.length && courseTitle.length > 0) {
		courseTitle += "-"; //add a dash to the end in case we don't get the section
		var initialDash = courseTitle.indexOf("-");
		if (initialDash >= 0) {
			school = courseTitle.substring(0, initialDash);
			var remaining = courseTitle.substring(initialDash + 1, courseTitle.length);
			if (remaining && remaining.length && remaining.length > 0) {
				initialDash = remaining.indexOf("-");
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
			//TODO: validate crns
			db.collection('Courses').find({crn : {$in : crns}}, {"_id": false, "crn" : true, "courseNumber": true, "school": true, "instructor": true, "location": true, "createTime" : true}).toArray(function(err, data) {
				if (err) {
					console.log(err);
					reject("Courses not found");
				}
				var i = 0;
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
				resolve(data);
			});
		} else {
			reject("No course objects found");
		}
	});
	return promise;
}

function updateCourseObject(school, courseNumber, db) {
	courseNumber = validate(courseNumber + "", "int");
	if (school && courseNumber) {
		db.collection('Courses').remove({"school" : school, "courseNumber" : courseNumber, "term": findTerm()}, function(err, result) {
			if (err) {
				console.log(err);
			} else {
				parseCoursesat(school, courseNumber);
			}
		});
	}
}

function lookupCourse(school, courseNumber, db) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		courseNumber = validate(courseNumber + "", "int");
		if (courseNumber) {
			db.collection('Courses').find({"school" : school, "courseNumber" : courseNumber, "term": findTerm()}, {"_id" : false, "courseNumber" : true, "section": true, "crn" : true}).toArray( function(err, result) {
				if (err) {
					reject(err);
				} else {
					if (result.length === 0) {
						parseCoursesat(school, courseNumber, db).done(function (result) {
			                resolve(result);
			            }, function (failure) {
			                reject(failure);
			            });
					} else {
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

function parseCoursesat(school, courseNumber, db) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		var searchString = 'http://coursesat.tech/' + term + '/' + school + '/' + courseNumber;
		http.get(searchString, (res) => {
				var body = [];
				res.on('data', function (data) {
					body.push(data);
				}).on('end', function () {
					response = "";
					try {
					    response = JSON.parse(Buffer.concat(body).toString());
					} catch (e) {
					    reject("Not JSON");
					}
					if (response !== "") {
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
								"days" : section.meetings[0].days,
								"section" : section.section_id
							}
							var course = createCourse(incomingObject);
							if (course) {
								potentialCourses.push(course);
							}
							potentialCourseSections.push({
								"courseName" : response.identifier,
								"section" : section.section_id,
								"crn" : section.crn,
								"valid" : course !== null
							});
						});
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

function findUser(username, db) {
	var promise = new Promise(function(resolve, reject) {
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

function findStudents(crn, db) {
	var promise = new Promise(function(resolve, reject) {
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

function createAttendanceRecord(username, crn, routerLocation, curTime, db, time) {
	var term = findTerm();
	var promise = new Promise(function(resolve, reject) {
		findUser(username, db).done(function (userObject) {
			if (userObject.crns.indexOf(crn) >= 0) {
				db.collection('Courses').findOne({crn : crn, term: term}, {"_id": false, "crn" : true, "location": true, "startTime": true, "days": true}, function(err, result) {
					if (err || result === null) {
						res.send({err : true, msg: "Invalid Request"});
					} else {
						var addRecord = false;
						var attendanceRecord = {};
						if (curTime) {
							//the instructor has sent in this request
							addRecord = true;
							attendanceObject = {
								"username": username,
								"term" : term,
								"crn" : crn,
								"time" : new Date(curTime)
							}
						} else {
							var now = new time.Date();
							now.setTimezone("America/New_York");
							var startDate = startTimeNow(result.startTime);
							if (util.dateDiffMinutes(startDate, now) < 5 && util.dayMapper(result.days, now)) {
								//TODO: continue with location testing
								//
								//need to create a module to perform this check
								addRecord = true;
								attendanceObject = {
									"username": username,
									"term" : term,
									"crn" : crn,
									"time" : new Date()
								}
							}
						}
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


utilPkg = {}
utilPkg.findTerm = findTerm;
utilPkg.validate = validate;
utilPkg.startTimeNow = startTimeNow;
utilPkg.dateDiffMinutes = dateDiffMinutes;
utilPkg.dateDiffDays = dateDiffDays;
utilPkg.dayMapper = dayMapper;
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
module.exports = utilPkg;