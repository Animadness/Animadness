/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class LoginController {
        auth: any;
        userRole: any;

        constructor(
            protected enjin,
            protected $state,
            protected Extension,
            protected $rootScope
        ) {
            // ON LOAD
        }

        login(type) {
            this.enjin.auth.withSocial(type, (data) => {
                this.enjin.database.instance.auth().onAuthStateChanged((user) => {
                    this.userRole = this.enjin.database.get('user/' + user.uid);
                    this.userRole.$loaded((data) => {
                        if (data.role) {
                            this.Extension.send({
                                action: 'connect',
                                token: user.refreshToken
                            }, (response) => {
                                console.log(response);
                            });
                            this.$rootScope.guest = false;
                            this.$state.go('anime');
                        } else {
                            this.$state.go('profile', {setup: true});
                        }
                    });
                });
            });
        }
    }

    angular.module('Animadness')
           .controller('Animadness.LoginController', LoginController);
}