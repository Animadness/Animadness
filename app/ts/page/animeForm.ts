/// <reference path="../../typings/index.d.ts"/>
module Animadness {
    'use strict';

    class AnimeFormController {
        query: any;
        lookup: any;
        results: any;
        resultCount: any;
        showResults: boolean;
        pictures: any;
        fillers: any;
        selectedFiller: any;
        anime: any;
        selectedDub: any;
        selectedSub: any;
        selectedShow: any;
        tv: any;
        backups: any;
        backupDub: any;
        backupSub: any;

        constructor(
            protected enjin,
            protected $rootScope,
            protected Extension,
            protected $state
        ) {
            // ON LOAD 
            this.showResults = false;
        }

        toTitleDash(str) {
            return str.replace(/\w\S*/g, function(txt){
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }).replace(/\s+/g, '-');
        }

        lookupAnime() {
            this.$rootScope.$broadcast('loading:show');
            this.Extension.send({
                action: 'lookup',
                query: this.query
            }, (data) => {
                this.results = data.series;
                this.fillers = data.fillers;
                this.tv = data.tv;
                this.backups = data.backups;
                this.$rootScope.$broadcast('loading:hide');
                this.showResults = true;
            });
        }

        selectAnime(series) {
            if (this.selectedSub) {
                if (this.selectedSub === series) {
                    this.selectedSub = false;
                } else {
                    if (this.selectedDub && this.selectedDub === series) {
                        this.selectedDub = false;
                    } else {
                        this.selectedDub = series;
                    }
                }
            } else {
                this.selectedSub = series;
            }
        }

        selectBackup(backup) {
            if (this.backupSub) {
                if (this.backupSub === backup) {
                    this.backupSub = false;
                } else {
                    if (this.backupDub && this.backupDub === backup) {
                        this.backupDub = false;
                    } else {
                        this.backupDub = backup;
                    }
                }
            } else {
                this.backupSub = backup;
            }
        }

        selectFiller(filler) {
            this.selectedFiller = filler;
        }

        selectShow(show) {
            this.selectedShow = show;
        }

        saveAnime() {
            this.$rootScope.$broadcast('loading:show');
            this.anime = {
                fillers: this.selectedFiller ? this.selectedFiller.link : null,
                provider: {
                    kissanime: {
                        dub: this.selectedDub ? this.selectedDub.link : false,
                        sub: this.selectedSub.link 
                    },
                    '9anime': {
                        sub: this.backupSub.link,
                        dub: this.backupDub ? this.backupDub.link : false
                    }
                },
                tvId: this.selectedShow.id
            };
            this.Extension.send({
                action: 'add',
                anime: this.anime
            }, (data) => {
                this.enjin.database.push('review', data).then((test) => {
                    this.$rootScope.$broadcast('loading:hide');
                    this.showResults = false;
                    this.query = '';
                    this.selectedSub = false;
                    this.selectedDub = false;
                    this.backupDub = false;
                    this.backupSub = false;
                    this.backups = false;
                    this.$state.go('series', {
                        seriesId: test.key, 
                        review: true
                    });
                });
            });  
        }
    }

    angular.module('Animadness')
           .controller('Animadness.AnimeFormController', AnimeFormController);
}