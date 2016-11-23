(function(angular, undefined) {
    "use strict";
    angular.module('attendoApp', ['ngMaterial', "ui.router", 'ngclipboard', 'ui.calendar'])
    .config(function($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/login');
        $stateProvider
        .state('login', {
            url: "/login",
            controller: 'loginCtrl',
            templateUrl: "views/login.html"
        })
        .state('courses', {
            url: "/courses",
            controller: 'coursesCtrl',
            templateUrl: "views/coursesview.html",
            params: {
                user: null
            }
        })
        .state('course', {
            url: "/course",
            controller: 'singleCourseCtrl',
            templateUrl: "views/courseview.html",
            params: {
                course: null,
                user: null
            }
        })
        .state('roster', {
            url: "/roster",
            controller: 'rosterCtrl',
            templateUrl: "views/rosterview.html",
            params: {
                course: null,
                user: null
            }
        })
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
    })
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
        })
    .controller('loginCtrl', function($scope, $http, $mdDialog, $state, userService) {
            $scope.submitLogin = function() {
                //need to submit the user to CAS
                console.log($scope.user);
                userService.saveUsername($scope.user.username);
                $state.go('courses', {user: $scope.user});
            };
        })
    .controller('coursesCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService) {
            // $scope.submitLogin = function() {
                //need to submit the user to CAS
                // alert(JSON.stringify($scope.user));
                //need to switch views too
                // $state.go('courses');
                $scope.user = $stateParams.user ? $stateParams.user : {username: userService.getUsername()};
                $scope.selected = {};
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

                $scope.selectClass = function(course) {
                    userService.saveCurrentCourse(course);
                    userService.saveUsername($scope.user.username);
                    if ($scope.isInstructor) {
                        $state.go('roster', {course: course, user: $scope.user.username});
                    } else {
                        $state.go('course', {course: course, user: $scope.user.username});
                    }
                }

                $scope.submitUser = function() {
                    var courses = Object.keys($scope.selected);
                    if (courses.length == Object.keys($scope.coursePromptCourses).length) {
                        var output = []
                        for (var i = 0; i < courses.length; i++) {
                            output.push($scope.selected[courses[i]]);
                        }
                        output = {username: $scope.user.username, courses: output};
                        console.log(output);
                        $http.post('/api/userSetup', output).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log(response);
                            } else {
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
        })
    .controller('singleCourseCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {
                // $scope.submitLogin = function() {
                    //need to submit the user to CAS
                    // alert(JSON.stringify($scope.user));
                    //need to switch views too
                    // $state.go('courses');
                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();

                    var greenOuter = '#405738';
                    var greenInner = '#A0DB8E';

                    $scope.alertOnEventClick = function( date, jsEvent, view){
                        $scope.alertMessage = (date.title + ' was clicked ');
                        alert($scope.alertMessage);
                    };

                    var postParams = {username: $scope.user};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }

                    $http.post('/api/attendanceData', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            for (var i = 0; i < response.attendance.length; i++) {
                                var curDate = new Date(response.attendance[i].time);
                            }
                        }
                    });

                    var date = new Date();
                    var d = date.getDate();
                    var m = date.getMonth();
                    var y = date.getFullYear();
                    /* event source that contains custom events on the scope */
                    $scope.events = [
                      {title: 'Birthday Party',start: new Date(y, m, d + 1, 19, 0),end: new Date(y, m, d + 1, 22, 30),allDay: false}
                    ];
                    /* alert on eventClick */
                    $scope.alertOnEventClick = function( date, jsEvent, view){
                        $scope.alertMessage = (date.title + ' was clicked ');
                        alert($scope.alertMessage);
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
                        eventClick: $scope.alertOnEventClick
                      }
                    };

                    /* event sources array*/
                    $scope.eventSources = [$scope.events];


                    $scope.checkin = function(){
                        // console.log("Trying to check in");
                        var params = {"username" : $scope.user, "crn" : ($scope.course.crn + ""), "routerLocation" : $scope.course.location};
                        $http.post('/api/checkin', params).then(function successCallback(response) {
                            response = response.data;
                            if (response.err) {
                                console.log("Not checked in");
                            } else {
                                console.log("Checked in");
                            }
                        });
                    }
            })

    .controller('rosterCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {

                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();
                    
                    var postParams = {username: $scope.user};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }

                    $scope.selectStudent = function(student) {
                        userService.saveCurrentCourse($scope.course);
                        userService.saveUsername($scope.user);
                        userService.saveStudent(student);
                        $state.go('attendance', {course: $scope.course, user: $scope.user.username, student: student});
                    }

                    $http.post('/api/course/roster', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            $scope.students = response.roster;
                        }
                    });
            })
    .controller('attendanceCtrl', function($scope, $http, $mdDialog, $state, $stateParams, userService, $compile) {

                    $scope.course = $stateParams.course ? $stateParams.course : userService.getCurrentCourse();
                    $scope.user = $stateParams.user ? $stateParams.user : userService.getUsername();
                    $scope.student = $stateParams.student ? $stateParams.student : userService.getStudent();
                    
                    var postParams = {username: $scope.student.username};
                    if ($scope.course.crn) {
                        postParams["crn"] = $scope.course.crn + "";
                    }

                    $http.post('/api/attendanceData', postParams).then(function successCallback(response) {
                        response = response.data;
                        if (response.err) {
                            console.log(response);
                        } else {
                            for (var i = 0; i < response.attendance.length; i++) {
                                var curDate = new Date(response.attendance[i].time);
                            }
                        }
                    });
            });


})(angular);
