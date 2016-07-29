/**
 * Created by Alexandre Roussière on 28/04/2016.
 */

var app = angular.module('movieLibrary', []);

/**
 * Used to deal with the CRUD parts of the application
 */
app.controller('MoviesController', function ($window, $scope, indexedDBDatabase, MovieService) {

    var vm = this;
    vm.movies = {};

    //Will be used to get the movie to add from the SearchFromController
    var movieToAdd = {};

    //This is called when the use click on a movie from the research.
    $scope.$on('newMovie', function () {
        movieToAdd = MovieService.getMovie();
    });

    //This is is called when the update is down to refresh the movie Library
    $scope.$on('movieUpdated', function () {

        vm.refreshList();
    });


    //Refresh the movie library
    vm.refreshList = function () {
        console.log("Refresh !");
        indexedDBDatabase.getMovies().then(function (data) {
            vm.movies = data;

        }, function (err) {
            $window.alert(err);
        });
    };
    //Add a movie to the IndexedDB database and refresh the movie library
    vm.addMovie = function () {
        indexedDBDatabase.addMovie(movieToAdd);
        //Once a movie is added, we refresh the movie Library
        vm.refreshList();
        //We display the view of the movie Library and hide the rest
        $("#moviesFoundView").effect('blind');
        $("#showMovieDetail").effect('blind');
        $("#movieLibrary").show();

    };
    /**
     * Remove a movie from the database
     * @param id the ID of the movie
     */
    vm.deleteMovie = function (id) {
        indexedDBDatabase.deleteMovie(id).then(function () {
            //Once we delete a Movie, we refresh movie libary
            $("#showMovieDetail").effect('blind');
            vm.refreshList();
        });

    };

    //Initialise the indexedDb database
    function init() {
        indexedDBDatabase.open().then(function () {
            vm.refreshList();
        });
    }

    //As soon as the app begins, we initialize the database
    init();

});

//Used when the user click on the "search" button
app.controller('SearchFormController', function ($http, MovieService) {

    //Variable to store the data got from the Request
    var foundMovie = this;
    foundMovie.data = {};


    //this.urlRequest = "http://api.betaseries.com/movies/movie";
    //The URL of the Request
    this.urlRequest = "http://api.betaseries.com/movies/search";

    /* The parameters for the request */
    this.version = "2.4";
    //The title is linked to the form as it is the user who enters it.
    this.title = "";
    //The key of the Betaseries API
    this.KeyAPI = "CEE2694F0106";

    /**
     * Send a Reqquest to the Betaseries API according to the Title entered
     */
    this.findMovie = function () {

        $http.get(this.urlRequest, {
                params: {
                    title: this.title,
                    key: this.KeyAPI,
                    v: this.version
                }
            })
            .then(function (result) {

                console.log(result.data);
                foundMovie.data = result.data;

                //Display the list of movies found
                $("#movieLibrary").hide();
                $("#moviesFoundView").show();

            })

    }

    /**
     * Display the view with the detail of the movie clicked.
     * Use the service to pass the data to the other controller
     * @param movieToShow
     */
    this.showDetail = function (movieToShow) {
        MovieService.addMovie(movieToShow);

        if ($('#showMovieDetail').is(":hidden")) {
            $('#showMovieDetail').fadeOut('slow', function () {
                $('#showMovieDetail').toggle("drop");
            });
        }

    };

    /**
     * Hide the research to come back to the movie Library
     */
    this.back = function () {
        $("#moviesFoundView").effect('blind');
        $("#showMovieDetail").effect('blind');
        $("#movieLibrary").show();

    }

});

/**
 * Used to passe data between SearchFormController and FoundMovieDetails
 */
app.service('MovieService', function ($rootScope) {

    var movie = {};

    var addMovie = function (newMovie) {
        console.log(newMovie);
        movie = newMovie;
        $rootScope.$broadcast('newMovie', movie);
    };

    var getMovie = function () {
        console.log("gettting" + movie.toString());
        return movie;
    };

    return {
        addMovie: addMovie,
        getMovie: getMovie
    };
});

/**
 * Used to display more information about a movie
 */
app.controller('FoundMovieDetails', function ($scope, MovieService, indexedDBDatabase) {

    var vm = this;

    $scope.$on('newMovie', function () {
        $scope.movie = MovieService.getMovie();
    });


    /**
     * Update a Movie
     * @param movie
     */
    $scope.updateMovie = function (movie) {
        console.log("FoundMovieDetails: update");
        indexedDBDatabase.updateMovie($scope.movie);
        console.log("Update OK");
        //Send a signal to the movieController to do a refresh
        $scope.$broadcast('movieUpdated', $scope.movie);

    };


});

/**
 * Create all the CRUD functions to deal with the IndexedDB database
 */
app.factory('indexedDBDatabase', function ($window, $q) {
    var indexedDB = $window.indexedDB;
    var db = null;

    //Try to open the database
    var open = function () {
        var deferred = $q.defer();
        var version = 1;
        var request = indexedDB.open("movieLibrary", version);

        //If the Database doesn't contain our store, we create it
        request.onupgradeneeded = function (e) {
            console.log('Updating database');
            db = e.target.result;
            e.target.transaction.onerror = indexedDB.onerror;

            if (!db.objectStoreNames.contains("Movies")) {
                var store = db.createObjectStore("Movies", {keyPath: "id"});
            }
        };

        request.onsuccess = function (e) {
            console.log('Success to open the Database');
            db = e.target.result;
            deferred.resolve();
        };
        request.onerror = function () {
            console.log('Fail to open the Database');
            deferred.reject();
        };

        return deferred.promise;
    };

    /**
     * Return all the element from the database
     * @returns {Promise}
     */
    var getMovies = function () {
        var deferred = $q.defer();

        if (db == null) {
            deferred.reject("IndexDB is not opened yet");
        }
        else {
            //Instantiate the connection to the DB
            var transaction = db.transaction(["Movies"], "readwrite");
            var store = transaction.objectStore("Movies");
            var movies = [];

            // Get everything in the store;
            var cursorRequest = store.openCursor();
            cursorRequest.onsuccess = function (e) {
                var cursor = e.target.result;

                //This will be accessed when we will have gone all over the DB
                if (cursor === null || cursor === undefined) {
                    deferred.resolve(movies);
                } else {
                    // We push all the elements we find
                    movies.push(cursor.value);
                    cursor.continue();
                }
            };

            cursorRequest.onerror = function (e) {
                console.log(e.value);
                deferred.reject("Something bad happened");
            };
        }
        return deferred.promise;
    };

    /**
     * Update a an exisiting movie
     * @param movie the movie to Update
     * @returns {Promise}
     */
    var updateMovie = function (movie) {
        var deferred = $q.defer();

        if (db == null) {
            deferred.reject("IndexDB is not opened yet");
        }
        else {
            //Instantiate the connection with the DB
            var transaction = db.transaction(["Movies"], "readwrite");
            var store = transaction.objectStore("Movies");
            var cursorRequest = store.openCursor();

            cursorRequest.onsuccess = function (e) {
                var cursor = e.target.result;
                //If the cursor is not null or undefined
                if (cursor) {
                    //We want to find the movie to update in the DB via its id
                    if (cursor.value.id == movie.id) {
                        console.log("update movie with id:" + cursor.value.id);
                        //We create an object with the existing one
                        var updatedMovie = cursor.value;
                        //We just want to update the personal rate property
                        updatedMovie.personalRate = movie.personalRate;
                        //We ask for an update
                        var request = cursor.update(updatedMovie);

                        request.onerror = function (e) {
                            console.log(e.value);
                            deferred.reject("Something bad happened");
                        };

                        request.onsuccess = function () {
                            console.log("Update succeeded");
                            deferred.resolve();
                        }
                    }
                    //Make the cursor go at the next element
                    cursor.continue();
                }
            };

            console.log("Movie Updated");
        }
        return deferred.promise;
    };

    /**
     * Add a movie to the DB
     * @param movie the movie to add
     * @returns {Promise}
     */
    var addMovie = function (movie) {
        var deferred = $q.defer();

        if (db === null) {
            deferred.reject("IndexDB is not opened yet!");
        }
        else {
            //Initiate the connection
            var transaction = db.transaction(["Movies"], "readwrite");
            var store = transaction.objectStore("Movies");
            //Here we add all the property we want to
            var request = store.add({
                "id": movie.id,
                "poster": movie.poster,
                "title": movie.title,
                "original_title": movie.original_title,
                "director": movie.director,
                "production_year": movie.production_year,
                "notes": parseFloat(movie.notes.mean),
                //By default the movie added is not seen and don't have a personal rate
                "personalRate": 0,
                "synopsis": movie.synopsis
            });

            request.onerror = function (e) {
                console.log(e.value);
                deferred.reject("The movie has not been added");
            };
            console.log("Movie added !");
        }

        return deferred.promise;
    };

    /**
     * Delete a movie find via its id
     * @param idMovie he id of the movie to delete
     * @returns {Promise}
     */
    var deleteMovie = function (idMovie) {
        var deferred = $q.defer();

        if (db === null) {
            deferred.reject("IndexDB in not opened...");
        }
        else {
            //initiate the connecion
            var transaction = db.transaction(["Movies"], "readwrite");
            var store = transaction.objectStore("Movies");
            //ask for deleting the object
            var request = store.delete(idMovie);

            request.onsuccess = function (e) {
                deferred.resolve();
            };

            request.onerror = function (e) {
                console.log(e.value);
                deferred.reject("Movie has not been delete");
            };

            return deferred.promise;
        }
    };
    //We return all the functions we just made
    return {
        open: open,
        getMovies: getMovies,
        addMovie: addMovie,
        deleteMovie: deleteMovie,
        updateMovie: updateMovie
    };
});


