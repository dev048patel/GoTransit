if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("/mobile/serviceWorker.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

var dontshowtwice = 0;

//Newer stuff to detect iOS
const iOS_1to12 = /iPad|iPhone|iPod/.test(navigator.platform);

//console.log(iOS_1to12);

const iOS13_iPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const iOS1to12quirk = function () {
    var audio = new Audio(); // temporary Audio object
    audio.volume = 0.5; // has no effect on iOS <= 12
    return audio.volume === 1;
};

const isIos = !window.MSStream && (iOS_1to12 || iOS13_iPad || iOS1to12quirk());

const iPad_1to12 = /iPad/.test(navigator.platform);

const isIpad = !window.MSStream && (iPad_1to12 || iOS13_iPad);

// Detects if device is in standalone mode
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

const isSamsungBrowser = navigator.userAgent.match(/SamsungBrowser/i)

const isAndroid = /Android/.test(navigator.userAgent);

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

if (isIos && isInStandaloneMode()) {
    $(document).ready(function () {
        setTimeout(function () {
            $('.theIthingFooter').css('display', 'block');
        }, 500)
    });

    $(".homeId").click(function () {
        window.location.href = 'https://transitlive.com';
    });

    $(".gobackId").click(function () {
        window.history.back();
        //                $(".theFooter").css("display", "none");                                                                                   

    });

    $(".goforwardId").click(function () {
        window.history.forward();
    });

}
//since Regina's opening menu takes up
//most of the screen on iPhone 5 and previous
//we won't bother with those phones for PWA
//as they are old phones anyway
//any iOS previous to 13 we'll simply disregard
var agent = window.navigator.userAgent,
    start = agent.indexOf('OS ');
theOSnum = window.Number(agent.substr(start + 3, 3).replace('_', '.'));
//console.log("Just before check");
if (!getCookie('displayedPWApopup')) {
    // Checks if should display install popup notification:
    //CriOS is chrome on iOS
    //console.log("Past the cookie");
    if (isIos && !isInStandaloneMode() && !navigator.userAgent.match('CriOS')) {
        //this.setState({ showInstallMessage: true });
        //console.log("Is an IOS device");
        //alert("I am an alert box!");                   
        if (isIpad) {
            $(document).ready(function () {
                // SetTimeout function
                // Will execute the function
                // after 3 sec
                setTimeout(function () {
                    $('.POPtop').css('display', 'block');
                }, 3000)
            });

            $('.POPtop').click(function () {
                $('.POPtop').css('display', 'none');
            });

        } else {
            //don't bother with old iphones - iOS 12 or less
            if (theOSnum > 12) {
                $(document).ready(function () {
                    setTimeout(function () {
                        $('.POPmain').css('display', 'block');
                    }, 3000)
                });

                $('.POPmain').click(function () {
                    $('.POPmain').css('display', 'none');
                });

            }
        }

    } else {
        //console.log("NOT an IOS device");

        if (!isInStandaloneMode()) {


            if (isSamsungBrowser) {
                $(document).ready(function () {
                    setTimeout(function () {
                        $('.POPtopSamsung').css('display', 'block');
                    }, 3000)
                });

                $('.POPtopSamsung').click(function () {
                    $('.POPtopSamsung').css('display', 'none');
                });
            }

            if (isAndroid) {
                if (is_chrome) {
                    if (!isSamsungBrowser) {
                        let deferredPrompt;
                        window.addEventListener('beforeinstallprompt', (e) => {
                            // Prevent the mini-infobar from appearing on mobile
                            e.preventDefault();
                            // Stash the event so it can be triggered later.
                            deferredPrompt = e;
                            // Update UI notify the user they can install the PWA
                            //showInstallPromotion();
                            if (dontshowtwice == 0) {
                                $(document).ready(function () {
                                    setTimeout(function () {
                                        $('.POPChrome').css('display', 'block');
                                    }, 3000)
                                });
                                dontshowtwice += 1;
                                $(".cancelId").click(function () {
                                    $(".POPChrome").css("display", "none");
                                });
                                $(".submitId").click(function () {
                                    $(".POPChrome").css("display", "none");
                                    // Show the install prompt
                                    deferredPrompt.prompt();
                                    // Wait for the user to respond to the prompt
                                    deferredPrompt.userChoice.then((choiceResult) => {
                                        if (choiceResult.outcome === 'accepted') {
                                            console.log('User accepted the install prompt');
                                        } else {
                                            console.log('User dismissed the install prompt');
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            }
        }
    }
    setCookie('displayedPWApopup', 'yes', 7);
}

$(".homeHeadId").click(function () {
    window.location.href = 'https://transitlive.com';
});

function setCookie(c_name, value, exdays) {
    var c_value = escape(value);
    if (exdays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        //gonna just add minutes for now
        //exdate.setMinutes(exdate.getMinutes() + exdays);
        c_value += '; expires=' + exdate.toUTCString();
    }
    document.cookie = c_name + '=' + c_value + '; samesite=none; secure';
}

function getCookie(c_name) {
    var i, x, y, cookies = document.cookie.split(';');

    for (i = 0; i < cookies.length; i++) {
        x = cookies[i].substr(0, cookies[i].indexOf('='));
        y = cookies[i].substr(cookies[i].indexOf('=') + 1);
        x = x.replace(/^\s+|\s+$/g, '');

        if (x === c_name) {
            return unescape(y);
        }
    }
}

