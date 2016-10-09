//What I want the DB to look like

// users = {
//	"username" : "mwebster7"
//  "semesters" : [{
//  	"term" : "fall2016",
//  	"courses" : [
//			82304,
//			83205
//		]
//  }]
//}

// attendance = {
//	"username" : "mwebster7",
//  "course" : {
//		"term" : "fall2016",
//		"crn" : 82304,
//		"date" : "Some date",
//		"routerLocation" : "Klaus 1443"
//	}
//}

// courseObject = {
//	"courseNumber" : 3510,
// 	"school" : "CS"
//  "term" "fall2016",
// 	"crn" : 82304,
// 	"instructor" : "H. Venkateswaran",
// 	"location" : "Klaus 1443",
// 	"startTimeUTC" : "14:05",
//  "endTimeUTC" : "14:55" 
// 	"days" : "MWF"
// }
incomingObject = {
	"courseNumber" : "3510",
	"school" : "CS",
	"crn" : "82304",
	"instructor" : "H. Venkateswaran",
	"location" : "Klaus 1443",
	"time" : "2:05 pm - 2:55 pm",
	"days" : "MWF"
}

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

function validate(someValue){
	validate(someValue, undefined)
}

function validate(someValue, potentialCondtion) {
	if (someValue === null || (typeof someValue !== "string") || someValue.length <= 0) {
		console.log("Invalid string input")
		return null;
	}
	if (potentialCondtion === "int") {
		return isNaN(someValue) ? null : parseInt(someValue)
	} else if (potentialCondtion === "customTimeStartStop") {
		//TODO: need to do parsing here
		return {
			"start" : "2:05 pm",
			"end" : "2:55 pm"
		}
	} else if (potentialCondtion === "someFutureFormat") {
		console.log("Have this here so we can check other formats down the line");
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
		location = validate(incomingObject.location);
		time = validate(incomingObject.time, "customTimeStartStop");
		days = validate(incomingObject.days);
		if (cNum && schl && crn && instr && location && time && days) {
			courseObject = {
				"courseNumber" : cNum,
				"school" : schl,
				"term" : findTerm(),
				"crn" : crn,
				"instructor" : instr,
				"location" : location,
				"startTimeUTC" : time.start,
				"endTimeUTC" : time.end,
				"days" : days
			}
			console.log(courseObject);
		} else {
			console.log("Invalid input object");
		}
	} else {
		console.log("No input object");
	}
}

createCourse(incomingObject);


//TODO: need end to end json message encryption


user = {
	"username" : "mwebster7",
 	"semesters" : [{
	 	"term" : "fall2016",
	 	"courses" : [
				82304,
				83205
			]
	 }]
}
//login -> look for username, either find it or don't find it
//if we find it -> then add a new semester if the semester is different
//if we don't find it allow this user to add the semester
console.log(user);

function isNewUser(username) {
	//search the db to see
	return false;
}

function newUser(incomingObject) {
	//should validate CRNs
	//if we don't have a particular CRN/course number then we need to go look for it
	//log both the user and courses
}

function recordAttendance(attendanceObject) {
	//TODO: need to log their attendance data in the DB
}