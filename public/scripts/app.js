(function(angular, undefined) {
    "use strict";
    angular.module('attendoApp', ['ngMaterial', "ui.router", 'ngclipboard'])
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
                course: null
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
                    $state.go('course', {course: course});
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
                    $scope.course = $stateParams;
                // };
            });

})(angular);
