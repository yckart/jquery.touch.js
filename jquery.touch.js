/*!
 * jquery.touch.js 0.0.1 - https://github.com/yckart/jquery.touch.js
 * A lightweight mobile-ready touchslider.
 *
 * Copyright (c) 2013 Yannick Albert (http://yckart.com)
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php).
 * 2013/02/09
*/
(function ($, window) {
    if(window.jQuery) $.event.props.push("touches");
    function bezier_for_velocity(v) {
        var importance = 0.5,
            x = (v < 0 ? -1 : 1) * Math.sqrt(importance * importance * (v * v / (1 + v * v))),
            t = x / v,
            sameness = t;

        return 'cubic-bezier(' + [t, x, sameness, 1.0].join(", ") + ')';
    }

    $.fn.touchSlider = function () {
        var x, t,
            initial_x, initial_offset,
            previous_x, previous_t,
            current_offset = 0,
            $this = this,
            slides = this.find(".slides"),
            animation = {},
            default_duration = 500,
            slide_width = this.width(),
            last_slide = this.find(".slide").length - 1,
            left_edge = 0,
            right_edge = slide_width * last_slide;

        this.css({
            overflow: 'hidden'
        });
        slides.css({
            'width': (slide_width * this.find(".slide").length) + 'px',
            '-webkit-transition-property': '-webkit-transform',
            '-webkit-transform': 'translate3D(0, 0, 0)'
        });
        // Force slides into texture buffers on the iPad
        slides.find(".slide").css({
            '-webkit-transform': 'translate3D(0, 0, 0)'
        });

        this.bind('touchstart', function (e) {

            if (e.touches.length !== 1) {
                return;
            }

            // Ensure that if the user stops the animation half way through, our internal
            // state is correct.
            // getComputedStyle seems to always return the result in the form: matrix(0, 0, 0, 0, X, 0)
            current_offset = 0 - Number(window.getComputedStyle(slides[0])['-webkit-transform'].split(", ")[4]);

            slides.css({
                // Remove the delay on animation for instant finger feedback
                '-webkit-transition-duration': '0s',
                '-webkit-transform': 'translate3D(' + (0 - current_offset) + 'px, 0, 0)'
            });

            initial_offset = current_offset;
            initial_x = previous_x = x = e.touches[0].clientX;
            previous_t = t = +new Date();

        }).on('touchmove', function (e) {

            // Allow the user to zoom when they're touching the container by not
            // preventing default if there's more than one finger.
            if (e.touches.length !== 1) {
                return;
            } else {
                e.preventDefault();
            }

            previous_x = x;
            previous_t = t;
            x = e.touches[0].clientX;
            t = +new Date();

            current_offset = initial_offset + (initial_x - x);

            // iOS-like halved velocity when dragging beyond the edge
            if (current_offset < left_edge) {
                current_offset = current_offset / 2;
            } else if (current_offset > right_edge) {
                current_offset = right_edge + (current_offset - right_edge) / 2;
            }

            slides.css({
                '-webkit-transform': 'translate3D(' + (0 - current_offset) + 'px, 0, 0)'
            });

        }).on('touchend', function (e) {
            var velocity;

            var final_destination = current_offset;

            // Move up to half an extra slide in the direction of current motion.
            // TODO: this will feel much nicer once we have bouncing.
            if (Math.abs(t - previous_t) > 1) {
                final_destination += Math.min(slide_width / 2,
                                       Math.max(-slide_width / 2,
                                         default_duration * (previous_x - x) / (t - previous_t)
                                       )
                                     );
            }

            var target_slide = Math.round(final_destination / slide_width);

            if (target_slide < 0) {
                target_slide = 0;
            } else if (target_slide > last_slide) {
                target_slide = last_slide;
            }

            var target_distance = current_offset - target_slide * slide_width;

            // avoid division by zero
            if (Math.abs(x - previous_x) < 1 || Math.abs(t - previous_t) < 1) {
                velocity = 0.1;
            } else {
                velocity = ((x - previous_x) / (t - previous_t)) * (default_duration / target_distance);
            }

            $this.trigger('slideTo', {slide: target_slide, bezier: bezier_for_velocity(velocity)});

        }).on('slideTo', function (e, opts) {
            var target_offset = opts.slide * slide_width;

            animation = {
                slide: opts.slide,
                // webkit doesn't perform the transition if the duration is 0 and the slider is offscreen
                duration: Math.max(typeof opts.duration === 'undefined' ? default_duration : opts.duration, 1),
                bezier: opts.bezier || bezier_for_velocity(0.1)
            };

            slides.css({
                '-webkit-transition-timing-function': animation.bezier,
                '-webkit-transition-duration': animation.duration + 'ms',
                '-webkit-transform': 'translate3D(' + (0 - target_offset) + 'px, 0, 0)'
            });

            $this.trigger('beforeSlide', animation);
            animation.timeout = window.setTimeout(function () {
                $this.trigger('afterSlide', animation);
            }, animation.duration);

        });
        return this;
    };
}(window.jQuery || window.Zepto, window));