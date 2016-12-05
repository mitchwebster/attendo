(function(angular, undefined) {
    "use strict";
    angular.module('attendoApp', ['ngMaterial', "ui.router", 'ngclipboard', 'ui.calendar', 'chart.js'])
    .config(function($stateProvider, $urlRouterProvider) {

        //define the states for the application as well as the controllers for each state
        $urlRouterProvider.otherwise('/login');
        $stateProvider
        .state('login', {
            url: "/login",
            controller: 'loginCtrl',
            templateUrl: "views/login.html"
        }) //the login page
        .state('courses', {
            url: "/courses",
            controller: 'coursesCtrl',
            templateUrl: "views/coursesview.html",
            params: {
                user: null
            }
        }) //the student courses page
        .state('course', {
            url: "/course",
            controller: 'singleCourseCtrl',
            templateUrl: "views/courseview.html",
            params: {
                course: null,
                user: null
            }
        }) //roster view for the teachers
        .state('roster', {
            url: "/roster",
            controller: 'rosterCtrl',
            templateUrl: "views/rosterview.html",
            params: {
                course: null,
                user: null
            }
        }) //single user view from the teachers perspective
        .state('attendance', {
            url: "/attendance",
            controller: 'attendanceCtrl',
            templateUrl: "views/attendance.html",
            params: {
                course: null,
                user: null,
                student: null
            }
        });
    }) //this is a service used for storing the current users information in browser memory
    .factory('userService', function () {

            var service = {

                model: {
                    username: '',
                    courses: [],
                    currentCourse: '',
                    currentStudent: ''
                },

                saveUsername: function (username) {
                    sessionStorage.username = angular.toJson(username);
                },
                getUsername: function () {
                    service.model.username = angular.fromJson(sessionStorage.username);
                    return service.model.username;
                },
                saveCourses: function (courses) {
                    sessionStorage.courses = angular.toJson(courses);
                },
                getCourses: function () {
                    service.model.courses = angular.fromJson(sessionStorage.courses);
                    return service.model.courses;
                },
                saveCurrentCourse: function (curCourse) {
                    sessionStorage.currentCourse = angular.toJson(curCourse);
                },
                getCurrentCourse: function () {
                    service.model.currentCourse = angular.fromJson(sessionStorage.currentCourse);
                    return service.model.currentCourse;
                },
                saveStudent: function (curStudent) {
                    sessionStorage.currentStudent = angular.toJson(curStudent);
                },
                getStudent: function () {
                    service.model.currentStudent = angular.fromJson(sessionStorage.currentStudent);
                    return service.model.currentStudent;
                }
            }
            return service;
        }) //this is the controller for the login page
    .controller('loginCtrl', function($scope, $http, $mdDialog, $state, userService) {
            $scope.submitLogin = function() {
                //need to submit the user to CAS
                console.log($scope.user);
                userService.saveUsername($scope.user.username);
                $state.go('courses', {user: $scope.user});
            };
        }) //controller for the courses page
    .controller('coursesCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService) {
            // $scope.submitLogin = function() {
                //need to submit the user to CAS
                // alert(JSON.stringify($scope.user));
                //need to switch views too
                // $state.go('courses');
                //start by looking into the browser cache for data
                $scope.user = $stateParams.user ? $stateParams.user : {username: userService.getUsername()};
                $scope.selected = {};
                $scope.userExists = $scope.user && $scope.user.username.length > 0;
                console.log($scope.user, $scope.userExists);
                //get the courses by hitting the rest API
                $http.post('/api/myCourses', {username: $scope.user.username}).then(function successCallback(response) {
                    response = response.data;
                    if (response.err) {
                        console.log(response);
                    } else {
                        console.log(response);
                        if (response.userExists) {
                            $scope.courses = response.courses;
                            $scope.isInstructor = response.instructor;
                        } else {
                            $scope.userExists = false;
                            //TODO pull the tabs from tsquare
                            var tempLabels = {courses : ["CS-3312-JIA,JID,LMC-", "CS-3510-A", "CS-4261-A", "CS-4641-A", "ECON-3300-EJ", "ISYE-3770"]};
                            $http.post('/api/coursePrompt', tempLabels).then(function successCallback(response) {
                                response = response.data;
                                if (response.err) {
                                    console.log(response);
                                } else {
                                    // $scope.coursePromptCourses = createCourseObjects(response.courses);
                                    console.log(response.courses);
                                    $scope.coursePromptCourses = response.courses;
                                    console.log($scope.coursePromptCourses);
                                }
                            }, function failedCallback(response) {
                                console.log(response);
                            });
                        }
                    }
                }), function failedCallback(response) {
                    console.log(response);
                };
                //if the user selects the class, save this to memory and then switch states
                $scope.selectClass = function(course) {
                    userService.saveCurrentCourse(course);
                    userService.saveUsername($scope.user.username);
                    if ($scope.isInstructor) {
                        $state.go('roster', {course: course, user: $scope.user.username});
                    } else {
                        $state.go('course', {course: course, user: $scope.user.username});
                    }
                }
                //this method creates a user in the DB if they need to register for their courses
                $scope.submitUser = function() {
                    var courses = Object.keys($scope.selected);
                    if (courses.length == Object.keys($scope.coursePromptCourses).length) {
                        var output = []
                        for (var i = 0; i < courses.length; i++) {
                            output.push($scope.selected[courses[i]]);
                        }
                        output = {username: $scope.user.username, courses: output};
                        console.log(output);
                        //call the rest API for user setup
                        $http.post('/api/userSetup', output).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                //if it is all good, then get the courses for this user
                                $scope.userExists = true;
                                $http.post('/api/myCourses', {username: $scope.user.username}).then(function successCallback(response) {
                                    response = response.data;
                                    if (response.err) {
                                        console.log(response);
                                    } else {
                                        console.log(response);
                                        if (response.userExists) {
                                            $scope.courses = response.courses;
                                        } else {
                                            console.log("Some error occured");
                                        }
                                    }
                                }), function failedCallback(response) {
                                    console.log(response);
                                };
                            }
                        }, function failureCallback(err) {
                            console.log(err);
                        });
                }
            }
            // };
        }) //this is the controller for the single course view from the student perspective
    .controller('singleCourseCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {
                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();

                    var postParams = {username: $scope.user};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }
                    //these events are the events that go on the calendar
                    $scope.events = [];
                    $scope.requests = [];
                    //we have to recompile the directive everytime we get more data so it refreshes
                    $scope.eventRender = function( event, element, view ) { 
                        element.attr({'tooltip': event.title,
                                     'tooltip-append-to-body': true});
                        $compile(element)($scope);
                    };
                    //go and get the attendance data from the server
                    $http.post('/api/attendanceData', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            //parse the data into a json, but also make the date strings objects
                            for (var i = 0; i < response.attendance.length; i++) {
                                var curDate = new Date(response.attendance[i].time);
                                var endDate = new Date(curDate);
                                endDate.setMinutes(endDate.getMinutes() + 60);
                                $scope.events.push({title: 'Attendance',start: curDate, end: endDate,allDay: false});
                            }
                        }
                        console.log($scope.events);
                        $scope.renderCalender(); //creates the calendar
                    });
                    //call this to update the requests
                    $scope.updateRequests = function () {
                        $http.post('/api/request/view', postParams).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                $scope.requests = response.requests;
                            }
                        });
                    }

                    //function that is called whenever an event is clicked
                    $scope.alertOnEventClick = function( date, jsEvent, view){
                        $scope.alertMessage = (date.title + ' was clicked ');
                        alert($scope.alertMessage);
                    };
                    //go and get the attendance data, reparse it, and rerender the calendar
                    $scope.refreshEvents = function () {
                        $http.post('/api/attendanceData', postParams).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                var tempLength = $scope.events.length;
                                for (var i = 0; i < tempLength; i++) {
                                    $scope.events.pop();   
                                }
                                for (var i = 0; i < response.attendance.length; i++) {
                                    var curDate = new Date(response.attendance[i].time);
                                    var endDate = new Date(curDate);
                                    endDate.setMinutes(endDate.getMinutes() + 60);
                                    $scope.events.push({title: 'Attendance',start: curDate, end: endDate,allDay: false, additionalInfo: {msg: "hello world"}});
                                }
                            }
                            $scope.renderCalender();
                        });
                    }
                    //use the full calendar library to render the calendar again
                    $scope.renderCalender = function() {
                      $("#attendanceCalendar").fullCalendar('render');
                    };

                    $scope.currentLocation = "None";
                    //get the mock location data from the server
                    $scope.changeLoc = function(){
                        // console.log("Trying to check in");
                        $http.get('/api/mock/locationData').then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                $scope.currentLocation = "Error";
                            } else {
                                $scope.currentLocation = response.location;
                            }
                        });
                    }
                    
                    /* config object */
                    $scope.uiConfig = {
                      calendar:{
                        height: 450,
                        editable: true,
                        header:{
                          left: 'title',
                          center: '',
                          right: 'today prev,next'
                        },
                        eventClick: $scope.alertOnEventClick,
                        eventRender: $scope.eventRender
                      }
                    };

                    /* event sources array*/
                    $scope.eventSources = [$scope.events];

                    //try to checkin from the students perspective
                    $scope.checkin = function(){
                        // console.log("Trying to check in");
                        var params = {"username" : $scope.user, "crn" : ($scope.course.crn + ""), "routerLocation" : $scope.currentLocation};
                        $http.post('/api/checkin', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log("Not checked in");
                            } else {
                                $scope.refreshEvents();
                            }
                        });
                    }
                    //submit an attendance request to be approved by the professors
                    $scope.attendanceRequest = function(addDate){
                        var params = {
                            username : $scope.user,
                            mistakeDate : addDate + "",
                            crn : $scope.course.crn + ""
                        };
                        console.log(params);
                        $http.post('/api/request/create', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            }
                            $scope.updateRequests();
                        });
                    }
                    //remove an attendance request
                    $scope.removeRequest = function(request){
                        var params = {
                            username : $scope.user,
                            mistakeDate : request.mistakeDate + "",
                            crn : request.crn + ""
                        };
                        $http.post('/api/request/remove', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                $scope.updateRequests();
                            }
                        });
                    }
                    //start by updating the calendar
                    $scope.updateRequests();

            })//controller for the roster
    .controller('rosterCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {

                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();

                    $scope.data = [];
                    $scope.labels = [];

                    $scope.dops = {};
                    
                    var postParams = {username: $scope.user};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }
                    //if a particular student is selected then change state to the single teacher->student view
                    $scope.selectStudent = function(student) {
                        userService.saveCurrentCourse($scope.course);
                        userService.saveUsername($scope.user);
                        userService.saveStudent(student);
                        $state.go('attendance', {course: $scope.course, user: $scope.user.username, student: student});
                    }
                    //get the roster so we can list all of the students
                    $http.post('/api/course/roster', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            $scope.students = response.roster;
                        }
                    });
                    //get the summary for the course so we have data to show in the graph
                    $http.post('/api/course/summary', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            $scope.courseStats = response;
                            var keys = Object.keys(response.attendanceData);
                            for (var i = 0; i < keys.length; i++) {
                                $scope.labels.push(keys[i]);
                                $scope.data.push(response.attendanceData[keys[i]]);
                            }
                            //build the graph with the following parameters
                            var ctx = document.getElementById("myChart");
                            ctx.width = 400;
                            ctx.height = 400;
                            var myChart = new Chart(ctx, {
                                type: 'bar',
                                data: {
                                    labels: $scope.labels,
                                    datasets: [{
                                        label: '# of Students',
                                        data: $scope.data,
                                        backgroundColor: [
                                            'rgba(54, 162, 235, 0.2)'
                                        ],
                                        borderColor: [
                                            'rgba(54, 162, 235, 1)'
                                        ],
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    scales: {
                                        yAxes: [{
                                            ticks: {
                                                beginAtZero:true
                                            }
                                        }]
                                    }
                                }
                            });
                        }
                    });

            }) //controller for a teacher looking at a single student's attendance data
    .controller('attendanceCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {

                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();
                    $scope.student = $stateParams.student ? $stateParams.student : userService.getStudent();
                    
                    var postParams = {username: $scope.student.username};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }

                    $scope.events = [];
                    $scope.requests = [];
                    $scope.currentRecord = null;
                    //gets the attendance requests from this student
                    $scope.updateRequests = function () {
                        $http.post('/api/request/view', postParams).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                $scope.requests = response.requests;
                            }
                        });
                    }
                    //accepts an attendance request
                    $scope.acceptRequest = function(request){
                        var params = {
                            username : request.username,
                            instructor : $scope.user,
                            mistakeDate : request.mistakeDate + "",
                            crn : request.crn + ""
                        };
                        $http.post('/api/request/accept', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            }
                            $scope.updateRequests();
                            $scope.refreshEvents();
                        });
                    }
                    //removes an attendance request
                    $scope.removeRequest = function(request){
                        var params = {
                            username : request.username,
                            mistakeDate : request.mistakeDate + "",
                            crn : request.crn + ""
                        };
                        console.log(request);
                        console.log(params);
                        $http.post('/api/request/remove', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                $scope.updateRequests();
                            }
                        });
                    }
                    //same functions as the student view for the calendar
                    $scope.updateRequests();

                    $scope.eventRender = function( event, element, view ) { 
                        element.attr({'tooltip': event.title,
                                     'tooltip-append-to-body': true});
                        $compile(element)($scope);
                    };

                    $scope.refreshEvents = function () {
                        $http.post('/api/attendanceData', postParams).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
                                var tempLength = $scope.events.length;
                                for (var i = 0; i < tempLength; i++) {
                                    $scope.events.pop();   
                                }
                                for (var i = 0; i < response.attendance.length; i++) {
                                    var curDate = new Date(response.attendance[i].time);
                                    var endDate = new Date(curDate);
                                    endDate.setMinutes(endDate.getMinutes() + 60);
                                    $scope.events.push({title: 'Attendance',start: curDate, end: endDate,allDay: false, additionalInfo: {msg: "hello world"}});
                                }
                            }
                            $scope.renderCalender();
                        });
                    }
                    /* alert on eventClick */
                    $scope.alertOnEventClick = function( date, jsEvent, view){
                        $scope.currentRecord = date;
                    };

                    $scope.renderCalender = function() {
                      $("#attendanceCalendar").fullCalendar('render');
                    };
                    
                    /* config object */
                    $scope.uiConfig = {
                      calendar:{
                        height: 450,
                        editable: true,
                        header:{
                          left: 'title',
                          center: '',
                          right: 'today prev,next'
                        },
                        eventClick: $scope.alertOnEventClick,
                        eventRender: $scope.eventRender
                      }
                    };

                    /* event sources array*/
                    $scope.eventSources = [$scope.events];
                    $scope.refreshEvents();

                    //function to add attendance on a certain date for a particular user
                    $scope.addAttendance = function(addDate){
                        var params = {
                            username : $scope.student.username,
                            pastDate : addDate + "",
                            instructor : $scope.user,
                            crn : $scope.course.crn + ""
                        };
                        $http.post('/api/checkin', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            }
                            $scope.refreshEvents();
                        });
                    }
            });


})(angular);
