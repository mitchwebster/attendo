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
            templateUrl: "views/coursesview.html"
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
                alert(JSON.stringify($scope.user));
                //need to switch views too
                $state.go('courses');
            };
        })
    .controller('coursesCtrl', function($scope, $http, $mdDialog, $state) {
            // $scope.submitLogin = function() {
                //need to submit the user to CAS
                // alert(JSON.stringify($scope.user));
                //need to switch views too
                // $state.go('courses');
                var temp = {username: "mwebster7"};
                $http.post('/api/myCourses', temp).then(function successCallback(response) {
                    response = response.data;
                    if (response.err) {
                        console.log(response);
                    } else {
                        console.log(response);
                        if (response.userExists) {
                            $scope.courses = response.courses;
                        } else {
                            $scope.userExists = false;
                        }
                    }
                }), function failedCallback(response) {
                    console.log(response);
                };

                $scope.selectClass = function(course) {
                    console.log(course);
                    $state.go('course', {course: course});
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
