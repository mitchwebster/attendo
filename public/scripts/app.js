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
            templateUrl: "views/courseview.html"
        })
        .state('view3', {
            url: "/view3",
            templateUrl: "partials/view3.html"
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
        });

})(angular);
