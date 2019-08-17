/// <reference path="../../typings/index.d.ts"/>
angular.module('Animadness').directive('guestBar', function() {
    return {
        restrict: 'EA',
		templateUrl: 'html/directive/guestBar.html', 		
        scope: {},
        link: function($scope:any, element, attrs) {
            //On Load
        }
    };
});