/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    class ExtensionService {

        constructor(protected enjin) {
            // ON LOAD
        }

        send(data, callback) {
            try {
                chrome.runtime.sendMessage(this.enjin.extension.id, data, (response) => {
                    if (callback && typeof callback === 'function') {
                        callback(response);
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    }

    angular.module('Animadness').service('Extension', ExtensionService);
}