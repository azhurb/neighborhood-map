function resize() {
    if ($(window).width() < 930) {
        $('.container').addClass('minimized-sidebar');
    } else {
        $('.container').removeClass('minimized-sidebar');
    }
}

$(document).ready( function() {
    $(window).resize(resize);
    resize();
});

function initMap() {
    var target = {
        lat: 37.7797773,
        lng: -122.4356223
    }

    googleMap = new google.maps.Map(document.getElementById('map'), {
        center: target,
        zoom: 13
    });

    var request = {
        location: target,
        radius: 2500,
        type: 'restaurant',
        openNow: true,
        rankBy: google.maps.places.RankBy.PROMINENCE
    };

    var service = new google.maps.places.PlacesService(googleMap);

    service.nearbySearch({
        location: target,
        radius: 2500,
        type: 'restaurant',
        openNow: true,
        rankBy: google.maps.places.RankBy.PROMINENCE
    }, function(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            locationList = results;
        }

        ko.applyBindings(new ViewModel(googleMap, locationList.slice(0, 10) || []));
    });
}

function mapsErrorHandler(error) {
    $('#map').text('Google MAP not available.');
}

// Google Maps Auth error handler.
function gm_authFailure() {
    $('#map').text('Google MAP auth error.');
}

var ViewModel = function(map, locationList) {

    var self = this;

    self.$container = $('.container');
    self.googleMap = map;
    self.allPlaces = [];
    self.largeInfowindow = new google.maps.InfoWindow();

    locationList.forEach(function(place) {
        self.allPlaces.push(new Place(place));
    });

    self.allPlaces.forEach(function(place) {

        var markerOptions = {
            map: self.googleMap,
            position: place.latLng,
            title: place.name,
            animation: google.maps.Animation.DROP,
        };

        place.marker = new google.maps.Marker(markerOptions);

        place.marker.addListener('click', function() {
            self.animateMarker(this);
            self.populateInfoWindow(this, self.largeInfowindow);
        });
    });

    self.visiblePlaces = ko.observableArray();

    self.allPlaces.forEach(function(place) {
        self.visiblePlaces.push(place);
    });

    self.userInput = ko.observable('');

    // Filter places according to the user input.
    self.filterMarkers = function() {
        var searchInput = self.userInput().toLowerCase();

        self.visiblePlaces.removeAll();

        self.allPlaces.forEach(function(place) {
            place.marker.setVisible(false);

            if (place.name.toLowerCase().indexOf(searchInput) !== -1) {
                self.visiblePlaces.push(place);
            }
        });

        self.visiblePlaces().forEach(function(place) {
            place.marker.setVisible(true);
        });
    };

    self.toggleSidebar = function() {
        self.$container.toggleClass('minimized-sidebar');
    };

    self.populateInfoWindow = function(marker, infowindow) {
        if (infowindow.marker != marker) {

            infowindow.marker = marker;

            infowindow.setContent('');
            infowindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });

            // Load place information using Foursquare API.
            $.getJSON('https://api.foursquare.com/v2/venues/search' +
                '?ll=' + marker.position.lat() + ',' + marker.position.lng() +
                '&client_id=420V5ZMGHIA3ZIW1SF1SP523YIDPSIY24CFV35Y1ET1QQOST' +
                '&client_secret=UZ44OJ125ZUZRJQH04TILLCXTNOM54WFTGAF3NERXKGQSBKF' +
                '&query=' + encodeURIComponent(marker.title) +
                '&v=' + (new Date().toISOString().slice(0, 10).replace(/-/g, "")),
                function(result) {
                    var info = result && result.response &&
                        result.response.venues &&
                        result.response.venues.length > 0 ? result.response.venues[0] : null;

                    if (!info) {
                        infowindow.setContent('<div><strong>' + marker.title + '</strong></div>' +
                            '<div>No Foursquare Info Found</div>');
                    }

                    var desc = '<div><strong>' + marker.title + '</strong></div>';

                    if (info.contact.formattedPhone) {
                        desc += '<div>phone: ' + info.contact.formattedPhone + '</div>';
                    }

                    if (info.contact.twitter) {
                        desc += '<div>twitter: <a href="https://twitter/' + info.contact.twitter + '">@' + info.contact.twitter + '</a></div>';
                    }

                    if (info.menu) {
                        desc += '<div><a target="_blank" href="' + info.menu.url + '">' + info.menu.anchor + '</a></div>';
                    }

                    if (info.url) {
                        desc += '<div><a target="_blank" href="' + info.url + '">' + info.url + '</a></div>';
                    }

                    // Load place photos using Foursquare API.
                    $.getJSON('https://api.foursquare.com/v2/venues/' + info.id + '/photos' +
                        '?client_id=420V5ZMGHIA3ZIW1SF1SP523YIDPSIY24CFV35Y1ET1QQOST' +
                        '&client_secret=UZ44OJ125ZUZRJQH04TILLCXTNOM54WFTGAF3NERXKGQSBKF' +
                        '&v=' + (new Date().toISOString().slice(0, 10).replace(/-/g, "")),
                        function(result) {
                            var photos = result && result.response && result.response.photos && result.response.photos.items || [];

                            if (photos.length > 0) {
                                desc += '<div class="place-img"><img src="' + photos[0].prefix + '200x150' + photos[0].suffix + '"/></div>';
                            }

                            infowindow.setContent(desc);
                        }).fail(function() {
                            infowindow.setContent('<div><strong>' + marker.title + '</strong></div>' +
                                '<div>No Foursquare Info Found</div>');
                        });
                }
            ).fail(function() {
                infowindow.setContent('<div><strong>' + marker.title + '</strong></div>' +
                    '<div>No Foursquare Info Found</div>');
            });
        }
    };

    self.showPlaceInfo = function(place) {
        self.animateMarker(place.marker);
        self.populateInfoWindow(place.marker, self.largeInfowindow);
    };

    self.animateMarker = function(marker) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            window.setTimeout(function() {
                marker.setAnimation(null);
            }, 1400);
        }
    };

    function Place(dataObj) {
        this.name = dataObj.name;
        this.latLng = dataObj.geometry.location;
        this.marker = null;
        this.icon = dataObj.icon;
    }
};

// On change key handler.
ko.bindingHandlers.enterkey = {
    init: function(element, valueAccessor, allBindings, viewModel) {
        var callback = valueAccessor();
        $(element).on('change paste keyup', function(event) {
            callback.call(viewModel);
            return true;
        });
    }
};
