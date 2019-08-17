/// <reference path="../typings/index.d.ts"/>

declare var chrome;

module Animadness {
    'use strict';

    class ExtensionGetVideoUrl {
        constructor() {
            chrome.runtime.sendMessage({
                action: "getVideoUrl",
                url: document.querySelector('#control > a').getAttribute('href')
            });
        }
    }

    new ExtensionGetVideoUrl();
}
        