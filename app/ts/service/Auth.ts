/// <reference path="../../typings/index.d.ts"/>

module Animadness {
    class AuthService {
        pause: boolean;
        unwatch: any;
        localSession: string;

        constructor(
            protected enjin, 
            protected $http,
            protected $state, 
            protected $rootScope,
            protected Firebase,
            protected $filter,
            protected $firebaseAuth,
            protected $cordovaOauth,
            protected $ionicHistory
        ) {
            // ON LOAD
            this.localSession = this.enjin.name + 'Session';
        }

        start() {
            this.restoreSession();
            this.$rootScope.$on('$stateChangeError', (event, toState, toParams, fromState, fromParams, error) => {
                if (error === 'AUTH_REQUIRED') {
                    this.$state.go('login');
                } else {
                    throw error;
                }
            });

            this.enjin.auth = {
                instance: this.$firebaseAuth(),
                withSocial: this.withSocial.bind(this),
                setSession: this.restoreSession.bind(this),
                storeSession: this.storeSession.bind(this),
                withEmail: this.withEmail.bind(this),
                logout: this.logout.bind(this)
            };
        }

        tokenLogin(credential, callback) {
            this.enjin.auth.instance.$signInWithCredential(credential).then((firebaseUser) => {
                this.setSession(firebaseUser, callback);
            }).catch((error) => {
                console.log('Authentication failed:', error);
            });
        }

        withSocial(type, callback, redirect = false) {
            if (window.cordova) {
                if (type === 'google') {
                    this.$cordovaOauth.google(this.enjin.google.id, ['email'], {
                        redirect_uri: this.enjin.oauthCallback
                    }).then((result) => {
                        this.tokenLogin(firebase.auth.GoogleAuthProvider.credential(result.id_token), callback);
                    });
                } else if (type === 'facebook') {
                    this.$cordovaOauth.facebook(this.enjin.facebook.id, ['email'], {
                        redirect_uri: this.enjin.oauthCallback
                    }).then((result) => {
                        this.tokenLogin(firebase.auth.FacebookAuthProvider.credential(result.access_token), callback);
                    });
                } else if (type === 'twitter') {
                    this.$cordovaOauth.twitter(this.enjin.twitter.id, this.enjin.twitter.secret, {
                        redirect_uri: this.enjin.oauthCallback
                    }).then((result) => {
                        this.tokenLogin(
                            firebase.auth.TwitterAuthProvider.credential(result.oauth_token, result.oauth_token_secret), 
                            callback
                        );
                    });
                } else if (type === 'github') {
                    this.$cordovaOauth.github(this.enjin.github.id, this.enjin.github.secret, ['user:email', 'public_repo', 'repo', 'write:repo_hook'], {
                        redirect_uri: this.enjin.oauthCallback
                    }).then((result) => {
                        this.tokenLogin(firebase.auth.GithubAuthProvider.credential(result.access_token), callback);
                    });
                }
            } else {
                var provider; 
                if (type === 'google') {
                    provider = type;
                } else if (type === 'facebook') {
                    provider = type;
                } else if (type === 'twitter') {
                    provider = type;
                } else if (type === 'github') {
                    provider = new firebase.auth.GithubAuthProvider();
                    provider.addScope('user:email');
                    provider.addScope('public_repo');
                    provider.addScope('repo');
                    provider.addScope('write:repo_hook');
                }
                this.enjin.auth.instance[redirect ? '$signInWithRedirect' : '$signInWithPopup' ](provider).then((firebaseUser) => {
                    this.setSession(firebaseUser, callback);
                }).catch((error) => {
                    console.log('Authentication failed:', error);
                    alert(error.message);
                });
            }
        }

        withEmail(email, password, callback) {
            this.enjin.auth.instance.$signInWithEmailAndPassword(email, password).then((firebaseUser) => {
                this.setSession(firebaseUser, callback);
            });
        }

        restoreSession() {
            if (!this.enjin.session && localStorage.getItem(this.localSession)) {
                this.setSession(JSON.parse(localStorage.getItem(this.localSession)));
            }
        }

        setSession(user, callback = null) {
            if (user) {
                console.log(user);
                var profile = this.enjin.database.get('user/' + user.user.uid);
                profile.$loaded().then(() => {
                    user.profile = {
                        name: profile.name,
                        role: profile.role,
                        watching: profile.watching,
                        sharing: profile.sharing
                    };
                    this.storeSession(user);
                    if (callback && typeof callback === 'function') {
                        callback(user);
                    } 
                });   
            }
        }

        storeSession(session) {
            this.enjin.session = this.$rootScope.session = session;
            localStorage.setItem(this.localSession, JSON.stringify(session));
        }

        logout(callback) {
            if (confirm('Are you sure you wish to log out?')) {
                this.enjin.database.instance.auth().signOut().then(() => {
                    this.$ionicHistory.clearCache();
                    this.$ionicHistory.clearHistory();
                    this.$state.go('login');
                    localStorage.clear();
                    delete this.enjin.session;
                    if (callback && typeof callback === 'function') {
                        callback({success: true});
                    }
                });      
            }
        } 
    } 

    angular.module('Animadness').service('Auth', AuthService);
}