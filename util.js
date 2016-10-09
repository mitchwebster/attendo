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
				"startTime" : time.start,
				"endTime" : time.end,
				"days" : days
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

utilPkg = {}
utilPkg.createCourse = createCourse;
utilPkg.findTerm = findTerm;
utilPkg.validate = validate;
utilPkg.startTimeNow = startTimeNow;
utilPkg.dateDiffMinutes = dateDiffMinutes;
utilPkg.dayMapper = dayMapper;
module.exports = utilPkg;