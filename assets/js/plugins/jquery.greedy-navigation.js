/*
* Greedy Navigation
*
* http://codepen.io/lukejacksonn/pen/PwmwWV
*
*/

var $nav = $('#site-nav');
var $btn = $('#site-nav button');
var $vlinks = $('#site-nav .visible-links');
var $hlinks = $('#site-nav .hidden-links');
var $themeToggle = $('#theme-toggle');

var breaks = [];

function vlinksContentWidth() {
  var w = 0;
  $vlinks.children().each(function () {
    w += $(this).outerWidth(true);
  });
  return w;
}

function availableSpace() {
  // visible-links is a flex child that receives remaining space after the
  // in-flow theme toggle and hamburger button.
  return $vlinks.width();
}

function updateNav() {

  var space = availableSpace();

  // The visible list is overflowing the nav
  if (vlinksContentWidth() > space) {

    while (vlinksContentWidth() > availableSpace() && $vlinks.children("*:not(.persist)").length > 0) {
      // Record the width of the list
      breaks.push(vlinksContentWidth());

      // Move item to the hidden list
      $vlinks.children("*:not(.persist)").last().prependTo($hlinks);

      // Show the dropdown btn (changes available space on next measure)
      $btn.removeClass("hidden");
    }

    // The visible list is not overflowing
  } else {

    // There is space for another item in the nav
    while (breaks.length > 0 && availableSpace() > breaks[breaks.length - 1]) {
      // Move the item to the visible list
      $hlinks.children().first().appendTo($vlinks);
      breaks.pop();

      // If more items may fit, keep the btn visible until the loop ends
      if (breaks.length < 1) {
        $btn.addClass('hidden');
      }
    }

    // Hide the dropdown btn if hidden list is empty
    if (breaks.length < 1) {
      $btn.addClass('hidden');
      $btn.removeClass('close');
      $hlinks.addClass('hidden');
    }
  }

  // Keep counter updated
  $btn.attr("count", breaks.length);

  // update masthead height and the body/sidebar top padding
  var mastheadHeight = $('.masthead').height();
  $('body').css('padding-top', mastheadHeight + 'px');
  if ($(".author__urls-wrapper button").is(":visible")) {
    $(".sidebar").css("padding-top", "");
  } else {
    $(".sidebar").css("padding-top", mastheadHeight + "px");
  }

}

// Window listeners

$(window).on('resize', function () {
  updateNav();
});
screen.orientation.addEventListener("change", function () {
  updateNav();
});

$btn.on('click', function () {
  $hlinks.toggleClass('hidden');
  $(this).toggleClass('close');
});

updateNav();
