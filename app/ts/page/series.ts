/// <reference path="../../typings/index.d.ts"/>
declare var chrome;

module Animadness {
    'use strict';

    class SeriesController {
        series: any;
        play: any;
        player: any;
        videoPlaying: any;
        animeWatcher: any;
        baseRef: string;
        user: any;
        share: any;
        popover: any;
        nextVideo: any;
        episode: any;
        timeWatcher: any;
        watchWithModal: any;
        currentSeason: any;
        banner: string;
        lastEpisode: any;
        message: string;
        status: string;
        schedule: any;
        tweet: string;
        scheduleOpts: any;
        scheduled: any;
        socialPoster: any;

        constructor(
            protected enjin,
            protected $stateParams,
            protected $rootScope,
            protected $scope,
            protected $state,
            protected $document,
            protected $filter,
            protected Extension,
            protected Rest,
            protected $ionicModal
        ) {
            // ON LOAD
            if ($stateParams.review) {
                this.baseRef = 'review/';
            } else {
                this.baseRef = 'anime/';
            }
            this.series = this.enjin.database.get(this.baseRef + $stateParams.seriesId);
            this.series.$loaded().then(() => {
                setTimeout(() => {
                    this.share = {
                        link: encodeURIComponent(window.location.href),
                        title: encodeURIComponent(`Come watch ${this.series.name} on Animadness`),
                        text: encodeURIComponent(`Animadness.net - Let's Binge Anime! ^_^`),
                        image: encodeURIComponent(this.series.image)
                    };
                }, 100);

                this.message = this.series.post && this.series.post.message ? this.series.post.message : null;
                this.tweet = this.series.post && this.series.post.tweet ? this.series.post.tweet : null;
                $scope.scheduled = this.series.post && this.series.post.date ? new Date(this.series.post.date) : null;
                this.schedule = $scope.scheduled;
                this.scheduled = $scope.scheduled ? $filter('date')($scope.scheduled, 'MM/dd/yyyy @ h:mma') : null;
                if (this.enjin.session) {
                    this.getAuthUser();
                }
                this.banner = this.series.banner;
            });

            $scope.refreshInfo = this.refreshInfo.bind(this);
            $scope.closeEditModal = this.closeEdit.bind(this);
            $scope.deleteEpisode = this.deleteEpisode.bind(this);
            $scope.deleteAnime = this.deleteAnime.bind(this);
            $scope.countEpisodes = this.episodeCount.bind(this);
            $ionicModal.fromTemplateUrl('html/modal/editAnime.html', {
                scope: $scope,
                'backdropClickToClose': false
            }).then((popover) => {
                this.popover = popover;
            });
            $scope.skipEpisode = this.skip.bind(this); 

            $scope.closeWatchWithModal = this.closeWatchWithMe.bind(this);
            $scope.share = this.shareWatchWithMe.bind(this); 
            $ionicModal.fromTemplateUrl('html/modal/watchWithMe.html', {
                scope: this.$scope,
                animation: 'slide-in-up',
                backdropClickToClose: true
            }).then((modal) => {
                this.watchWithModal = modal;
                var clipboard = new Clipboard('.clipboard');
            });

            $rootScope.$on('player:end', this.skip.bind(this));
            $scope.$on('player:skip', this.skip.bind(this));
            $document.on('keydown', this.hotKeys.bind(this));
            $rootScope.$on('player:error', (error) => {
                this.enjin.database.remove(`${$stateParams.review ? 'review' : 'anime'}/${$stateParams.seriesId}/episodes/${this.episode}`);
                this.loadVideo(this.lastEpisode, false);
            });

            $scope.$on('$destroy', function() {
                $document.off('keydown');
            });

            this.scheduleOpts = {
                theme: 'animadness',
                dateFormat: 'yy-mm-dd',
                onSelect: this.schedulePost.bind(this),
                timeFormat: 'HH:ii:ss',
                minDate: new Date(),
                buttons: [
                    'set', 
                    { 
                        text: 'clear',
                        handler: (event, inst) => {
                            delete this.schedule; 
                            this.scheduled = false;
                            if (this.series.post && this.series.post.date) {
                                delete this.series.post.date;
                                this.series.$save();
                            }
                            
                            this.$scope.$apply();
                            inst.hide();
                            inst.clear();
                        } 
                    }, 
                    'cancel'
                ]
            };

            this.$scope.closeSocialPoster = this.closeSocialSettings.bind(this);
            this.$scope.submitSocialSettings = this.submitSocialSettings.bind(this);
            this.$ionicModal.fromTemplateUrl('html/modal/socialPoster.html', {
                scope: this.$scope,
                animation: 'slide-in-up',
                backdropClickToClose: true
            }).then((modal) => {
                this.socialPoster = modal;
            });
        }

        submitSocialSettings() {
            this.socialPoster.hide();
        }

        closeSocialSettings() {
            if (!this.series.post) {
                this.series.post = {};
            }
            this.series.post.message = this.message;
            this.series.post.tweet = this.tweet;
            this.series.$save();
            this.socialPoster.hide();
        }

        schedulePost(value, inst) {
            this.schedule = new Date(value);
            this.scheduled = this.$filter('date')(new Date(value), 'MM/dd/yyyy @ h:mma');
            if (!this.series.post) {
                this.series.post = {};
            }
            this.series.post.date = value;
            this.series.$save();
            this.$scope.$apply();
        }

        refreshInfo(anime) {
            if (confirm('Are you sure you want to refresh series info?')) {
                this.$rootScope.$broadcast('loading:show');
                this.Extension.send({action: 'refresh', anime: {
                    banner: anime.banner,
                    description: anime.description,
                    fillers: anime.fillers ? anime.fillers : false,
                    homepage: anime.homepage ? anime.homepage : false,
                    image: anime.image ? anime.image : false,
                    name: anime.name ? anime.name : false,
                    provider: anime.provider,
                    tvId: anime.tvId ? anime.tvId : false
                }}, (data) => {
                    this.series.banner = data.banner;
                    this.series.description = data.description;
                    this.series.genres = data.genres;
                    this.series.homepage = data.homepage;
                    this.series.image = data.image;
                    this.series.name = data.name;
                    this.series.seasons = data.seasons;
                    this.series.$save();
                    this.popover.hide();
                    this.$rootScope.$broadcast('loading:hide');
                });
            }
        }

        viewSeasons() {
            this.banner = this.series.image;
            this.currentSeason = false;
        }

        hotKeys($event) {
            switch ($event.keyCode) {
                case 69:
                    if (!this.popover.isShown() && !this.socialPoster.isShown() && this.user.role === 'admin') {
                        this.edit();
                    }
                    break;
                case 27:
                    if (this.user.role === 'admin' && this.popover.isShown()) {
                        this.popover.hide();
                    }
                    break;
                case 32:
                    if (!this.popover.isShown() && !this.socialPoster.isShown() && !this.videoPlaying) {
                        this.quickPlay();
                    }
                    break;
            }
        }

        episodeCount(series) {
            var count:any = false;
            if (series && typeof series.episodes === 'object') {
                count = Object.keys(series.episodes).length;
            } else if (series && typeof series.episodes === 'array') {
                count = series.episodes.length;
            }

            return count;
        }

        getAuthUser() {
            this.user = this.enjin.database.get('user/' + this.enjin.session.user.uid);
            this.$scope.link = (this.enjin.proxy && this.enjin.local ? 'http://' + this.enjin.proxy : this.enjin.url ) + '/#/watch/' + this.user.$id;
            this.user.$loaded().then(() => {
                if (this.user.history && this.user.history[this.$stateParams.seriesId]) {
                    var seriesHistory = this.user.history[this.$stateParams.seriesId];
                    var lastEp = seriesHistory[Object.keys(seriesHistory)[Object.keys(seriesHistory).length - 1]];
                    var lastSeason = this.series.seasons[lastEp.season];
                    lastSeason.number = lastEp.season;
                    var finalSeason = this.series.seasons[Object.keys(this.series.seasons)[Object.keys(this.series.seasons).length - 1]];
                    var finalEp = finalSeason.episodes[Object.keys(finalSeason.episodes)[Object.keys(finalSeason.episodes).length - 1]];
                    if (lastEp.number === finalEp.number) {
                        this.play = {
                            icon: 'ion-refresh',
                            title: 'Rewatch'
                        };
                    } else {
                        this.play = {
                            season: lastSeason,
                            number: lastEp.number + 1,
                            icon: 'ion-play',
                            title: 'Resume'
                        };
                    }
                } else {
                    this.play = {
                        icon: 'ion-play',
                        title: 'Start'
                    };
                }
            });
        }

        quickPlay() {
            if (this.play.title === 'Resume') {
                if (this.play.season.episodes[this.play.number]) {
                    this.currentSeason = this.play.season;
                    this.loadVideo(this.currentSeason.episodes[this.play.number]);
                } else if (this.series.seasons[this.play.season.number + 1] && this.series.seasons[this.play.season.number + 1].episodes[this.play.number]) {
                    this.currentSeason = this.series.seasons[this.play.season.number + 1];
                    this.currentSeason.number = this.play.season.number + 1;
                    this.loadVideo(this.currentSeason.episodes[this.play.number]);
                }
            } else {
                this.currentSeason = this.series.seasons[Object.keys(this.series.seasons)[0]];
                this.currentSeason.number = Object.keys(this.series.seasons)[0];
                this.loadVideo(this.currentSeason.episodes[Object.keys(this.currentSeason.episodes)[0]]);               
            }
        }

        nextEpisode() {
            var next = false;
            var nextSeason = this.play.season && this.play.season.number ? this.play.season.number + 1 : 2;
            if (this.currentSeason.episodes.hasOwnProperty(this.episode + 1)) {
                next = this.currentSeason.episodes[this.episode + 1];
            } else if (this.series.seasons.hasOwnProperty(nextSeason) && this.series.seasons[nextSeason].episodes.hasOwnProperty(this.play.number)) {
                this.currentSeason = this.series.seasons[this.currentSeason.number + 1];
                this.currentSeason.number = nextSeason;
                next = this.currentSeason.episodes[this.episode + 1];
            }

            return next;
        }

        selectSeason(seasonNumber, season) {
            this.banner = season.banner ? season.banner : season.image ? season.image : this.series.banner;
            this.currentSeason = season;
            this.currentSeason.number = seasonNumber;
        }

        skip() {
            var nextEpisode = this.nextEpisode();
            this.loadVideo(nextEpisode, false);
        }

        edit() {
            this.$scope.series = this.series;
            this.popover.show();
        }

        closeEdit() {
            this.series.$save();
            this.popover.hide();
        }

        deleteEpisode(season, episode) {
            if (confirm('Are you sure you want to delete this episode?')) {
                delete this.series.seasons[season].episodes[episode.number];
                this.series.$save();
            }
        }

        deleteAnime() {
            if (confirm('Are you sure you want to delete this anime?')) {
                this.series.$remove().then((ref) => {
                    this.popover.hide();
                    this.$state.go('anime');
                }, function(error) {
                    console.log('Error:', error);
                });
            }
        }

        loadVideo(episode, silent = false) {
            if (!episode) {
                return false;
            }
            this.lastEpisode = episode;
            this.episode = episode.number;
            if (!silent) {
                this.$rootScope.$broadcast('loading:show');
                setTimeout(() => {
                    this.$rootScope.$broadcast('loading:hide');
                }, 20000);
            }
            this.enjin.database.set(`user/${this.enjin.session.user.uid}/watch`, {
                anime: this.$stateParams.seriesId,
                episode: episode.number,
                dubbed: this.user.dubbed ? true : false,
                provider: episode.provider,
                reviewing: this.$stateParams.review ? true : false
            });

            this.$rootScope.watchingUrl = episode[this.user.dubbed ? 'dub' : 'sub'];
            
            var episodeRef = this.baseRef + this.$stateParams.seriesId + '/episodes/' + episode.number;

            this.enjin.database.set(`user/${this.enjin.session.user.uid}/history/${this.$stateParams.seriesId}/${episode.number}`, {
                season: this.currentSeason.number,
                number: episode.number,
                dubbed: this.user.dubbed ? true : false,
                reviewing: this.$stateParams.review ? true : false
            });

            this.videoPlaying = this.enjin.database.get(episodeRef);
            this.videoPlaying.$watch(() => {
                if (this.user.sharing) {
                    this.timeWatcher = this.$rootScope.$on('player:time', (event, time) => {
                        this.enjin.database.set(`user/${this.user.$id}/watching/time`, time.current);
                    });
                } else {
                    if (this.timeWatcher && typeof this.timeWatcher === 'function') {
                        this.timeWatcher();
                    }
                }
                this.enjin.database.set(`user/${this.enjin.session.user.uid}/watching`, {
                    dubbed: this.user.dubbed ? true : false,
                    link: this.videoPlaying.video ? this.videoPlaying.video[this.user.dubbed ? 'dub' : 'sub'] ? this.videoPlaying.video[this.user.dubbed ? 'dub' : 'sub'] : this.videoPlaying.video['sub'] : false
                });
            });
        }

        approveAnime() {
            if (!this.message) {
                this.message = `<strong>${this.series.name}</strong> is now streaming and ready to binge watch on <strong>Animadness</strong>!`;
            }

            var post = {
                id: this.$stateParams.seriesId,
                anime: this.series.name,
                image: this.series.banner,
                message: this.message ? this.message : null,
                content: encodeURIComponent(`${this.message}<br /><br />${this.series.description}<br/><a class="button button-block button-calm icon-right ion-eye" href="http://animadness.net/#/anime/${this.$stateParams.seriesId}" target="_blank">Watch ${this.series.name} on Animadness</a>`),
                status: this.status,
                date: this.schedule ? this.series.post.date : null,
                blog: this.series.post && this.series.post.blog ? this.series.post.blog : null,
                tweet: this.tweet && this.tweet.length > 9 ? this.tweet : null
            };
            
            if (this.schedule && this.schedule > new Date()) {
                post.status = 'future';
                this.series.post = post;
                this.series.$save();
            } else {
                post.status = 'future';
                var anime = this.enjin.database.get('anime');
                anime.$ref().child(this.$stateParams.seriesId).set({
                    banner: this.series.banner,
                    description: this.series.description,
                    image: this.series.image,
                    name: this.series.name,
                    seasons: this.series.seasons,
                    homepage: this.series.homepage,
                    genres: this.series.genres,
                    tvId: this.series.tvId,
                    post: post,
                    provider: {
                        kissanime: {
                            sub: this.series.provider.kissanime.sub,
                            dub: this.series.provider.kissanime.dub
                        }
                    }
                });
                this.enjin.database.remove(`review/${this.$stateParams.seriesId}`);
            } 

            this.Rest.post(`${this.enjin.api.host}anime/approve`, post).then((res) => {
                if (this.schedule && !post.blog) {
                    this.series.post.blog = res.data.ID;
                    this.series.$save();
                }
                this.$state.go('anime');
            });
        }

        unwatch($event, episode) {
            $event.preventDefault();
            $event.stopPropagation();
            if (confirm('Are you sure you want to mark this unwatched?')) {
                this.enjin.database.remove(`user/${this.enjin.session.user.uid}/history/${this.$stateParams.seriesId}/${episode.number}`);
            }
        }

        openWatchWithMe() {
            this.watchWithModal.show();
        }
        
        closeWatchWithMe() {
            this.watchWithModal.hide();
        }

        shareWatchWithMe(type) {
            if (type === 'facebook') {
                this.$rootScope.openLink('https://www.facebook.com/sharer/sharer.php?u=' + this.share.link + '&title=' + this.share.title + '&description=' + this.share.text + '&picture=' + this.share.image, 'facebook-share-dialog', 'width=626,height=436');
            } else if (type === 'twitter') {
                this.$rootScope.openLink('https://twitter.com/intent/tweet?text=' + this.share.title + '&url=' + this.share.link , null,  'width=626,height=436');
            } else if (type === 'google') {
                this.$rootScope.openLink('https://plus.google.com/share?url=' + this.share.link, null, 'width=500,height=800');
            }
        }
    }

    angular.module('Animadness')
           .controller('Animadness.SeriesController', SeriesController);
}