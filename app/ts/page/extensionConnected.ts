/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class ExtensionConnectedController {
        user: any;

        constructor(
            protected Firebase,
            protected enjin,
            protected Extension,
            protected $state
        ) {
            // ON LOAD
            this.Firebase.start();
            var firebank = JSON.parse(localStorage.getItem('firebank'));
            this.user = this.enjin.database.get(`user/${firebank.user_id}`);
        }

        disconnect() {
            this.Extension.send({
                action: 'disconnect'
            }, (data) => {
                this.$state.go('login');
            });
        }
    }

    angular.module('Animadness')
           .controller('Animadness.ExtensionConnectedController', ExtensionConnectedController);
}