/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class ExtensionSetupController {
        token: any;
        
        constructor(
            
        ) {
            // ON LOAD       
        }

        connect() {
            chrome.storage.sync.set({token: this.token}, () => {
                this.token = '';
            });
        }
    }

    angular.module('Animadness')
           .controller('Animadness.ExtensionSetupController', ExtensionSetupController);
}