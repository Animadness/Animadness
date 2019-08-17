/// <reference path="../typings/index.d.ts"/>
declare var firebase;
declare var chrome;
declare var ExtensionConfig;


module Animadness {
    'use strict';

    class ExtensionBackgroundService {
        animeTab:any;
        addQueue: any;
        queue: any;
        queued: any;
        item: any;
        config: any;
        token: any;
        firebank: any;
        query: string;
        moviesDB: any;
        flaggedAsBot: boolean;
        reviewing: boolean;
        enjin: any;

        constructor() {
            // ON LOAD
            this.enjin = new ExtensionConfig;
            this.flaggedAsBot = false;
            this.query = '';
            this.config = this.enjin.google.firebase; 
            this.moviesDB = this.enjin.api.moviesDB;

            if (localStorage.getItem('firebank')) {
                this.firebank = JSON.parse(localStorage.getItem('firebank'));
            }

            firebase.initializeApp(this.config);
            this.chromeListeners();
            this.startWatchers();
        }

        seriesSearch(query, callback:any = false) {
            $.get(`${this.moviesDB.url}search/tv?api_key=${this.moviesDB.apiKey}&language=${this.moviesDB.lang}&query=${query}&page=1`)
            .done((data) => {
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            })
            .fail(() => {
                console.log(`Couldn't get series info from the movies DB`);
            });
        }

        seriesInfo(id, callback:any = false) {
            $.get(`${this.moviesDB.url}tv/${id}?api_key=${this.moviesDB.apiKey}&language=${this.moviesDB.lang}`)
            .done((data) => {
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            })
            .fail(() => {
                console.log(`Couldn't get series info from the movies DB`);
            });
        }

        seasonInfo(id, season, callback:any = false) {
            $.get(`${this.moviesDB.url}tv/${id}/season/${season}?api_key=${this.moviesDB.apiKey}&language=${this.moviesDB.lang}`)
            .done((data) => {
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            })
            .fail(() => {
                console.log(`Couldn't get series info from the movies DB`);
            });
        }

        chromeListeners() {
            chrome.runtime.onMessage.addListener(this.eventLisenters.bind(this));
            chrome.runtime.onMessageExternal.addListener(this.eventLisenters.bind(this));
        }

        eventLisenters(request, sender, sendResponse) {
            console.log(request, sender);
            var calledBack = false;
            function callback(obj) {
                try {
                    sendResponse(obj);
                } catch (e) {
                    console.log(e);
                }
                calledBack = true;
            }
            var token = request.action === 'connect' ? request.token : false;
            this.refreshToken(token, (data) => {
                switch(request.action) {
                    case 'connect':
                        this.connect(callback);
                        break;
                    case 'disconnect':
                        this.disconnect(callback);
                        break;
                    case 'getVideoUrl':
                        this.getVideoUrl(request.url, this.reviewing, callback);
                        break;
                    case 'lookup':
                        this.lookup(request.query, callback);
                        break;
                    case 'add':
                        this.animeInfo(request.anime, callback);
                        break;
                    case 'refresh':
                        this.animeInfo(request.anime, callback);
                        break;
                }
            });

            if (!calledBack) {
                return true;
            }
        }

        connect(callback) {
            this.startWatchers();
            if (callback && typeof callback === 'function') {
                callback({success: true});
            }         
        }

        disconnect(callback) {
            this.queue.off();
            localStorage.clear();
            if (callback && typeof callback === 'function') {
                callback({success: true});
            } 
        }

        startWatchers() {
            if (this.firebank && this.firebank.user_id) {
                if (this.queue) {
                    this.queue.off();
                }
                var userWatch = `user/${this.firebank.user_id}/watch`;
                this.queue = firebase.database().ref(userWatch);
                this.queue.on('value', (snapshot) => {
                    this.item = snapshot.val();
                    if (this.item !== null){ 
                        this.getEpisode(this.item.dubbed && this.item.provider.kissanime['dub'] ? this.item.provider.kissanime['dub'] : this.item.provider.kissanime['sub'], this.item.reviewing);
                    }
                });
            }
        }

        scrapeAnimeEpisodes(site, types, callback) {
            var links = {
                sub: [],
                dub: []
            };
            var numberPattern = /\d+/g;
            var listSelector = '.listing tr:not(:first-child)';
            var episodeSelector = `${listSelector} a`;
            this.getPage(types.sub, ($sub) => {
                var subSelector = $sub.find(`${listSelector}:contains("Episode")`).get().length 
                    ? `${episodeSelector}:contains("Episode")` 
                    : episodeSelector;

                links.sub = $sub.find(site === 'kissanime' ? subSelector : '.server:first a').map(function() {
                    return {
                        link: site === 'kissanime' ? 'http://kissanime.ru' + $(this).attr('href') : 'https://9anime.to' + $(this).attr('href'),
                        number: site === 'kissanime' ? $(this).text().match(numberPattern)[$(this).text().match(numberPattern).length - 1] : $(this).text()
                    }
                }).get();

                this.getPage(types.dub, ($dub) => {
                    if ($dub) {
                        var dubSelector = $dub.find(`${listSelector}:contains("Episode")`).get().length 
                            ? `${episodeSelector}:contains("Episode")` 
                            : episodeSelector;

                        links.dub = $dub.find(site === 'kissanime' ? dubSelector : '.server:first a').map(function() {
                            return {
                                link: site === 'kissanime' ? 'http://kissanime.ru' + $(this).attr('href') : 'https://9anime.to' + $(this).attr('href'),
                                number: site === 'kissanime' ? $(this).text().match(numberPattern)[$(this).text().match(numberPattern).length - 1] : $(this).text()
                            }
                        }).get();
                    }
                    
                    if (callback && typeof callback === 'function') {
                        if (site === 'kissanime') {
                            links.dub = links.dub.reverse();
                            links.sub = links.sub.reverse();
                        }
                        callback(links);
                    }
                });
            });
        }

        scrapeFillers(url, callback) {
            this.getPage(url, ($fillers) => {
                callback($fillers ? $fillers.find('.EpisodeList tbody tr').map(function() {
                    return $(this).hasClass('canon');
                }).get() : false);
            });
        }

        scrapeAnime(anime, series, fillers, callback) {
            anime.name = series.name;
            anime.homepage = series.homepage && !anime.homepage ? series.homepage : anime.homepage;
            anime.image = series.backdrop_path && !anime.image ? `https://image.tmdb.org/t/p/w300${series.backdrop_path}` : anime.image;
            anime.banner = series.backdrop_path && !anime.banner ? `https://image.tmdb.org/t/p/w1920${series.backdrop_path}` : anime.banner;
            anime.description = series.overview.length ? series.overview : anime.description;
            this.scrapeAnimeEpisodes('kissanime', anime.provider.kissanime, (mainLinks) => {
                this.scrapeAnimeEpisodes('9anime', anime.provider['9anime'], (backupLinks) => {
                    this.setupSeasons(anime, series, fillers, mainLinks, backupLinks, callback);
                });
            });
        }

        animeInfo(anime, callback) {
            this.seriesInfo(anime.tvId, (series) => {
                this.getPage(anime.provider.kissanime.sub, ($sub) => {
                    anime.genres = $sub.find('#leftside .barContent p:contains("Genres:") a').map(function() {
                        return $(this).text();
                    }).get();
                    if (anime.fillers) {
                        this.scrapeFillers(anime.fillers, (fillers) => {
                            this.scrapeAnime(anime, series, fillers, callback);
                        });
                    } else {
                        this.scrapeAnime(anime, series, false, callback);
                    }
                });
            });
        }

        setupSeasons(anime, series, fillers, mainLinks, backupLinks, callback) {
            var time = 500;
            var episodeIndex = 0;
            anime.seasons = {};

            $.each(series.seasons, (index, season) => {
                setTimeout(() => {
                    if (season.season_number === 0) {
                        return true;
                    }
                    this.seasonInfo(series.id, season.season_number, (seasonData) => {
                        anime.seasons[seasonData.season_number] = {
                            image: seasonData.poster_path ? `${this.moviesDB.imageUrl}w300${seasonData.poster_path}` : false,
                            banner: seasonData.poster_path ? `${this.moviesDB.imageUrl}w1920${seasonData.poster_path}` : false,
                            episodes: {}
                        };
                        $.each(seasonData.episodes, (index, episode) => {
                            if (!episode.episode_number) {
                                return true;
                            }
                            var newEpisode = {
                                name: episode.name,
                                number: episodeIndex + 1,
                                image: episode.still_path ? `${this.moviesDB.imageUrl}w500${episode.still_path}` : false,
                                provider: {
                                    kissanime: {
                                        sub: mainLinks.sub[episodeIndex] ? mainLinks.sub[episodeIndex].link : false,
                                        dub: mainLinks.dub[episodeIndex] ? mainLinks.dub[episodeIndex].link : false
                                    },
                                    '9anime': {
                                        sub: backupLinks.sub[episodeIndex] ? backupLinks.sub[episodeIndex].link : false,
                                        dub: backupLinks.dub[episodeIndex] ? backupLinks.dub[episodeIndex].link : false
                                    }
                                },
                                canon: !fillers || fillers[episodeIndex] ? true : false 
                            };
                            if (mainLinks.sub[episodeIndex] || mainLinks.dub[episodeIndex] || backupLinks.sub[episodeIndex] || backupLinks.dub[episodeIndex]) {
                                anime.seasons[seasonData.season_number].episodes[newEpisode.number] = newEpisode;
                            }
                            episodeIndex += 1;
                        });
                        if (!Object.keys(anime.seasons[seasonData.season_number].episodes).length) {
                            console.log('Removing empty season...', anime.seasons[seasonData.season_number]);
                            delete anime.seasons[seasonData.season_number];
                        }
                    });
                    
                    if (index === series.seasons.length - 1) {
                        setTimeout(() => {
                            callback(anime);
                        }, 1000);
                    }
                }, time);
                time += 1000;
            });
        }

        lookup(query, callback) {
            if (query && query.length > 1) {
                query = query.toLowerCase();
                this.getPage('http://kissanime.ru/Search/Anime?keyword=' + query.replace(' ', '%20'), ($res) => {
                    var results = $res.find('.listing tr:not(.head)').get();
                    var series:any = [];
                    $.each(results, (index, result) => {
                        result = $(result)[0];
                        if (result.cells && result.cells.length > 1) {
                            series.push({
                                name: result.cells[0].firstElementChild.innerText,
                                link: result.cells[0].firstElementChild.href
                            });
                        }
                    });

                    this.getFillers(query, (fillers) => {
                        this.seriesSearch(query, (tv) => {
                            this.getPage('https://9anime.to/search?keyword=' + query.replace(' ', '+'), ($backup) => {
                                var results = $backup.find('.list-film a.name').get();
                                var backups:any = [];
                                $.each(results, (index, result) => {
                                    result = $(result)[0];
                                    backups.push({
                                        name: result.innerText,
                                        link: result.href
                                    });
                                });

                                callback({
                                    fillers,
                                    series,
                                    tv,
                                    backups
                                });
                            });
                        });
                    });
                });
            }
        }

        fireQuery(method, ref, data = {}, token = false, callback:any = false) {
            if (!token) {
                token = this.firebank.access_token;
            }
            $.ajax({
                url: `${this.config.databaseURL}/${ref}.json?auth=${token}`,
                method: method, 
                dataType: 'json', 
                data: JSON.stringify(data) 
            }).done((res) => {
                if (callback && typeof callback === 'function') {
                    callback(res);
                }
            });
        }

        getVideoUrl(url, reviewing, callback) {
            var baseRef = reviewing ? 'review' : 'anime' ;
            this.fireQuery(
                'PATCH', 
                `${baseRef}/${this.item.anime}/episodes/${this.item.episode}/video`,
                {[this.item.dubbed ? 'dub' : 'sub']: url}
            );
            this.fireQuery(
                'DELETE',
                `user/${this.firebank.user_id}/watch`
            );
            if (this.animeTab) {
                chrome.tabs.remove(this.animeTab.id);
                delete this.animeTab;
            }
        }

        refreshToken(token, callback) {
            if (!token && !localStorage.getItem('firebank')) {
                alert('Please reconnect your extension...');
                return false;
            } else if (!token && localStorage.getItem('firebank')) {
                this.firebank = JSON.parse(localStorage.getItem('firebank'));
                token = this.firebank.refresh_token;    
            }

            $.ajax({
                url: `https://securetoken.googleapis.com/v1/token?key=${this.config.apiKey}`,
                method: 'POST', 
                data: {
                    grant_type: 'refresh_token',
                    refresh_token: token 
                } 
            }).done((res) => {
                console.log('Token Refreshed!');
                this.firebank = res;
                localStorage.setItem('firebank', JSON.stringify(res));
                callback(res);
            }).fail(() => {
                console.log('Failed to refresh token');
                callback(false);
            });
        }

        getFillers(query, callback) {
            var fillers = [];
            this.getPage('http://www.animefillerlist.com/shows', ($fillers) => {                            
                var fillerList = $fillers.find('#ShowList a');
                if (fillerList.length === 0) {
                    callback([]);
                }
                $.each(fillerList, (index, el) => {
                    fillers.push({
                        name: $(el).text(),
                        link: 'http://www.animefillerlist.com' + $(el).attr('href')
                    });
                    if (index === fillerList.length - 1) {
                        if (callback && typeof callback === 'function') {
                            callback(fillers);
                        }       
                    }
                });
            });
        }

        getPage(url, callback) {
            var x = new XMLHttpRequest();
            x.open('GET', url, true);
            x.responseType = 'document';
            x.onload = () => {
                console.log(x.response);
                if ($(x.response).find('.cf-browser-verification').get().length) {
                    this.timeoutTab('http://kissanime.ru', 10000, () => {
                        this.getPage(url, callback);
                    });
                } else {
                    callback($(x.response));
                }
            };
            x.onerror = () => {
                console.error('Couldn\'t get page: ', url);
                callback(false);
            };
            x.send();
        }

        openForVerification(episodeUrl, reviewing, callback:any = false) {
            chrome.tabs.create({ url: episodeUrl, active: true }, (tab) => {
                var tabId = tab.id;
                chrome.tabs.onRemoved.addListener((tabId, info) => {
                    this.getEpisode(episodeUrl, reviewing, callback);
                });
            });
        }

        getEpisode(episodeUrl, reviewing, callback:any = false, silent = true) {
            this.refreshToken(false, (data) => {
                if (silent) {
                    this.getPage(episodeUrl, ($page) => {
                        if($page && $page[0].title === 'Are You Human') {
                            alert('Please verify that you are human and then we will get the video link...');
                            this.openForVerification(episodeUrl, reviewing, callback);
                        } else {
                            var episodeLink = $page.find('#divQuality option:first').val();
                            if (!episodeLink) {
                                console.log('Kissanime is down... Trying 9anime...');
                                this.getEpisode(this.item.dubbed && this.item.provider['9anime']['dub'] ? this.item.provider['9anime']['dub'] : this.item.provider['9anime']['sub'], reviewing, callback, false);
                            } else {
                                this.getVideoUrl(
                                    atob(episodeLink),
                                    reviewing,
                                    callback
                                );
                            }
                        }
                    });
                } else {
                    chrome.tabs.create({ url: episodeUrl, active: false }, (tab) => {
                        chrome.tabs.query({index: tab.index}, (tabs) => {
                            this.animeTab = tabs[0];
                            setTimeout(() => {
                                chrome.tabs.executeScript(this.animeTab.id, {file: "build/getVideoUrl.js"}, (res) => {
                                    if (chrome.runtime.lastError) {
                                        console.log(chrome.runtime.lastError.message);
                                    }
                                });
                            }, 5000);
                        });
                    });
                }      
            });
        }

        timeoutTab(url, timeout, callback:any = false) {
            chrome.tabs.create({url, active: false}, (tab) => {
                setTimeout(() => {
                    chrome.tabs.remove(tab.id);
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }, timeout); 
            });
        }
    }

    new ExtensionBackgroundService;
}