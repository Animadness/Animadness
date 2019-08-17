/// <reference path="../../typings/index.d.ts"/>

module Animadness {
    'use strict';

    class AnimeController {
        anime: any;
        filter: any;
        review: any;
        post: any;
        animeFilter: any;
        genre: any;

        constructor(
            protected enjin,
            protected $scope,
            protected Chromecast,
            protected $ionicScrollDelegate,
            $stateParams,
            Blog,
            $sce
        ) {
            // ON LOAD   
            this.anime = this.enjin.database.array('anime');
            this.review = this.enjin.database.array('review');
            Blog.posts((response) => {
                this.post = response.data[0];
                this.post.content = $sce.trustAsHtml(this.post.content);
            });
            this.animeFilter = {};

            if ($stateParams.genre) {
                this.setGenreFilter($stateParams.genre);
            }
        }

        setGenreFilter(genre) {
            this.genre = genre;
            if (genre) {
                this.animeFilter.genres = genre;
            } else {
                delete this.animeFilter.genres;
                this.$ionicScrollDelegate.resize();
            }
        }

        resetSearch() {
            delete this.animeFilter.name;
            this.$ionicScrollDelegate.resize();
        }

        approveAll() {
            if (confirm(`Push these ${this.review.length} series live?`)) {
                angular.forEach(this.review, (series, index) => {
                    var anime = {
                        banner: series.banner,
                        description: series.description,
                        image: series.image,
                        name: series.name,
                        seasons: series.seasons
                    };
                    this.enjin.database.set(`anime/${series.$id}`, anime);
                    this.enjin.database.remove(`review/${series.$id}`);
                });
            }
        }

        formatDate(date) {
            var dateOut = new Date(date);
            return dateOut;
        }
    }

    angular.module('Animadness')
           .controller('Animadness.AnimeController', AnimeController);
}