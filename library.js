'use strict';

var async = module.parent.require('async');
var nconf = module.parent.require('nconf');

var user = module.parent.require('./src/user');

var app;

var Widget = module.exports;

Widget.init = function (params, callback) {
	app = params.app;

	callback();
};

Widget.renderWidget = function (widget, callback) {
	var count = Math.max(1, widget.data.numUsers || 10);
	var field = widget.data.field || 'reputation';

	async.waterfall([
		function (next) {
			user.getUidsFromSet('users:' + field, 0, count - 1, next);
		},
		function (uids, next) {
			user.getUsersFields(uids, ['uid', 'username', 'userslug', field], next);
		},
		function (userData, next) {
			userData.forEach(function (user, index) {
				user.field = user[field];
				user.index = index + 1;
			});
			return next(null, userData);
		},
		function (userData, next) {
			widget.req.app.render('widgets/userranking', {
				users: userData,
				relative_path: nconf.get('relative_path'),
			}, next);
		},
		function (html, next) {
			widget.html = html;
			next(null, widget);
		},
	], callback);
};

Widget.defineWidgets = function (widgets, callback) {
	async.waterfall([
		function (next) {
			app.render('admin/userranking', {}, next);
		},
		function (html, next) {
			widgets.push({
				widget: 'userranking',
				name: 'Users Ranking',
				description: 'List of user ranking',
				content: html,
			});
			next(null, widgets);
		},
	], callback);
};
