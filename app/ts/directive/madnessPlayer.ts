/// <reference path="../../typings/index.d.ts"/>

module Animadness {
    angular.module('Animadness').directive('madnessPlayer', ['Player', 'Chromecast', '$rootScope', '$document', function(Player, Chromecast, $rootScope, $document) {
        return {
            restrict: 'EA',
            templateUrl: 'html/directive/madnessPlayer.html',
            scope: {
                src: '=',
                title: '=',
                thumb: '=',
                skip: '=',
                watch: '=',
                time: '=',
                cast: '='
            },
            link: function($scope, el, attrs) {
                //On Load
                var castEnabled = false;
                if ($scope.cast) {
                    castEnabled = Chromecast.init();
                    console.log(castEnabled);
                }

                Player.init();

                $scope.$watch('src', function(newValue, oldValue) {
                    if (newValue !== oldValue) {
                        Chromecast.watch = $scope.watch;
                        if ($scope.time) {
                            setTimeout(() => {
                                if (castEnabled && Chromecast.DEVICE_STATE === 1) {
                                    Chromecast.setSeekTime($scope.time);
                                } else {
                                    Player.setSeekTime($scope.time);
                                }

                            }, 1000);
                        }

                        if (castEnabled && Chromecast.DEVICE_STATE === 1) {
                            Chromecast.selectMedia(newValue, $scope.title, $scope.thumb);
                        } else {
                            Player.selectMedia(newValue, $scope.title, $scope.thumb);
                        }
                    }
                });

                $document.on('keyup', (e) => {
                    if ($scope.src) {
                        switch (e.keyCode) {
                            case 32:
                                //PAUSE / PLAY
                                if (Chromecast.localPlayerState === 'PLAYING') {
                                    $scope.pause();
                                } else {
                                    $scope.play();
                                }
                                break;
                            case 39:
                                $rootScope.$broadcast('player:skip');
                                break;  
                        }
                    }
                });

                $scope.play = function() {
                    if (!$scope.time) {
                        if (castEnabled && Chromecast.DEVICE_STATE === 1) {
                            Chromecast.playMedia();
                        } else {
                            Player.playMedia();
                        }
                    }
                };

                $scope.pause = function() {
                    if (!$scope.time) {
                        if (castEnabled && Chromecast.DEVICE_STATE === 1) {
                            Chromecast.pauseMedia();
                        } else {
                            Player.pauseMedia();
                        }
                    }
                };

                $scope.seek = function($event) {
                    if (!$scope.time) {
                        if (castEnabled && Chromecast.DEVICE_STATE === 1) {
                            Chromecast.seekMedia($event);
                        } else {
                            Player.seekMedia($event);
                        }
                    }
                };

                $scope.startCast = function() {
                    if (castEnabled) {
                        Player.launchApp($scope.src);
                    }
                };

                $scope.stopCast = function() {
                    if (castEnabled) {
                        Player.stopApp();
                    }
                };

                $scope.openFullscreen = function() {
                    Player.requestFullScreen();
                };

                $scope.closeFullscreen = function() {
                    Player.cancelFullScreen();
                };

                $scope.$on('$destroy', function() {
                    Player.destroy();
                    $document.off('keyup');
                });
            }
        };
    }]);
}