
// https://kopepasah.com/tutorial/awesome-overlays-with-simple-css-javascript-html/
var show_popup = function () {
    var overlay = 'overlay-1'
    var id = '#' + overlay
    $(id).addClass('overlay-open');
    $('body').addClass('overlay-view');

    /**
     * When the overlay outer wrapper or `overlay-close`
     * trigger is clicked, let's remove the classes from
     * the current overlay and body. Removal of these
     * classes restores the current state of the user
     * experience. Again, all handled by CSS (awesome).
     */
    $('#btn-close-one, #btn-close-all').on('click', function(e) {
        // Verify that only the outer wrapper was clicked.
        $(id).removeClass('overlay-open');
        $('body').removeClass('overlay-view');
    });

    /**
     * Closes the overlay when the esc key is pressed. See
     * comment above on closing the overlay for more info
     * on how this is accomplished.
     */
    $(document).keyup(function(e) {
        // Verify that the esc key was pressed.
        if (E.keyCode == 27) {
            $(id).removeClass('overlay-open');
            $('body').removeClass('overlay-view');
        }
    });
}