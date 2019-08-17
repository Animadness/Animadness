/// <reference path="../typings/index.d.ts"/>
declare var ionic;

module Animadness {
    'use strict';

    class AppRunner {

        constructor(
            $rootScope, 
            enjin, 
            $state, 
            $ionicLoading, 
            $ionicSideMenuDelegate,
            $window,
            Platform
        ) {
            $rootScope.host = {
                api: enjin.api.host.slice(0, -3),
                apiFull: enjin.api.host,
                url: enjin.url
            };

            $rootScope.mobiscrollOpts = {
                theme: 'animadness',
                dateFormat: 'mm/dd/y',
                display:'modal'
            };

            $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState) {
                $rootScope.showSidebar = true;
            });

            $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState) {
                $state.previous = fromState;
            });

            $rootScope.$on('loading:show', function() {
                $ionicLoading.show({ template: '<img src="./img/icon.png" height="36" width="36" />' });
            });

            $rootScope.$on('loading:hide', function() {
                $ionicLoading.hide();
            });

            $rootScope.toggleMenu = function() {
                $ionicSideMenuDelegate.toggleLeft();
            };

            $rootScope.openLink = function(link, target = '_blank', opts = null) {
                if (ionic.Platform.isAndroid()) {
                    $window.open(link, target, 'location=yes');
                } else {
                    var win = window.open(link, target, opts);
                    win.focus();
                }
            };

            Platform.run();

            firebase.auth().onAuthStateChanged(function(user) {
                if (!user) {
                    $rootScope.guest = true;
                }
            });
        }
    }
    
    angular.module('Animadness')
        .run(AppRunner)
        .config(function Config(
            $sceDelegateProvider, 
            enjin, 
            $locationProvider
        ) {
            $sceDelegateProvider.resourceUrlWhitelist([
                'self',
                enjin.api.host.slice(0, -3) + '**',
                enjin.url + '**'
            ]);
        });
}
