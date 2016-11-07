(function(angular, undefined) {
    "use strict";
    angular.module('attendoApp', ['ngMaterial', "ui.router", 'ngclipboard', 'mwl.calendar'])
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
        ;
    })
    .controller('loginCtrl', function($scope, $http, $mdDialog, $state) {
            $scope.submitLogin = function() {
                //need to submit the user to CAS
                console.log($scope.user);
                $state.go('courses', {user: $scope.user});
            };
        })
    .controller('coursesCtrl', function($scope, $http, $mdDialog, $state, $stateParams) {
            // $scope.submitLogin = function() {
                //need to submit the user to CAS
                // alert(JSON.stringify($scope.user));
                //need to switch views too
                // $state.go('courses');
                $scope.user = $stateParams.user;
                $scope.selected = {};
                $http.post('/api/myCourses', {username: $scope.user.username}).then(function successCallback(response) {
                    response = response.data;
                    if (response.err) {
                        console.log(response);
                    } else {
                        console.log(response);
                        if (response.userExists) {
                            $scope.courses = response.courses;
                        } else {
                            $scope.userExists = false;
                            //TODO pull the tabs from tsquare
                            var tempLabels = {courses : ["CS-3312-JIA,JID,LMC-", "CS-3510-A", "CS-4261-A", "CS-4641-A", "ECON-3300-EJ"]};
                            $http.post('/api/coursePrompt', tempLabels).then(function successCallback(response) {
                                response = response.data;
                                if (response.err) {
                                    console.log(response);
                                } else {
                                    $scope.coursePromptCourses = createCourseObjects(response.courses);
                                    console.log($scope.coursePromptCourses);
                                }
                                console.log(response);
                            }, function failedCallback(response) {
                                console.log(response);
                            });
                        }
                    }
                }), function failedCallback(response) {
                    console.log(response);
                };

                function createCourseObjects(arr) {
                    var output = {}
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i].courseName in output) {
                            output[arr[i].courseName].push({section: arr[i].section, crn: arr[i].crn});
                        } else {
                            output[arr[i].courseName] = [{section: arr[i].section, crn: arr[i].crn}];
                        }
                    }
                    return output;
                }

                $scope.selectClass = function(course) {
                    console.log(course);
                    $state.go('course', {course: course, user: $scope.user.username});
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
    .controller('singleCourseCtrl', function($scope, $http, $mdDialog, $state, $stateParams) {
                // $scope.submitLogin = function() {
                    //need to submit the user to CAS
                    // alert(JSON.stringify($scope.user));
                    //need to switch views too
                    // $state.go('courses');
                    $scope.course = $stateParams.course;
                    $scope.user = $stateParams.user;

                    //calendar attributes
                    $scope.calendarView = "month";
                    $scope.viewDate = new Date();

                    var greenOuter = '#405738';
                    var greenInner = '#A0DB8E';

                    $scope.events = [];


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
                                $scope.events.push({
                                    title: 'No Title', // The title of the event
                                    startsAt: curDate, // A javascript date object for when the event starts
                                    endsAt: curDate, // Optional - a javascript date object for when the event ends
                                    color: { // can also be calendarConfig.colorTypes.warning for shortcuts to the deprecated event types
                                      primary: '#e3bc08', // the primary event color (should be darker than secondary)
                                      secondary: '#fdf1ba' // the secondary event color (should be lighter than primary)
                                    },
                                    actions: [{ // an array of actions that will be displayed next to the event title
                                      label: '<i class=\'glyphicon glyphicon-pencil\'></i>', // the label of the action
                                      cssClass: 'edit-action', // a CSS class that will be added to the action element so you can implement custom styling
                                      onClick: function(args) { // the action that occurs when it is clicked. The first argument will be an object containing the parent event
                                        console.log('Edit event', args.calendarEvent);
                                      }
                                    }],
                                    draggable: false, //Allow an event to be dragged and dropped
                                    resizable: false, //Allow an event to be resizable
                                    incrementsBadgeTotal: false, //If set to false then will not count towards the badge total amount on the month and year view
                                    recursOn: 'year', // If set the event will recur on the given period. Valid values are year or month
                                    cssClass: 'a-css-class-name', //A CSS class (or more, just separate with spaces) that will be added to the event when it is displayed on each view. Useful for marking an event as selected / active etc
                                    allDay: false // set to true to display the event as an all day event on the day view
                                });
                            }
                        }
                    });

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

                    // $scope.events = [
                    //   {
                    //     title: 'My event title', // The title of the event
                    //     startsAt: new Date(), // A javascript date object for when the event starts
                    //     endsAt: new Date(), // Optional - a javascript date object for when the event ends
                    //     color: { // can also be calendarConfig.colorTypes.warning for shortcuts to the deprecated event types
                    //       primary: '#e3bc08', // the primary event color (should be darker than secondary)
                    //       secondary: '#fdf1ba' // the secondary event color (should be lighter than primary)
                    //     },
                    //     actions: [{ // an array of actions that will be displayed next to the event title
                    //       label: '<i class=\'glyphicon glyphicon-pencil\'></i>', // the label of the action
                    //       cssClass: 'edit-action', // a CSS class that will be added to the action element so you can implement custom styling
                    //       onClick: function(args) { // the action that occurs when it is clicked. The first argument will be an object containing the parent event
                    //         console.log('Edit event', args.calendarEvent);
                    //       }
                    //     }],
                    //     draggable: false, //Allow an event to be dragged and dropped
                    //     resizable: false, //Allow an event to be resizable
                    //     incrementsBadgeTotal: false, //If set to false then will not count towards the badge total amount on the month and year view
                    //     recursOn: 'year', // If set the event will recur on the given period. Valid values are year or month
                    //     cssClass: 'a-css-class-name', //A CSS class (or more, just separate with spaces) that will be added to the event when it is displayed on each view. Useful for marking an event as selected / active etc
                    //     allDay: false // set to true to display the event as an all day event on the day view
                    //   }
                    // ];







                // };
            });

})(angular);
