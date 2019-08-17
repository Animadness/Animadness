/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class BlogController {
        posts: any;
        currentPage: number;
        lastPage: number;

        constructor(
            protected Blog,
            protected $sce
        ) {
            // ON LOAD
            this.posts = [];
            this.getPosts();
        }

        getPosts(page = 0) {
            this.Blog.posts((posts) => {
                this.currentPage = posts.current_page;
                this.lastPage = posts.last_page;
                this.posts = this.posts.concat(posts.data);
            }, 'published', 10, {page});
        }

        render(html) {
            return this.$sce.trustAsHtml(html);
        }

        formatDate(date) {
            var dateOut = new Date(date);
            return dateOut;
        }

        nextPage() {
            this.getPosts(this.currentPage + 1);
        }
    }

    angular.module('Animadness')
           .controller('Animadness.BlogController', BlogController);
}