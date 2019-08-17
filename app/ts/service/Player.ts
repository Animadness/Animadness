/// <reference path='../../typings/index.d.ts'/>
declare var chrome;

module Animadness {
    class PlayerService {
        MEDIA_SOURCE_ROOT: string;
        MEDIA_SOURCE_URL: string;
        PROGRESS_BAR_WIDTH: number;
        DEVICE_STATE: any;
        PLAYER_STATE: any;            
        deviceState: string;
        receivers_available: boolean;
        currentMediaSession: any;
        currentVolume: number;
        autoplay: boolean;
        session: any;
        castPlayerState: string;
        localPlayerState: string;
        localPlayer: any;
        fullscreen: boolean;
        audio: boolean;
        currentMediaIndex: number;
        currentMediaTime: number;
        currentMediaDuration: number;
        timer: any;
        progressFlag: boolean;
        timerStep: number;
        mediaContents: any;
        mediaJSON: any;
        currentVideo: any;
        nextVideo: any;
        watch: any;
        epLink: any;

        constructor(
            protected enjin,
            protected $rootScope,
            protected $ionicScrollDelegate
        ) {
            /**
             * Width of progress bar in pixel
             **/
            this.PROGRESS_BAR_WIDTH = 600;

            /**
             * Constants of states for Chromecast device 
             **/
            this.DEVICE_STATE = {
                'IDLE' : 0, 
                'ACTIVE' : 1, 
                'WARNING' : 2, 
                'ERROR' : 3
            };

            /**
             * Constants of states for CastPlayer 
             **/
            this.PLAYER_STATE = {
                'IDLE' : 'IDLE', 
                'LOADING' : 'LOADING', 
                'LOADED' : 'LOADED', 
                'PLAYING' : 'PLAYING',
                'PAUSED' : 'PAUSED',
                'STOPPED' : 'STOPPED',
                'SEEKING' : 'SEEKING',
                'ERROR' : 'ERROR'
            };

            /**
             * Cast player object
             * main variables:
             *  - deviceState for Cast mode: 
             *    IDLE: Default state indicating that Cast extension is installed, but showing no current activity
             *    ACTIVE: Shown when Chrome has one or more local activities running on a receiver
             *    WARNING: Shown when the device is actively being used, but when one or more issues have occurred
             *    ERROR: Should not normally occur, but shown when there is a failure 
             *  - Cast player variables for controlling Cast mode media playback 
             *  - Local player variables for controlling local mode media playbacks
             *  - Current media variables for transition between Cast and local modes
             */
            /* device variables */
            // @type {this.DEVICE_STATE} A state for device
            this.deviceState = this.DEVICE_STATE.IDLE;

            /* receivers available */
            // @type {boolean} A boolean to indicate availability of receivers
            this.receivers_available = false;

            /* Cast player variables */
            // @type {Object} a chrome.cast.media.Media object
            this.currentMediaSession = null;
            // @type {Number} volume
            this.currentVolume = 1;
            // @type {Boolean} A flag for autoplay after load
            this.autoplay = true;
            // @type {string} a chrome.cast.Session object
            this.session = null;
            // @type {this.PLAYER_STATE} A state for Cast media player
            this.castPlayerState = this.PLAYER_STATE.IDLE;

            /* Local player variables */
            // @type {this.PLAYER_STATE} A state for local media player
            this.localPlayerState = this.PLAYER_STATE.IDLE;
            // @type {HTMLElement} local player
            this.localPlayer = null;
            // @type {Boolean} Fullscreen mode on/off
            this.fullscreen = false;

            /* Current media variables */
            // @type {Boolean} Audio on and off
            this.audio = true;
            // @type {Number} A number for current media index
            this.currentMediaIndex = 0;
            // @type {Number} A number for current media time
            this.currentMediaTime = 0;
            // @type {Number} A number for current media duration
            this.currentMediaDuration = -1;
            // @type {Timer} A timer for tracking progress of media
            this.timer = null;
            // @type {Boolean} A boolean to stop timer update of progress when triggered by media status event 
            this.progressFlag = true;
            // @type {Number} A number in milliseconds for minimal progress update
            this.timerStep = 1000;
            this.watch = false;

            this.currentVideo = {
                src: 'http://animadness.net/media/intro.mp4',
                title: 'Animadness - Let\'s Binge Anime',
                thumb: 'https://animadness.net/img/icon.png'
            };
        }

        init() {
            this.localPlayer = document.getElementById('video_element');
            this.localPlayer.addEventListener('loadeddata', this.onMediaLoadedLocally.bind(this));
            this.localPlayer.addEventListener('error', (error) => {
                this.$rootScope.$broadcast('player:error', error);
            });
            this.initializeUI();
        }

        /**
         * Callback function for init success 
         */
        onInitSuccess() {
            this.updateMediaControlUI();
        }

        /**
         * Generic error callback function 
         */
        onError() {
            console.log('error');
        }

        /**
         * @param {!Object} e A new session
         * This handles auto-join when a page is reloaded
         * When active session is detected, playback will automatically
         * join existing session and occur in Cast mode and media
         * status gets synced up with current media of the session 
         */
        sessionListener(e) {
            this.session = e;
            console.log(this.session);
            if (this.session) {
                this.deviceState = this.DEVICE_STATE.ACTIVE;
                if (this.session.media[0]) {
                    this.onMediaDiscovered('activeSession', this.session.media[0]);
                    this.syncCurrentMedia(this.session.media[0].media.contentId);
                    this.selectMediaUpdateUI(this.currentMediaIndex);
                    this.updateDisplayMessage();
                } else {
                    this.loadMedia(this.epLink ?  this.epLink : 'http://animadness.net/media/intro.mp4', 'Animadness', '/img/icon.png');
                }
                this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
            }
        }

        /**
         * @param {string} currentMediaURL
         */
        syncCurrentMedia(currentMediaURL) {
            for (var i = 0; i < this.mediaContents.length; i++) {
                if (currentMediaURL === this.mediaContents[i]['sources'][0]) {
                    this.currentMediaIndex = i;
                }
            }
        }

        /**
         * @param {string} e Receiver availability
         * This indicates availability of receivers but
         * does not provide a list of device IDs
         */
        receiverListener(e) {
            if (e === 'available') {
                this.receivers_available = true;
                this.updateMediaControlUI();
                console.log('receiver found');
            } else {
                console.log('receiver list empty');
            }
        }

        /**
         * session update listener
         */
        sessionUpdateListener(isAlive) {
            if (!isAlive) {
                this.session = null;
                this.deviceState = this.DEVICE_STATE.IDLE;
                this.castPlayerState = this.PLAYER_STATE.IDLE;
                this.currentMediaSession = null;
                clearInterval(this.timer);
                this.updateDisplayMessage();

                var online = navigator.onLine;
                if (online === true) {
                    // continue to play media locally
                    console.log('current time: ' + this.currentMediaTime);
                    this.playMediaLocally();
                    this.updateMediaControlUI();
                }
            }
        }


        /**
         * Select a media content
         * @param {Number} mediaIndex A number for media index 
         */
        selectMedia(url, title, thumb) {
            if (this.$rootScope.watchingUrl === url) {
                return false;
            }
            console.log('media selected' + title);
            if (title) {
                this.$ionicScrollDelegate.scrollTop();
                this.$rootScope.$broadcast('loading:hide');
            }
            // reset progress bar

            this.currentVideo.src = url;
            this.currentVideo.title = title;
            this.currentVideo.thumb = thumb;

            var pi = document.getElementById('progress_indicator'); 
            var p = document.getElementById('progress'); 

            // reset currentMediaTime
            this.currentMediaTime = 0;

            p.style.width = '0px';
            pi.style.marginLeft = -21 - this.PROGRESS_BAR_WIDTH + 'px';

            if (!this.currentMediaSession) {
                this.localPlayerState = this.PLAYER_STATE.IDLE;
                this.playMediaLocally();
            } else {
                this.castPlayerState = this.PLAYER_STATE.IDLE;
                this.playMedia();
            }
            //this.selectMediaUpdateUI(mediaIndex);
        }

        /**
         * Callback function for request session success 
         * @param {Object} e A chrome.cast.Session object
         */
        onRequestSessionSuccess(e) {
            console.log('session success: ' + e.sessionId);
            this.session = e;
            this.deviceState = this.DEVICE_STATE.ACTIVE;
            this.updateMediaControlUI();
            console.log('Load Media called on 404 ...');
            //this.loadMedia(this.currentMediaIndex);
            this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
        }

        /**
         * Loads media into a running receiver application
         * @param {Number} mediaIndex An index number to indicate current media content
         */
        loadMedia(url, title, thumb) {
            if (!this.session) {
                console.log('no session');
                return;
            }
            console.log('loading...' + title);
            var mediaInfo = new chrome.cast.media.MediaInfo(url);

            mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
            mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
            mediaInfo.contentType = 'video/mp4';

            mediaInfo.metadata.title = title;
            mediaInfo.metadata.images = [{'url': this.MEDIA_SOURCE_ROOT + thumb}];

            var request = new chrome.cast.media.LoadRequest(mediaInfo);
            request.autoplay = this.autoplay;
            if (this.localPlayerState === this.PLAYER_STATE.PLAYING) {
                request.currentTime = this.localPlayer.currentTime;
                this.localPlayer.pause();
                this.localPlayerState = this.PLAYER_STATE.STOPPED;
            } else {
                request.currentTime = 0;
            } 

            this.castPlayerState = this.PLAYER_STATE.LOADING;
            this.session.loadMedia(
                request,
                this.onMediaDiscovered.bind(this, 'loadMedia'),
                this.onLoadMediaError.bind(this)
            );
        }

        /**
         * Callback function for loadMedia success
         * @param {Object} mediaSession A new media object.
         */
        onMediaDiscovered(how, mediaSession) {
            console.log('new media session ID:' + mediaSession.mediaSessionId + ' (' + how + ')');
            this.currentMediaSession = mediaSession;
            if (how === 'loadMedia') {
                if (this.autoplay) {
                    this.castPlayerState = this.PLAYER_STATE.PLAYING;
                } else {
                    this.castPlayerState = this.PLAYER_STATE.LOADED;
                }
            }

            if (how === 'activeSession') {
                this.castPlayerState = this.session.media[0].playerState; 
                this.currentMediaTime = this.session.media[0].currentTime; 
            }

            if (this.castPlayerState === this.PLAYER_STATE.PLAYING) {
                // start progress timer
                this.startProgressTimer(this.incrementMediaTime);
            }

            this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));

            this.currentMediaDuration = this.currentMediaSession.media.duration;
            var duration:any = this.currentMediaDuration;
            var hr = duration / 3600;
            duration -= hr * 3600;
            var min = duration / 60;
            var sec = duration % 60;
            if (hr > 0) {
                duration = hr + ':' + min + ':' + sec;
            } else {
                if (min > 0) {
                    duration = min + ':' + sec;
                } else {
                    duration = sec;
                }
            }
            //document.getElementById('duration').innerHTML = duration;

            if (this.localPlayerState === this.PLAYER_STATE.PLAYING) {
                this.localPlayerState = this.PLAYER_STATE.STOPPED;
                var vi = document.getElementById('video_image');
                vi.style.display = 'block';
                this.localPlayer.style.display = 'none';
                // start progress timer
                this.startProgressTimer(this.incrementMediaTime);
            }
            // update UIs
            this.updateMediaControlUI();
            this.updateDisplayMessage();
        }

        /**
         * Callback function when media load returns error 
         */
        onLoadMediaError(e) {
            console.log('media error');
            this.castPlayerState = this.PLAYER_STATE.IDLE;
            // update UIs
            this.updateMediaControlUI();
            this.updateDisplayMessage();
        }

        /**
         * Callback function for media status update from receiver
         * @param {!Boolean} e true/false
         */
        onMediaStatusUpdate(e) {
            if (e === false) {
                this.currentMediaTime = 0;
                this.castPlayerState = this.PLAYER_STATE.IDLE;
            }
            console.log('updating media');
            this.updateProgressBar(e);
            this.updateDisplayMessage();
            this.updateMediaControlUI();
        }

        /**
         * Helper function
         * Increment media current position by 1 second 
         */
        incrementMediaTime() {
            if (this.castPlayerState === this.PLAYER_STATE.PLAYING || this.localPlayerState === this.PLAYER_STATE.PLAYING) {
                if (this.watch) {
                    this.$rootScope.$broadcast('player:time', {
                        current: this.currentMediaTime,
                        total: this.currentMediaDuration
                    });
                }
                if (this.currentMediaTime < this.currentMediaDuration) {
                    this.currentMediaTime += 1;
                    this.updateProgressBarByTimer();
                } else {
                    this.currentMediaTime = 0;
                    clearInterval(this.timer);
                    this.$rootScope.$broadcast('player:end');
                }
            }
        }

        /**
         * Play media in local player
         */
        playMediaLocally() {
            var vi = document.getElementById('video_image');
            vi.style.display = 'none';
            this.localPlayer.style.display = 'block';
            if (this.localPlayerState !== this.PLAYER_STATE.PLAYING && this.localPlayerState !== this.PLAYER_STATE.PAUSED) { 
                this.localPlayer.src = this.currentVideo.src;
                this.localPlayer.load();
            } else {
                this.localPlayer.play();
                // start progress timer
                this.startProgressTimer(this.incrementMediaTime);
            }
            this.localPlayerState = this.PLAYER_STATE.PLAYING;
            this.updateMediaControlUI();
        }

        /**
         * Callback when media is loaded in local player 
         */
        onMediaLoadedLocally() {
            this.currentMediaDuration = this.localPlayer.duration;
            var duration:any = this.currentMediaDuration;
                
            var hr = duration / 3600;
            duration -= hr * 3600;
            var min = duration / 60;
            var sec = duration % 60;
            if (hr > 0) {
                duration = hr + ':' + min + ':' + sec;
            } else {
                if (min > 0) {
                    duration = min + ':' + sec;
                } else {
                    duration = sec;
                }
            }
            //document.getElementById('duration').innerHTML = duration;
            this.localPlayer.currentTime = this.currentMediaTime;

            this.localPlayer.play();
            // start progress timer
            this.startProgressTimer(this.incrementMediaTime);
        }

        /**
         * Play media in Cast mode 
         */
        playMedia() {
            if (!this.currentMediaSession) {
                this.playMediaLocally();
                return;
            }

            switch (this.castPlayerState) {
                case this.PLAYER_STATE.LOADED:
                case this.PLAYER_STATE.PAUSED:
                this.currentMediaSession.play(null, 
                    this.mediaCommandSuccessCallback.bind(this, 'playing started for ' + this.currentMediaSession.sessionId),
                    this.onError.bind(this));
                this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
                this.castPlayerState = this.PLAYER_STATE.PLAYING;
                // start progress timer
                this.startProgressTimer(this.incrementMediaTime);
                break;
                case this.PLAYER_STATE.IDLE:
                case this.PLAYER_STATE.LOADING:
                case this.PLAYER_STATE.STOPPED:
                console.log('Load Media called on 648 ...');
                this.loadMedia(this.currentVideo.src, this.currentVideo.title, this.currentVideo.thumb);
                this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
                this.castPlayerState = this.PLAYER_STATE.PLAYING;
                break;
                default:
                break;
            }
            this.updateMediaControlUI();
            this.updateDisplayMessage();
        }

        /**
         * Pause media playback in Cast mode  
         */
        pauseMedia() {
            if (!this.currentMediaSession) {
                this.pauseMediaLocally();
                return;
            }

            if (this.castPlayerState === this.PLAYER_STATE.PLAYING) {
                this.castPlayerState = this.PLAYER_STATE.PAUSED;
                this.currentMediaSession.pause(null,
                    this.mediaCommandSuccessCallback.bind(this, 'paused ' + this.currentMediaSession.sessionId),
                    this.onError.bind(this)
                );
                this.updateMediaControlUI();
                this.updateDisplayMessage();
                clearInterval(this.timer);
            }
        }

        /**
         * Pause media playback in local player 
         */
        pauseMediaLocally() {
            this.localPlayer.pause();
            this.localPlayerState = this.PLAYER_STATE.PAUSED;
            this.updateMediaControlUI();
            clearInterval(this.timer);
        }

        /**
         * Stop media playback in either Cast or local mode  
         */
        stopMedia() {
            if (!this.currentMediaSession) {
                this.stopMediaLocally();
                return;
            }

            this.currentMediaSession.stop(null,
                this.mediaCommandSuccessCallback.bind(this, 'stopped ' + this.currentMediaSession.sessionId),
                this.onError.bind(this)
            );
            this.castPlayerState = this.PLAYER_STATE.STOPPED;
            clearInterval(this.timer);

            this.updateDisplayMessage();
            this.updateMediaControlUI();
        }

        /**
         * Stop media playback in local player
         */
        stopMediaLocally() {
            var vi = document.getElementById('video_image');
            vi.style.display = 'block';
            this.localPlayer.style.display = 'none';
            this.localPlayer.stop();
            this.localPlayerState = this.PLAYER_STATE.STOPPED;
            this.updateMediaControlUI();
        }

        /**
         * Set media volume in Cast mode
         * @param {Boolean} mute A boolean  
         */
        setReceiverVolume(mute:any, event:any = false) {
            var p = document.getElementById('audio_bg_level'); 
            if (event.currentTarget.id === 'audio_bg_track') {
                var pos = 100 - event.offsetY;
            } else {
                var pos = p.clientHeight - event.offsetY;
            }
            if (!this.currentMediaSession) {
                this.localPlayer.volume = pos < 100 ? pos / 100 : 1;
                p.style.height = pos + 'px';
                p.style.marginTop = -pos + 'px';
                return;
            }

            if (event.currentTarget.id === 'audio_bg_track' || event.currentTarget.id === 'audio_bg_level') {
                // add a drag to avoid loud volume
                if (pos < 100) {
                    var vScale = this.currentVolume * 100;
                    if (pos > vScale) {
                        pos = vScale + (pos - vScale) / 2;
                    }
                    p.style.height = pos + 'px';
                    p.style.marginTop = -pos + 'px';
                    this.currentVolume = pos / 100;
                } else {
                    this.currentVolume = 1;
                }
            }

            if (!mute) {
                this.session.setReceiverVolumeLevel(this.currentVolume,
                this.mediaCommandSuccessCallback.bind(this),
                this.onError.bind(this));
            } else {
                this.session.setReceiverMuted(true,
                this.mediaCommandSuccessCallback.bind(this),
                this.onError.bind(this));
            }
            this.updateMediaControlUI();
        }

        /**
         * Mute media function in either Cast or local mode 
         */
        muteMedia() {
            if (this.audio === true) {
                this.audio = false;
                document.getElementById('audio_on').style.display = 'none';
                document.getElementById('audio_off').style.display = 'block';
                if (this.currentMediaSession) {
                    this.setReceiverVolume(true);
                } else {
                    this.localPlayer.muted = true;
                }
            } else {
                this.audio = true;
                document.getElementById('audio_on').style.display = 'block';
                document.getElementById('audio_off').style.display = 'none';
                if (this.currentMediaSession) {
                    this.setReceiverVolume(false);
                } else {
                    this.localPlayer.muted = false;
                }
            } 
            this.updateMediaControlUI();
        }


        /**
         * media seek function in either Cast or local mode
         * @param {Event} e An event object from seek 
         */
        seekMedia(event) {
            var pos = parseInt(event.offsetX, 10);
            var pi = document.getElementById('progress_indicator'); 
            var p = document.getElementById('progress'); 
            if (event.currentTarget.id === 'progress_indicator') {
                var curr = this.currentMediaTime + this.currentMediaDuration * pos / this.PROGRESS_BAR_WIDTH;
                var pp = parseInt(pi.style.marginLeft, 10) + pos;
                var pw = parseInt(p.style.width, 10) + pos;
            } else {
                var curr = pos * this.currentMediaDuration / this.PROGRESS_BAR_WIDTH;
                var pp = pos - 21 - this.PROGRESS_BAR_WIDTH;
                var pw = pos;
            }

            if (this.localPlayerState === this.PLAYER_STATE.PLAYING || this.localPlayerState === this.PLAYER_STATE.PAUSED) {
                this.localPlayer.currentTime = curr;
                this.currentMediaTime = curr;
                this.localPlayer.play();
            }

            if (this.localPlayerState === this.PLAYER_STATE.PLAYING || this.localPlayerState === this.PLAYER_STATE.PAUSED 
                || this.castPlayerState === this.PLAYER_STATE.PLAYING || this.castPlayerState === this.PLAYER_STATE.PAUSED) {
                p.style.width = pw + 'px';
                pi.style.marginLeft = pp + 'px';
            }

            if (this.castPlayerState !== this.PLAYER_STATE.PLAYING && this.castPlayerState !== this.PLAYER_STATE.PAUSED) {
                return;
            }

            this.currentMediaTime = curr;
            console.log('Seeking ' + this.currentMediaSession.sessionId + ':' +
                this.currentMediaSession.mediaSessionId + ' to ' + pos + '%');
            this.setSeekTime(this.currentMediaTime);
        }

        setSeekTime(time) {
            this.currentMediaTime = time;
            if (this.currentMediaSession) {
                var request = new chrome.cast.media.SeekRequest();
                request.currentTime = time;
                this.currentMediaSession.seek(
                    request,
                    this.onSeekSuccess.bind(this, 'media seek done'),
                    this.onError.bind(this)
                );
                this.castPlayerState = this.PLAYER_STATE.SEEKING;
            } else {
                this.localPlayer.currentTime = time;
                this.currentMediaTime = time;
                this.localPlayer.play();
            }
            this.updateDisplayMessage();
            this.updateMediaControlUI();
        }

        /**
         * Callback function for seek success
         * @param {String} info A string that describe seek event
         */
        onSeekSuccess(info) {
            console.log(info);
            this.castPlayerState = this.PLAYER_STATE.PLAYING;
            this.updateDisplayMessage();
            this.updateMediaControlUI();
        }

        /**
         * Callback function for media command success 
         */
        mediaCommandSuccessCallback(info, e) {
            console.log(info);
        }

        /**
         * Update progress bar when there is a media status update
         * @param {Object} e An media status update object 
         */
        updateProgressBar(e) {
            var p = document.getElementById('progress'); 
            var pi = document.getElementById('progress_indicator'); 
            if (e === false) {
                p.style.width = '0px';
                pi.style.marginLeft = -21 - this.PROGRESS_BAR_WIDTH + 'px';
                clearInterval(this.timer);
                this.castPlayerState = this.PLAYER_STATE.STOPPED;
                this.updateDisplayMessage();
            } else {
                p.style.width = Math.ceil(this.PROGRESS_BAR_WIDTH * this.currentMediaSession.currentTime / this.currentMediaSession.media.duration + 1) + 'px';
                this.progressFlag = false; 
                setTimeout(this.setProgressFlag.bind(this), 1000); // don't update progress in 1 second
                var pp = Math.ceil(this.PROGRESS_BAR_WIDTH * this.currentMediaSession.currentTime / this.currentMediaSession.media.duration);
                pi.style.marginLeft = -21 - this.PROGRESS_BAR_WIDTH + pp + 'px';
            }
        }

        /**
         * Set progressFlag with a timeout of 1 second to avoid UI update
         * until a media status update from receiver 
         */
        setProgressFlag() {
            this.progressFlag = true;
        }

        /**
         * Update progress bar based on timer  
         */
        updateProgressBarByTimer() {
            var p = document.getElementById('progress'); 
            if (isNaN(parseInt(p.style.width, 10))) {
                p.style.width = '0';
            } 
            if (this.currentMediaDuration > 0) {
                var pp = Math.floor(this.PROGRESS_BAR_WIDTH * this.currentMediaTime / this.currentMediaDuration);
            }
                
            if (this.progressFlag) { 
                // don't update progress if it's been updated on media status update event
                p.style.width = pp + 'px'; 
                var pi = document.getElementById('progress_indicator'); 
                pi.style.marginLeft = -21 - this.PROGRESS_BAR_WIDTH + pp + 'px';
            }

            if (pp > this.PROGRESS_BAR_WIDTH) {
                clearInterval(this.timer);
                this.deviceState = this.DEVICE_STATE.IDLE;
                this.castPlayerState = this.PLAYER_STATE.IDLE;
                this.updateDisplayMessage();
                this.updateMediaControlUI();
            }
        }

        /**
         * Update display message depending on cast mode by deviceState 
         */
        updateDisplayMessage() {
            if (this.deviceState !== this.DEVICE_STATE.ACTIVE || this.castPlayerState === this.PLAYER_STATE.IDLE || this.castPlayerState === this.PLAYER_STATE.STOPPED) {
                document.getElementById('playerstate').style.display = 'none';
                document.getElementById('playerstatebg').style.display = 'none';
                $('#play').css('display', 'block');
                document.getElementById('video_image_overlay').style.display = 'none';
            } else {
                document.getElementById('playerstate').style.display = 'block';
                document.getElementById('playerstatebg').style.display = 'block';
                document.getElementById('video_image_overlay').style.display = 'block';
                document.getElementById('playerstate').innerHTML = 
                this.currentVideo.title + ' '
                + this.castPlayerState + ' on ' + this.session.receiver.friendlyName;
            }
        }

        /**
         * Update media control UI components based on localPlayerState or castPlayerState
         */
        updateMediaControlUI() {
            var playerState = this.deviceState === this.DEVICE_STATE.ACTIVE ? this.castPlayerState : this.localPlayerState;
            switch (playerState) {
                case this.PLAYER_STATE.LOADED:
                case this.PLAYER_STATE.PLAYING:
                $('#play').css('display', 'none');
                document.getElementById('pause').style.display = 'block';
                break;
                case this.PLAYER_STATE.PAUSED:
                case this.PLAYER_STATE.IDLE:
                case this.PLAYER_STATE.LOADING:
                case this.PLAYER_STATE.STOPPED:
                $('#play').css('display', 'block');
                $('#pause').css('display', 'none');
                break;
                default:
                break;
            }

            if (this.deviceState === this.DEVICE_STATE.ACTIVE) {
                document.getElementById('casticonactive').style.display = 'block';
                document.getElementById('casticonidle').style.display = 'none';
                this.hideFullscreenButton();
            } else {
                document.getElementById('casticonidle').style.display = 'block';
                document.getElementById('casticonactive').style.display = 'none';
                this.showFullscreenButton();
            }
        }

        /**
         * Update UI components after selectMedia call 
         * @param {Number} mediaIndex An number
         */
        selectMediaUpdateUI(mediaIndex) {
            $('#video_image').attr('src', this.MEDIA_SOURCE_ROOT + this.mediaContents[mediaIndex]['thumb']);
            document.getElementById('progress').style.width = '0px';
            // document.getElementById('media_title').innerHTML = this.mediaContents[mediaIndex]['title'];
            // document.getElementById('media_subtitle').innerHTML = this.mediaContents[mediaIndex]['subtitle'];
            // document.getElementById('media_desc').innerHTML = this.mediaContents[mediaIndex]['description'];
        }

        /**
         * Requests that a receiver application session be created or joined. By default, the SessionRequest
         * passed to the API at initialization time is used; this may be overridden by passing a different
         * session request in opt_sessionRequest. 
         */
        launchApp(epLink) {
            console.log('launching app...');
            this.epLink = epLink;
            chrome.cast.requestSession(
                this.sessionListener.bind(this),
                this.onLaunchError.bind(this));
            if (this.timer) {
                clearInterval(this.timer);
            }
        }

        /**
         * Callback function for launch error
         */
        onLaunchError() {
            console.log('launch error');
            this.deviceState = this.DEVICE_STATE.ERROR;
        }

        /**
         * Stops the running receiver application associated with the session.
         */
        stopApp() {
            this.session.stop(this.onStopAppSuccess.bind(this, 'Session stopped'),
            this.onError.bind(this));    
        }

        /**
         * Callback function for stop app success 
         */
        onStopAppSuccess(message) {
            console.log(message);
            this.deviceState = this.DEVICE_STATE.IDLE;
            this.castPlayerState = this.PLAYER_STATE.IDLE;
            this.currentMediaSession = null;
            clearInterval(this.timer);
            this.updateDisplayMessage();

            // continue to play media locally
            console.log('current time: ' + this.currentMediaTime);
            this.playMediaLocally();
            this.updateMediaControlUI();
        }

        /**
         * Initialize UI components and add event listeners 
         */
        initializeUI() {
            // set initial values for title, subtitle, and description 
            // document.getElementById('media_title').innerHTML = this.mediaContents[0]['title'];
            // document.getElementById('media_subtitle').innerHTML = this.mediaContents[this.currentMediaIndex]['subtitle'];
            // document.getElementById('media_desc').innerHTML = this.mediaContents[this.currentMediaIndex]['description'];

            // add event handlers to UI components
            //document.getElementById('casticonidle').addEventListener('click', this.launchApp.bind(this));
            //document.getElementById('casticonactive').addEventListener('click', this.stopApp.bind(this));
            //document.getElementById('progress_bg').addEventListener('click', this.seekMedia.bind(this));
            //document.getElementById('progress').addEventListener('click', this.seekMedia.bind(this));
            document.getElementById('progress_indicator').addEventListener('dragend', this.seekMedia.bind(this));
            //document.getElementById('audio_on').addEventListener('click', this.muteMedia.bind(this));
            //document.getElementById('audio_off').addEventListener('click', this.muteMedia.bind(this));
            //document.getElementById('audio_bg').addEventListener('mouseover', this.showVolumeSlider.bind(this));
            //document.getElementById('audio_on').addEventListener('mouseover', this.showVolumeSlider.bind(this));
            //document.getElementById('audio_bg_level').addEventListener('mouseover', this.showVolumeSlider.bind(this));
            //document.getElementById('audio_bg_track').addEventListener('mouseover', this.showVolumeSlider.bind(this));
            //document.getElementById('audio_bg_level').addEventListener('click', this.setReceiverVolume.bind(this, false));
            //document.getElementById('audio_bg_track').addEventListener('click', this.setReceiverVolume.bind(this, false));
            //document.getElementById('audio_bg').addEventListener('mouseout', this.hideVolumeSlider.bind(this));
            //document.getElementById('audio_on').addEventListener('mouseout', this.hideVolumeSlider.bind(this));
            // document.getElementById('media_control').addEventListener('mouseover', this.showMediaControl.bind(this));
            // document.getElementById('media_control').addEventListener('mouseout', this.hideMediaControl.bind(this));
            //document.getElementById('fullscreen_expand').addEventListener('click', this.requestFullScreen.bind(this));
            //document.getElementById('fullscreen_collapse').addEventListener('click', this.cancelFullScreen.bind(this));
            document.addEventListener('fullscreenchange', this.changeHandler.bind(this), false);      
            document.addEventListener('webkitfullscreenchange', this.changeHandler.bind(this), false);

            // enable play/pause buttons
            // document.getElementById('play').addEventListener('click', this.playMedia.bind(this));
            //document.getElementById('pause').addEventListener('click', this.pauseMedia.bind(this));
            document.getElementById('progress_indicator').draggable = true;
        }

        destroy() {
            document.getElementById('progress_indicator').removeEventListener('dragend', this.seekMedia.bind(this));
            document.removeEventListener('fullscreenchange', this.changeHandler.bind(this), false);      
            document.removeEventListener('webkitfullscreenchange', this.changeHandler.bind(this), false);
            this.pauseMedia();
        }

        /**
         * Show the media control 
         */
        // showMediaControl() {
        //     document.getElementById('media_control').style.opacity = '0.7';
        // }  

        // /**
        //  * Hide the media control  
        //  */
        // hideMediaControl() {
        //     document.getElementById('media_control').style.opacity = '0';
        // }  

        /**
         * Show the volume slider
         */
        showVolumeSlider() {
            document.getElementById('audio_bg').style.opacity = '1';
            document.getElementById('audio_bg_track').style.opacity = '1';
            document.getElementById('audio_bg_level').style.opacity = '1';
            document.getElementById('audio_indicator').style.opacity = '1';
        }

        /**
         * Hide the volume slider 
         */
        hideVolumeSlider() {
            document.getElementById('audio_bg').style.opacity = '0';
            document.getElementById('audio_bg_track').style.opacity = '0';
            document.getElementById('audio_bg_level').style.opacity = '0';
            document.getElementById('audio_indicator').style.opacity = '0';
        }

        /**
         * Request full screen mode 
         */
        requestFullScreen() {
            if (this.localPlayer.requestFullscreen) {
                this.localPlayer.requestFullscreen();
            } else if (this.localPlayer.mozRequestFullScreen) {
                this.localPlayer.mozRequestFullScreen();
            } else if (this.localPlayer.webkitRequestFullscreen) {
                this.localPlayer.webkitRequestFullscreen();
            } else if (this.localPlayer.msRequestFullscreen) {
                this.localPlayer.msRequestFullscreen();
            }
        }

        /**
         * Exit full screen mode 
         */
        cancelFullScreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }

        /**
         * Exit fullscreen mode by escape 
         */
        changeHandler() {
            this.fullscreen = !this.fullscreen;
            if (this.deviceState === this.DEVICE_STATE.ACTIVE) {
                this.hideFullscreenButton();
            } else {
                this.showFullscreenButton();
            }
        }

        /**
         * Show expand/collapse fullscreen button
         */
        showFullscreenButton() {
            if (this.fullscreen) {
                document.getElementById('fullscreen_expand').style.display = 'none';
                document.getElementById('fullscreen_collapse').style.display = 'block';
            } else {
                document.getElementById('fullscreen_expand').style.display = 'block';
                document.getElementById('fullscreen_collapse').style.display = 'none';
            }
        }

        /**
         * Hide expand/collapse fullscreen button
         */
        hideFullscreenButton() {
            document.getElementById('fullscreen_expand').style.display = 'none';
            document.getElementById('fullscreen_collapse').style.display = 'none';
        }

        /**
         * @param {function} A callback function for the function to start timer 
         */
        startProgressTimer(callback) {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }

            // start progress timer
            this.timer = setInterval(callback.bind(this), this.timerStep);
        }
    }

    angular.module('Animadness').service('Player', PlayerService);
}
