/// <reference path="../typings/index.d.ts"/>

module Animadness {
    class PlatformService {

        constructor(
            protected enjin,
            protected $state,
            protected $rootScope
        ) {
            // INJECT DEPENDENCIES ONLY
            // USE run() INSTEAD
        }

        run() {
            // ON LOAD
            this.enjin.platform = 'extension';
            if (localStorage.getItem('firebank')) {
                this.$rootScope.$broadcast('loading:show');
                console.log('Connecting redirecting...');
                setTimeout(() => {
                    this.$rootScope.$broadcast('loading:hide');
                    this.$state.go('connected');
                }, 1000);
            }
        }
    }

    angular.module('Animadness').service('Platform', PlatformService);
}

