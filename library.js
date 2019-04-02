'use strict';

var async = module.parent.require('async');
var nconf = module.parent.require('nconf');
var validator = module.parent.require('validator');
var _ = module.parent.require('lodash');

var db = module.parent.require('./src/database');
var user = module.parent.require('./src/user');
var groups = module.parent.require('./src/groups');

var app;

var Widget = module.exports;

Widget.init = function(params, callback) {
	app = params.app;

	callback();
};

Widget.renderUserRankingWidget = function (widget, callback) {
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
			app.render('widgets/userranking', {
				users: userData,
				relative_path: nconf.get('relative_path')
			}, next);
		},
		function (html, next) {
			widget.html = html;
			next(null, widget);
		}
	], callback);
};

Widget.defineWidgets = function(widgets, callback) {
	async.waterfall([
		function(next) {
			async.map([
				{
					widget: 'userranking',
					name: 'Users Ranking',
					description: 'List of user ranking',
					content: 'admin/userranking'
				}
			], function(widget, next) {
				app.render(widget.content, {}, function(err, html) {
					widget.content = html;
					next(err, widget);
				});
			}, function(err, _widgets) {
				widgets = widgets.concat(_widgets);
				next(err);
			});
		},
		function(next) {
			db.getSortedSetRevRange('groups:visible:createtime', 0, - 1, next);
		},
		function(groupNames, next) {
			groups.getGroupsData(groupNames, next);
		},
		function(groupsData, next) {
			groupsData = groupsData.filter(Boolean);
			groupsData.forEach(function(group) {
				group.name = validator.escape(String(group.name));
			});
			app.render('admin/groupposts', {groups: groupsData}, function(err, html) {
				widgets.push({
					widget: 'groupposts',
					name: 'Group Posts',
					description: 'Posts made my members of a group',
					content: html
				});
				next(err, widgets);
			});
		}
	], callback);
};
