/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class WatchController {
        user: any;
        videoPlaying: any;     

        constructor(
            protected enjin,
            protected $stateParams,
            protected $rootScope
        ) {
            // ON LOAD    
            this.enjin.database.instance.auth().onAuthStateChanged((user) => {
                this.user = this.enjin.database.get('user/' + user.uid);
            }); 

            this.videoPlaying = this.enjin.database.get('user/' + this.$stateParams.user + '/watching');
        }
    }

    angular.module('Animadness')
           .controller('Animadness.WatchController', WatchController);
}