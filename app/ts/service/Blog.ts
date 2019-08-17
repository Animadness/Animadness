/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    class BlogService {
        endpoint: string;

        constructor(
            protected Rest,
            protected enjin
        ) {
            // ON LOAD
            this.endpoint = `${this.enjin.api.host}post/`;
        }

        respond(response, callback) {
            if (response.data) {
                if (typeof callback === 'function') {
                    callback(response);
                } else {
                    console.log('2nd Parameter is a Callback and must be a function!');
                }
            } else {
                console.log(response.data);
            }
        }

        posts(callback, status = 'published', resultsPerPage = 10, $data = false, silent = false) {
            var restUrl = `${this.endpoint}${status}/${resultsPerPage}`;

            this.Rest.get(restUrl, $data, silent).then((response) => {
                this.respond(response, callback);
            });
        }
    }

    angular.module('Animadness').service('Blog', BlogService);
}