/**
 * Utility function to calculate overall score and (optionally) update
 * the scorecard.
 *
 * @param  boolean update   If true, this will update the value displayed
 *                          for overall score.
 * @return number           The total score of all checked items.
 */
var calculate = (function($) { return function(update) {

	// Calculate the sum of all checked items
	var score = 0;
	$(':checkbox:checked').each(function(i, checkbox) {
		// Need to default to zero for non-numeric and null values
		score += Number($(checkbox).data('score')) || 0;
	});

	// Optionally update the visual progress of the scorecard
	if (update) {
		progress(score);
	}

	return score;
}})(jQuery);

/**
 * Utility function that shows a modal configuration form.
 *
 * @param  object      The item to configure (label element).
 */
var configure = (function($) { return function(item, data) {
	if ( data ) {
		// Set the data on the new item and hide the form
		item.attr('title', data.description);
		item.find('.title').html(data.title);
		item.find(':checkbox').attr('data-score', data.score).data('score', data.score);

		// "Close" the form modal
		$('#overlay').fadeOut();
		$('#configure-form').fadeOut();

		// Update the overall total, since this item's score may have changed
		calculate(true);

		// Remove the current item
		$('#configure-form').data('current-item', null);
	} else {
		// No data was passed in, so display the form modal
		$('#overlay').fadeIn();
		$('#configure-form').fadeIn();

		// Prefill the form with the title and score values
		$('#configure-form input[name=title]').val(item.find('> .title').text());
		$('#configure-form textarea[name=description]').val(item.attr('title') || "");
		$('#configure-form input[name=score]').val(item.find('> :checkbox').data('score'));
	}
}})(jQuery);

/**
 * Utility function that visually represents pass / fail
 */
var progress = (function($) { return function(score) {
	score = typeof score == "undefined" ? calculate() : score;

	var overall = 0;
	$('fieldset > ul > li').each(function(i, li) {
		// Add the first score value in a regular list
		$(li).find('ul:not(.multiselect) li:first-child [data-score]').each(function(i, input) {
			overall += Number($(input).data('score') || 0)
		});

		// Add all score values in multiselect
		$(li).find('ul.multiselect [data-score]').each(function(i, input) {
			overall += Number($(input).data('score')) || 0;
		});

		// Add any scores for this top-level item
		$(li).find('> label [data-score]').each(function(i, input) {
			overall += Number($(input).data('score')) || 0;
		});
	});

	// A weighted score (percentage of overall)
	var weight = 100.00 * (score / overall);

	// Update the overall score in the DOM
	$('#score .value').html(score);
	$('#score .overall').html(overall);

	// Move the progress bar
	$('#score .progress').css({'width': weight + '%'});

	// Excellent score = green
	if ( weight >= 90 ) {
		$('body').addClass('excellent');
		$('#score .value').css({color: '#080'}).attr('title', 'Excellent!');
		$('#score .progress').css({'border-color': '#080'});
	// Passing score = blue
	} else if ( weight < 90 && weight >= 80 ) {
		$('body').removeClass('excellent');
		$('#score .value').css({color: '#06c'}).attr('title', 'Good.');
		$('#score .progress').css({'border-color': '#06c'});
	// Danger score = yellow
	} else if ( weight < 80 && weight >= 60 ) {
		$('body').removeClass('excellent');
		$('#score .value').css({color: '#fc0'}).attr('title', 'Danger.');
		$('#score .progress').css({'border-color': '#fc0'});
	// Failure score = red
	} else if ( weight < 60 ) {
		$('body').removeClass('excellent');
		$('#score .value').css({color: '#c00'}).attr('title', 'Failure!');
		$('#score .progress').css({'border-color': '#c00'});
	}

}})(jQuery);

/**
 * Onload handler.
 */
jQuery(function($){
	// Insert scorecard based on JSON
	$('#scorecard').html(Handlebars.compile($('#scorecard-template').html())(context));

	// Initial calculation
	calculate(true);

	// When any checkbox is changed, recalculate the form
	$(':checkbox', $('#scorecard')).change(function() {
		calculate(true);
	});

	// When hovering over a row, display configuration button
	$('ul li label', $('#scorecard')).hover(function() {
		var item = $(this);
		// clearTimeout(item.data('mouseout'));

		if ( item.find('.configure').length == 0 ) {
			item.append('<span class="configure" title="configure">&#9881</span>');
		}
	}, function() {
		var item = $(this);

		$('.configure', item).remove();
		// item.data('mouseout', setTimeout(function(){ $('.configure', item).remove(); }, 200));
	});

	// When clicking the gear next to a row, configure it
	$('#scorecard').on('click', '.configure', function(e) {
		var item = $(e.target).parent();

		// This will display a modal form
		configure(item);

		// Track the current item
		$('#configure-form').data('current-item', item);

		return false;
	});

	// When clicking 'Save' button in the configure form, update the item
	$('#configure-form').on('click', '.save', function(e) {
		// Convert form values to a Javascript object
		var data = {};
		$.each($('#configure-form').serializeArray(), function() {
			data[this.name] = this.value;
		});

		// Retrieve the current item
		var item = $('#configure-form').data('current-item');

		// This will save the form data to the item, and recalculate the score
		configure(item, data);
	});
	$('#configure-form').keypress( function(e) {
		// Enter key is pressed
		if (e.keyCode == 13) { $('#configure-form .save').click(); }
	});

	// Cancel modal window when clicking on overlay or pressing ESC
	$('body').on('click', '#overlay, #configure-form .cancel', function(e) {
		$('#overlay').fadeOut();
		$('#configure-form').fadeOut();
	});
	$('body').keypress(function(e) {
		// Esc key is pressed
		if (e.keyCode == 27) { $('#configure-form .cancel').click(); }
	});

	// When a first-level item is checked...
	$('fieldset > ul > li > label > :checkbox', $('#scorecard')).change(function() {
		if ( $(this).is(':checked') ) {
			// If it is now checked, make sure the first child is checked
			$(this).closest('li').find('ul :checkbox').first().prop('checked', true);
		} else {
			// If it is unchecked, uncheck all child items
			$(this).closest('li').find(':checkbox').prop('checked', false);
		}

		// Need to recalculate overall score
		calculate(true);
	});

	// When a second-level item is checked...
	$('li li :checkbox', $('#scorecard')).change(function() {
		// The changed checkbox
		var item = $(this);
		// The parent item's checkbox
		var parentItem = item.closest('ul').prev('label').find(':checkbox');

		if ( item.is(':checked') ) {
			// We just checked a second-level item, so make sure the first-level (parent)
			// is also checked
			parentItem.prop('checked', true);

			if ( ! item.closest('ul').is('.multiselect') ) {
				// If this item is grouped with its siblings, uncheck other siblings
				item.closest('li').siblings().find(':checkbox').prop('checked', false);
			}
		} else if ( item.closest('ul').find(':checkbox:checked').length == 0 ) {
			// There are no other checked items in this level, so uncheck the parent item
			parentItem.prop('checked', false);
		}

		// Need to recalculate overall score
		calculate(true);
	});
})
