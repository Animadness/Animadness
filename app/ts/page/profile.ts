/// <reference path="../../typings/index.d.ts"/>
declare var Clipboard;

module Animadness {
    'use strict';

    class ProfileController {
        user: any;
        anime: any;
        profile: any;
        profileWatcher: any;
        token: any;
        setup: boolean;
        timeWatcher: any;

        constructor(
            protected enjin,
            protected $stateParams,
            protected Extension,
            protected $state,
            $scope,
            $rootScope
        ) {
            // ON LOAD
            this.setup = this.$stateParams.setup;
            
            this.enjin.database.instance.auth().onAuthStateChanged((user) => {
                this.profile = this.enjin.database.get('user/' + user.uid);
                this.profileWatcher = this.profile.$watch(() => {
                    if (this.enjin.session) {
                        this.enjin.session.profile = {
                            name: this.profile.name,
                            role: this.profile.role,
                            watching: this.profile.watching,
                            sharing: this.profile.sharing
                        };
                        this.enjin.auth.storeSession(this.enjin.session);
                    }
                });
                if (!this.setup) {
                    this.profile.$bindTo($scope, 'ctrl.user');
                } else {
                    this.enjin.database.set('user/' + user.uid, {role: 'member'});
                    this.enjin.database.get('user/' + user.uid).$bindTo($scope, 'ctrl.user');
                }
                this.token = user.refreshToken;
            });
        }

        installExtension() {
            chrome.webstore.install();
        }

        connectExtension() {
            this.Extension.send({
                action: 'connect',
                token: this.token
            }, (response) => {
                console.log(response);
                if (response.success && confirm('Extension connected successfully! Would you like to go watch anime?')) {
                    this.$state.go('anime');
                }
            });
        }

        logout() {   
            this.enjin.auth.logout((data) => {
                if (data.success) {
                    this.Extension.send({
                        action: 'disconnect'
                    }, (response) => {
                        console.log(response);
                    });
                }
            });
        }
    }

    angular.module('Animadness')
           .controller('Animadness.ProfileController', ProfileController);
}