/**
 * init.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
var mollifyDefaults = {
	"language": {
		"default": "en",
		"options": ["en"]	
	},
	"view-url" : false,
	"app-element-id" : "mollify",
	"service-path": "backend/",
	"limited-http-methods" : false,
	"list-view-columns": {
		"name": { width: 250 },
		"size": {},
		"file-modified": { width: 150 }
	},
	"html5-uploader": {
		maxChunkSize: 0
	},
	dnd : {
		dragimages : {
			"filesystemitem-file" : "css/images/mimetypes64/empty.png",
			"filesystemitem-folder" : "css/images/mimetypes64/folder.png",
			"filesystemitem-many" : "css/images/mimetypes64/application_x_cpio.png"
		}
	}
};

!function($) {

	"use strict"; // jshint ;_;
	
	var mollify = {
		App : {},
		view : {},
		ui : {},
		events : {},
		service : {},
		filesystem : {},
		plugins : {},
		features : {},
		dom : {},
		templates : {}
	};
	
	mollify._time = new Date().getTime();
	mollify._hiddenInd = 0;
	mollify.settings = false;
	mollify.session = false;
		
	/* APP */

	mollify.App.init = function(s, p) {
		window.Modernizr.testProp("touch");
		
		mollify.App._initialized = false;
		mollify.App._views = {};
		mollify.App.pageUrl = mollify.request.getBaseUrl(window.location.href);
		mollify.App.pageParams = mollify.request.getParams(window.location.href);
		mollify.App.mobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
		
		mollify.plugins.register(new mollify.plugin.Core());
		if (p) {
			for (var i=0, j=p.length; i < j; i++)
				mollify.plugins.register(p[i]);
		}
		
		mollify.settings = $.extend({}, mollifyDefaults, s);
		mollify.service.init(mollify.settings["limited-http-methods"]);
		
		var start = function() {
			mollify.service.get("session/info/3").fail(function() {
				new mollify.ui.FullErrorView('Failed to initialize Mollify').show();
			}).done(function(s) {
				mollify.events.dispatch('session/start', s);
			});
		};
		mollify.events.addEventHandler(function(e) {
			if (e.type == 'session/start') {
				mollify.App._onSessionStart(e.payload);
			} else if (e.type == 'session/end') {
				mollify.session = false;
				mollify.filesystem.init([]);
				start();
			}
		});
		
		if (mollify.settings["view-url"])
			window.onpopstate = function(event) {
				mollify.App.onRestoreState(document.location.href, event.state);
			};

		start();
	};
	
	mollify.App.getElement = function() { return $("#"+mollify.settings["app-element-id"]); };
	
	mollify.App._onSessionStart = function(s) {
		mollify.session = s;
		mollify.session.id = mollify.session.session_id;
		mollify.session.admin = (mollify.session.default_permission == 'A');
		
		mollify.filesystem.init(mollify.session.folders);
		
		var onError = function() {
			new mollify.ui.FullErrorView('Failed to initialize Mollify').show();
		}
		
		if (!mollify.App._initialized)
			mollify.ui.initialize().done(function() {
				mollify.plugins.initialize().done(function() {
					mollify.App._initialized = true;
					mollify.App._start();
				}).fail(onError);
			}).fail(onError);
		else {
			mollify.ui.initializeLang().done(mollify.App._start).fail(onError);
		}
	};
	
	mollify.App._start = function() {
		mollify.App.activeView = false;
		mollify.App.activeViewId = null;
		
		var id = false;
		if (mollify.App.pageParams.v && mollify.App.pageParams.v.length > 0)
			id = mollify.App.pageParams.v.split("/");
		mollify.App._activateView(id);
	};
	
	mollify.App._activateView = function(id) {
		var onView = function(v) {
			if (v) {
				mollify.App.activeView = v;
				mollify.App.activeViewId = id[0];
			} else {
				if (!mollify.session || !mollify.session.authenticated) {
					mollify.App.activeView = new mollify.view.LoginView();
					mollify.App.activeViewId = "login";
				} else {
					mollify.App.activeView = new mollify.view.MainView();
					mollify.App.activeViewId = "main";
				}
			}
			
			mollify.App.activeView.init(mollify.App.getElement(), id);
		};
		
		if (id) {
			var custom = !!mollify.App._views[id[0]];
			var isActiveView = (custom && mollify.App.activeViewId == id[0]) || (!custom && mollify.App.activeViewId == "main");
			
			if (isActiveView) mollify.App.activeView.onRestoreView(id);
			else mollify.App._getView(id, onView);
		} else onView();
	};
	
	mollify.App._getView = function(id, cb) {
		var h = mollify.App._views[id[0]];
		if (h && h.getView) {
			var view = h.getView(id, mollify.App.pageParams);
			if (view && view.done) view.done(cb);
			else cb(view);
		} else cb(false);
	};
	
	mollify.App.onRestoreState = function(url, o) {
		if (!mollify.settings["view-url"]) return;
		
		// if no view active, app is not loaded -> don't restore
		if (!mollify.App.activeView) return;
		
		if (!mollify.session.user_id || mollify.session.user_id != o.user_id) return;
		
		//baseUrl = mollify.request.getBaseUrl(url);
		var params = mollify.request.getParams(url);
		if (!params.v || params.v.length < 1) return;
		
		var id = params.v.split("/");
		mollify.App._activateView(id);
	};
	
	mollify.App.storeView = function(viewId) {
		if (!mollify.settings["view-url"]) return;
		var obj = {
			user_id : mollify.session.user_id
		};
		if (window.history) window.history.pushState(obj, "", "?v="+viewId);	
	};
	
	mollify.App.registerView = function(id, h) {
		mollify.App._views[id] = h;
	};
	
	mollify.App.openPage = function(pageUrl) {
		window.location = mollify.App.getPageUrl(pageUrl);
	};
	
	mollify.App.getPageUrl = function(pageUrl) {
		return mollify.App.pageUrl + "?v="+pageUrl;
	}
	
	mollify.getItemDownloadInfo = function(i) {
		if (!i) return false;
		var single = false;

		if (!window.isArray(i)) single = i;
		else if (i.length === 0) single = i[0];

		if (single && single.is_file) {
			return {
				name: single.name,
				url: mollify.filesystem.getDownloadUrl(single)
			};
		} else {
			if (!single) return false;
			
			if (mollify.plugins.exists("plugin-archiver")) return {
				name: single.name + ".zip",	//TODO get extension from plugin
				url: mollify.plugins.get("plugin-archiver").getDownloadCompressedUrl(i)
			};
		}

		return false;
	};
	
	mollify.resourceUrl = function(u) {
		if (!mollify.settings["resource-map"]) return u;
		
		var urlParts = mollify.helpers.breakUrl(u);
		if (!urlParts) return u;
		
		var mapped = mollify.settings["resource-map"][urlParts.path];
		if (mapped === undefined) return u;
		if (mapped === false) return false;
		
		return mapped + urlParts.paramsString;
	};
	
	/* REQUEST */
	
	mollify.request = {
		getParam: function(name) {
			if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
				return decodeURIComponent(name[1]);
		},
		getParams: function() {
			return mollify.helpers.getUrlParams(location.search);
		},
		getBaseUrl : function(url) {
			var param = url.lastIndexOf('?');
			if (param >= 0) url = url.substring(0, param+1);
			
			var dash = url.lastIndexOf('/');
			return url.substring(0, dash+1);
		}
	}
	
	/* EVENTS */
	var et = mollify.events;
	et._handlers = [];
		
	et.addEventHandler = function(h) {
		et._handlers.push(h);
	};
	
	et.dispatch = function(type, payload) {
		var e = { type: type, payload: payload };
		$.each(et._handlers, function(i, h) {
			h(e);
		});
	};
	
	/* SERVICE */
	var st = mollify.service;
	
	st.init = function(limitedHttpMethods) {
		st._limitedHttpMethods = !!limitedHttpMethods;
	};
	
	st.url = function(u, full) {
		if (u.startsWith('http')) return u;
		var url = mollify.settings["service-path"]+"r.php/"+u;
		if (!full) return url;
		return mollify.App.pageUrl + url;
	};
	
	st.get = function(url, s, err) {
		return st._do("GET", url, null);
	};

	st.post = function(url, data) {
		return st._do("POST", url, data);
	};
	
	st.put = function(url, data) {
		return st._do("PUT", url, data);
	};
	
	st.del = function(url, data) {
		return st._do("DELETE", url, data);
	};
			
	st._do = function(type, url, data) {
		var t = type;
		var diffMethod = (st._limitedHttpMethods && (t == 'PUT' || t == 'DELETE'));
		if (diffMethod) t = 'POST';
		
		return $.ajax({
			type: t,
			url: st.url(url),
			processData: false,
			data: data ? JSON.stringify(data) : null,
			contentType: 'application/json',
			dataType: 'json',
			beforeSend: function(xhr) {
				if (mollify.session && mollify.session.id)
					xhr.setRequestHeader("mollify-session-id", mollify.session.id);
				if (st._limitedHttpMethods || diffMethod)
					xhr.setRequestHeader("mollify-http-method", type);
			}
		}).pipe(function(r) {
			if (!r) {
				return $.Deferred().reject({ code: 999 });
			}
			return r.result;
		}, function(xhr) {
			var error = false;
			var data = false;

			if (xhr.responseText && xhr.responseText.startsWith('{')) error = JSON.parse(xhr.responseText);
			if (!error) error = { code: 999 };	//unknown
			
			var failContext = {
				handled: false
			}
			if (error.code == 100 && mollify.session && mollify.session.authenticated) {
				mollify.events.dispatch('session/end');
				failContext.handled = true;
			}
			var df = $.Deferred();
			// push default handler to end of callback list
			setTimeout(function(){
				df.fail(function(err){
					if (!failContext.handled) mollify.ui.dialogs.showError(err);
				});
			}, 0);
			return df.rejectWith(failContext, [error]);
		}).promise();
	};
	
	/* FILESYSTEM */
	
	var mfs = mollify.filesystem;
	
	mfs.init = function(f) {
		mollify.filesystem.roots = [];
		mollify.filesystem.rootsById = {};
		
		if (f && mollify.session.authenticated) {
			mollify.filesystem.roots = f;
			for (var i=0,j=f.length; i<j; i++)
				mollify.filesystem.rootsById[f[i].id] = f[i];
		}
	};
	
	mfs.getDownloadUrl = function(item) {
		if (!item.is_file) return false;
		var url = mollify.service.url("filesystem/"+item.id, true);
		if (mollify.App.mobile)
			url = url + ((url.indexOf('?') >= 0) ? "&" : "?") + "m=1";
		return url;
	};

	mfs.getUploadUrl = function(folder) {	
		if (!folder || folder.is_file) return null;
		return mollify.service.url("filesystem/"+folder.id+'/files/') + "?format=binary";
	};
	
	mfs.itemDetails = function(item, data) {
		return mollify.service.post("filesystem/"+item.id+"/details/", { data : data });
	};
	
	mfs.folderInfo = function(id, hierarchy, data) {
		return mollify.service.post("filesystem/"+ (id ? id : "roots") + "/info/" + (hierarchy ? "?h=1" : ""), { data : data });
	};

	mfs.findFolder = function(d, data) {
		return mollify.service.post("filesystem/find/", { folder: d, data : data });
	};
		
	mfs.folders = function(parent) {
		if (parent == null) {
			var df = $.Deferred();
			df.resolve(mfs.roots);
			return df.promise();
		}
		return mollify.service.get("filesystem/"+parent.id+"/folders/");
	};
	
	mfs.copy = function(i, to) {
		if (!i) return;
		
		if (window.isArray(i) && i.length > 1) {
			if (!to) {
				var df = $.Deferred();
				mollify.ui.dialogs.folderSelector({
					title: mollify.ui.texts.get('copyMultipleFileDialogTitle'),
					message: mollify.ui.texts.get('copyMultipleFileMessage', [i.length]),
					actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._copyMany(i, f)).then(df.resolve, df.reject); },
						canSelect: function(f) { return mfs.canCopyTo(i, f); }
					}
				});
				return df.promise();
			} else
				return mfs._copyMany(i, to);

			return;	
		}
		
		if (window.isArray(i)) i = i[0];
		
		if (!to) {
			var df2 = $.Deferred();
			mollify.ui.dialogs.folderSelector({
				title: mollify.ui.texts.get('copyFileDialogTitle'),
				message: mollify.ui.texts.get('copyFileMessage', [i.name]),
				actionTitle: mollify.ui.texts.get('copyFileDialogAction'),
				handler: {
					onSelect: function(f) { $.when(mfs._copy(i, f)).then(df2.resolve, df2.reject); },
					canSelect: function(f) { return mfs.canCopyTo(i, f); }
				}
			});
			return df2.promise();
		} else
			return mfs._copy(i, to);
	};
	
	mfs.copyHere = function(item, name) {
		if (!item) return;
		
		if (!name) {
			var df = $.Deferred();
			mollify.ui.dialogs.input({
				title: mollify.ui.texts.get('copyHereDialogTitle'),
				message: mollify.ui.texts.get('copyHereDialogMessage'),
				defaultValue: item.name,
				yesTitle: mollify.ui.texts.get('copyFileDialogAction'),
				noTitle: mollify.ui.texts.get('dialogCancel'),
				handler: {
					isAcceptable: function(n) { return !!n && n.length > 0 && n != item.name; },
					onInput: function(n) { $.when(mfs._copyHere(item, n)).then(df.resolve, df.reject); }
				}
			});
			return df.promise();
		} else {
			return mfs._copyHere(item, name);
		}
	};
	
	mfs.canCopyTo = function(item, to) {
		if (window.isArray(item)) {
			for(var i=0,j=item.length;i<j;i++)
				if (!mfs.canCopyTo(item[i], to)) return false;
			return true;
		}
		
		// cannot copy into file
		if (to.is_file) return false;

		// cannot copy into itself
		if (item.id == to.id) return false;
		
		// cannot copy into same location
		if (item.parent_id == to.id) return false;
		return true;
	};
	
	mfs.canMoveTo = function(item, to) {
		if (window.isArray(item)) {
			for(var i=0,j=item.length;i<j;i++)
				if (!mfs.canMoveTo(item[i], to)) return false;
			return true;
		}
		
		// cannot move into file
		if (to.is_file) return false;

		// cannot move folder into its own subfolder
		if (!to.is_file && item.root_id == to.root_id && to.path.startsWith(item.path)) return false;

		// cannot move into itself
		if (item.id == to.id) return false;
		
		// cannot move into same location
		if (item.parent_id == to.id) return false;
		return true;
	};

	mfs._copyHere = function(i, name) {
		return mollify.service.post("filesystem/"+i.id+"/copy/", {name:name}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: [ i ], name: name });
		});
	};
		
	mfs._copy = function(i, to) {
		return mollify.service.post("filesystem/"+i.id+"/copy/", {folder:to.id}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: [ i ], to: to });
		});
	};
	
	mfs._copyMany = function(i, to) {
		return mollify.service.post("filesystem/items/", {action: 'copy', items: i, to: to}).done(function(r) {
			mollify.events.dispatch('filesystem/copy', { items: i, to: to });
		});
	};
	
	mfs.move = function(i, to) {
		if (!i) return;
		
		if (window.isArray(i) && i.length > 1) {
			if (!to) {
				var df = $.Deferred();
				mollify.ui.dialogs.folderSelector({
					title: mollify.ui.texts.get('moveMultipleFileDialogTitle'),
					message: mollify.ui.texts.get('moveMultipleFileMessage', [i.length]),
					actionTitle: mollify.ui.texts.get('moveFileDialogAction'),
					handler: {
						onSelect: function(f) { $.when(mfs._moveMany(i, f)).then(df.resolve, df.reject); },
						canSelect: function(f) { return mfs.canMoveTo(i, f); }
					}
				});
				return df.promise();
			} else
				return mfs._moveMany(i, to);
		}
		
		if (window.isArray(i)) i = i[0];
		
		if (!to) {
			var df2 = $.Deferred();
			mollify.ui.dialogs.folderSelector({
				title: mollify.ui.texts.get('moveFileDialogTitle'),
				message: mollify.ui.texts.get('moveFileMessage', [i.name]),
				actionTitle: mollify.ui.texts.get('moveFileDialogAction'),
				handler: {
					onSelect: function(f) { $.when(mfs._move(i, f)).then(df2.resolve, df2.reject); },
					canSelect: function(f) { return mfs.canMoveTo(i, f); }
				}
			});
			return df2.promise();
		} else
			return mfs._move(i, to);
	};
	
	mfs._move = function(i, to) {
		return mollify.service.post("filesystem/"+i.id+"/move/", {id:to.id}).done(function(r) {
			mollify.events.dispatch('filesystem/move', { items: [ i ], to: to });
		});
	};

	mfs._moveMany = function(i, to) {
		return mollify.service.post("filesystem/items/", {action: 'move', items: i, to: to}).done(function(r) {
			mollify.events.dispatch('filesystem/move', { items: i, to: to });
		});
	};
	
	mfs.rename = function(item, name) {
		if (!name || name.length === 0) {
			var df = $.Deferred();
			mollify.ui.dialogs.input({
				title: mollify.ui.texts.get(item.is_file ? 'renameDialogTitleFile' : 'renameDialogTitleFolder'),
				message: mollify.ui.texts.get('renameDialogNewName'),
				defaultValue: item.name,
				yesTitle: mollify.ui.texts.get('renameDialogRenameButton'),
				noTitle: mollify.ui.texts.get('dialogCancel'),
				handler: {
					isAcceptable: function(n) { return !!n && n.length > 0 && n != item.name; },
					onInput: function(n) { $.when(mfs._rename(item, n)).then(df.resolve, df.reject); }
				}
			});
			return df.promise();			
		} else {
			return mfs._rename(item, name);
		}
	};
	
	mfs._rename = function(item, name) {
		return mollify.service.put("filesystem/"+item.id+"/name/", {name: name}).done(function(r) {
			mollify.events.dispatch('filesystem/rename', { items: [item], name: name });
		});
	};
	
	mfs._handleDenied = function(action, i, data, msgTitleDenied, msgTitleAccept) {
		var df = $.Deferred();
		var handlers = [];
		var findItem = function(id) {
			if (!window.isArray(data.target)) return data.target;

			for(var i=0,j=data.target.length;i<j;i++) {
				if (data.target[i].id == id) return data.target[i];
			}
			return null;
		};
		for(var k in data.items) {
			var plugin = mollify.plugins.get(k);
			if (!plugin || !plugin.actionValidationHandler) return false;
			
			var handler = plugin.actionValidationHandler();
			handlers.push(handler);

			var items = data.items[k];
			for(var m=0,l=items.length;m<l;m++) {
				var item = items[m];
				item.item = findItem(item.item);
			}
		}

		var validationMessages = [];
		var nonAcceptable = [];
		var acceptKeys = [];
		var allAcceptable = true;
		for(var ind=0,j=handlers.length; ind<j; ind++) {
			var msg = handlers[ind].getValidationMessages(action, data.items[k], data);
			for(var mi = 0, mj= msg.length; mi<mj; mi++) {
				var ms = msg[mi];
				acceptKeys.push(ms.acceptKey);
				validationMessages.push(ms.message);
				if (!ms.acceptable) nonAcceptable.push(ms.message);
			}
		}		
		if (nonAcceptable.length === 0) {
			// retry with accept keys
			mollify.ui.dialogs.confirmActionAccept(msgTitleAccept, validationMessages, function() {
				df.resolve(acceptKeys);
			}, df.reject);
		} else {
			mollify.ui.dialogs.showActionDeniedMessage(msgTitleDenied, nonAcceptable);
			df.reject();
		}
		return df;
	}
	
	mfs.del = function(i) {
		if (!i) return;
		
		var df = $.Deferred();
		if (window.isArray(i) && i.length > 1) {
			mfs._delMany(i).done(df.resolve).fail(function(e) {
				// request denied
				if (e.code == 109 && e.data && e.data.items) {
					this.handled = true;
					mfs._handleDenied("delete", i, e.data, mollify.ui.texts.get("actionDeniedDeleteMany"), mollify.ui.texts.get("actionAcceptDeleteMany", i.length)).done(function(acceptKeys) { mfs._delMany(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
				} else df.reject(e);
			});
			return df.promise();
		}
		
		if (window.isArray(i)) i = i[0];
		mfs._del(i).done(df.resolve).fail(function(e) {
			// request denied
			if (e.code == 109 && e.data && e.data.items) {
				this.handled = true;
				mfs._handleDenied("delete", i, e.data, mollify.ui.texts.get("actionDeniedDelete", i.name), mollify.ui.texts.get("actionAcceptDelete", i.name)).done(function(acceptKeys) { mfs._del(i, acceptKeys).done(df.resolve).fail(df.reject); }).fail(function(){df.reject(e);});
			} else df.reject(e);
		});
		return df.promise();
	};
	
	mfs._del = function(item, acceptKeys) {
		return mollify.service.del("filesystem/"+item.id, acceptKeys ? { acceptKeys : acceptKeys } : null).done(function(r) {
			mollify.events.dispatch('filesystem/delete', { items: [item] });
		});
	};
	
	mfs._delMany = function(i, acceptKeys) {
		return mollify.service.post("filesystem/items/", {action: 'delete', items: i, acceptKeys : (acceptKeys ? acceptKeys : null)}).done(function(r) {
			mollify.events.dispatch('filesystem/delete', { items: i });
		});
	};
	
	mfs.createFolder = function(folder, name) {
		return mollify.service.post("filesystem/"+folder.id+"/folders/", {name: name}).done(function(r) {
			mollify.events.dispatch('filesystem/createfolder', { items: [folder], name: name });
		});
	};

	/* PLUGINS */
	
	var pl = mollify.plugins;
	pl._list = {};
	
	pl.register = function(p) {
		var id = p.id;
		if (!id) return;
		
		pl._list[id] = p;
	};
	
	pl.initialize = function(cb) {
		var df = $.Deferred();
		var l = [];
		for (var id in pl._list) {
			var p = pl._list[id];
			if (p.initialize) p.initialize();
			if (p.resources) {
				var pid = p.backendPluginId || id;
				if (p.resources.texts) {
					if (mollify.settings.texts_js)
						l.push(mollify.dom.importScript(mollify.plugins.getJsLocalizationUrl(pid)));
					else
						l.push(mollify.ui.texts.loadPlugin(pid));
				}
				if (p.resources.css) mollify.dom.importCss(mollify.plugins.getStyleUrl(pid));
			}
		}
		if (l.length === 0) {
			return df.resolve().promise();
		}
		$.when.apply($, l).done(df.resolve).fail(df.reject);
		return df.promise();
	};
	
	pl.get = function(id) {
		if (!window.def(id)) return pl._list;
		return pl._list[id];
	};
	
	pl.exists = function(id) {
		return !!pl._list[id];
	};
	
	pl.url = function(id, p, admin) {
		var url = mollify.settings["service-path"]+"plugin/"+id;
		if (!p) return url;
		return url + (admin ? "/admin/" : "/client/")+p;
	};
	
	pl.adminUrl = function(id, p) {
		return pl.url(id)+"/admin/"+p;
	};

	pl.getLocalizationUrl = function(id) {
		return mollify.settings["service-path"]+"plugin/"+id+"/localization/texts_" + mollify.ui.texts.locale + ".json";
	};
	
	pl.getStyleUrl = function(id, admin) {
		return pl.url(id, "style.css", admin);
	};
	
	pl.getItemContextRequestData = function(item) {
		var requestData = {};
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemContextRequestData) continue;
			var data = plugin.itemContextRequestData(item);
			if (!data) continue;
			requestData[id] = data;
		}
		return requestData;
	};
	
	pl.getItemContextPlugins = function(item, ctx) {
		var data = {};
		if (!ctx) return data;
		var d = ctx.details;
		if (!d || !d.plugins) return data;
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemContextHandler) continue;
			var pluginData = plugin.itemContextHandler(item, ctx, d.plugins[id]);
			if (pluginData) data[id] = pluginData;
		}
		return data;
	};
	
	pl.getItemCollectionPlugins = function(items, ctx) {
		var data = {};
		if (!items || !window.isArray(items) || items.length < 1) return data;
		
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.itemCollectionHandler) continue;
			var pluginData = plugin.itemCollectionHandler(items, ctx);
			if (pluginData) data[id] = pluginData;
		}
		return data;
	};
	
	pl.getMainViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.mainViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};

	pl.getFileViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.fileViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};

	pl.getConfigViewPlugins = function() {
		var plugins = [];
		for (var id in pl._list) {
			var plugin = pl._list[id];
			if (!plugin.configViewHandler) continue;
			plugins.push(plugin);
		}
		return plugins;
	};
		
	/* FEATURES */
	
	var ft = mollify.features;
	ft.hasFeature = function(id) {
		return mollify.session.features && mollify.session.features[id];
	};
	
	/* TEMPLATES */
	var mt = mollify.templates;
	mt._loaded = [];
	
	mt.url = function(name) {
		var base = mollify.settings["template-url"] || 'templates/';
		return mollify.helpers.noncachedUrl(mollify.resourceUrl(base + name));
	};
	
	mt.load = function(name, url) {
		var df = $.Deferred();
		if (mt._loaded.indexOf(name) >= 0) {
			return df.resolve();
		}
		
		$.get(url ? mollify.resourceUrl(url) : mt.url(name)).done(function(h) {
			mt._loaded.push(name);
			$("body").append(h);
			df.resolve();
		}).fail(function(f) {
			df.reject();
		});
		return df;
	};
	
	/* DOM */
	var md = mollify.dom;
	md._hiddenLoaded = [];
		
	md.importScript = function(url) {
		var u = mollify.resourceUrl(url);
		if (!u)
			return $.Deferred().resolve().promise();
		var df = $.Deferred();
		$.getScript(u, df.resolve).fail(df.reject);
		return df.promise();
	};
		
	md.importCss = function(url) {
		var u = mollify.resourceUrl(url);
		if (!u) return;
		
		var link = $("<link>");
		link.attr({
			type: 'text/css',
			rel: 'stylesheet',
			href: mollify.helpers.noncachedUrl(u)
		});
		$("head").append(link);
	};

	md.loadContent = function(contentId, url, cb) {
		if (md._hiddenLoaded.indexOf(contentId) >= 0) {
			if (cb) cb();
			return;
		}
		var u = mollify.resourceUrl(url);
		if (!u) {
			if (cb) cb();
			return;
		}
		var id = 'mollify-tmp-'+(mollify._hiddenInd++);
		$('<div id="'+id+'" style="display:none"/>').appendTo($("body")).load(mollify.helpers.noncachedUrl(u), function() {
			md._hiddenLoaded.push(contentId);
			if (cb) cb();
		});
	};
					
	md.loadContentInto = function($target, url, handler, process) {
		var u = mollify.resourceUrl(url);
		if (!u) return;
		$target.load(mollify.helpers.noncachedUrl(u), function() {
			if (process) mollify.ui.process($target, process, handler);
			if (typeof handler === 'function') handler();
			else if (handler.onLoad) handler.onLoad($target);
		});
	};
		
	md.template = function(id, data, opt) {
		var templateId = id;
		if (mollify.settings["resource-map"] && mollify.settings["resource-map"]["template:"+id])
			templateId = mollify.settings["resource-map"]["template:"+id];
		return $("#"+templateId).tmpl(data, opt);
	};

	/* HELPERS */
	
	mollify.helpers = {
		getPluginActions : function(plugins) {
			var list = [];
			
			if (plugins) {
				for (var id in plugins) {
					var p = plugins[id];
					if (p.actions) {
						list.push({title:"-",type:'separator'});
						$.merge(list, p.actions);
					}
				}
			}
			var downloadActions = [];
			var firstDownload = -1;
			for (var i=0,j=list.length; i<j; i++) {
				var a = list[i];
				if (a.group == 'download') {
					if (firstDownload < 0) firstDownload = i;
					downloadActions.push(a);
				}
			}
			if (downloadActions.length > 1) {
				for (var i2=1,j2=downloadActions.length; i2<j2; i2++) list.remove(downloadActions[i2]); 
				list[firstDownload] = {
					type: "submenu",
					items: downloadActions,
					title: downloadActions[0].title,
					group: downloadActions[0].group,
					primary: downloadActions[0]
				};
			}
			return list;
		},
	
		getPrimaryActions : function(actions) {
			if (!actions) return [];
			var result = [];
			var p = function(list) {
				for (var i=0,j=list.length; i<j; i++) {
					var a = list[i];
					if (a.type == 'primary' || a.group == 'download') result.push(a);
				}
			}
			p(actions);
			return result;
		},

		getSecondaryActions : function(actions) {
			if (!actions) return [];
			var result = [];
			for (var i=0,j=actions.length; i<j; i++) {
				var a = actions[i];
				if (a.id == 'download' || a.type == 'primary') continue;				
				result.push(a);
			}
			return mollify.helpers.cleanupActions(result);
		},
		
		cleanupActions : function(actions) {
			if (!actions) return [];				
			var last = -1;
			for (var i=actions.length-1,j=0; i>=j; i--) {
				var a = actions[i];
				if (a.type != 'separator' && a.title != '-') {
					last = i;
					break;
				}
			}
			if (last < 0) return [];
			
			var first = -1;
			for (var i2=0; i2<=last; i2++) {
				var a2 = actions[i2];
				if (a2.type != 'separator' && a2.title != '-') {
					first = i2;
					break;
				}
			}
			actions = actions.splice(first, (last-first)+1);
			var prevSeparator = false;
			for (var i3=actions.length-1,j2=0; i3>=j2; i3--) {
				var a3 = actions[i3];
				var separator = (a3.type == 'separator' || a3.title == '-');
				if (separator && prevSeparator) actions.splice(i3, 1);
				prevSeparator = separator;
			}
			
			return actions;
		},
		
		breakUrl : function(u) {
			var parts = u.split("?");
			return { path: parts[0], params: mollify.helpers.getUrlParams(u), paramsString: (parts.length > 1 ? ("?" + parts[1]) : "") };
		},
		
		getUrlParams : function(u) {
			var params = {};
			$.each(u.substring(1).split("&"), function(i, p) {
				var pp = p.split("=");
				if (!pp || pp.length < 2) return;
				params[decodeURIComponent(pp[0])] = decodeURIComponent(pp[1]);
			});
			return params;	
		},
		
		urlWithParam : function(url, param, v) {
			var p = param;
			if (v) p = param + "=" + encodeURIComponent(v);
			return url + (window.strpos(url, "?") ? "&" : "?") + p;
		},
		
		noncachedUrl : function(url) {
			return mollify.helpers.urlWithParam(url, "_="+mollify._time);
		},
	
		formatDateTime : function(time, fmt) {
			var ft = time.toString(fmt);
			return ft;
		},
		
		parseInternalTime : function(time) {
			if (!time || time == null || typeof(time) !== 'string' || time.length != 14) return null;
			
			var ts = new Date();
			/*ts.setUTCFullYear(time.substring(0,4));
			ts.setUTCMonth(time.substring(4,6) - 1);
			ts.setUTCDate(time.substring(6,8));
			ts.setUTCHours(time.substring(8,10));
			ts.setUTCMinutes(time.substring(10,12));
			ts.setUTCSeconds(time.substring(12,14));*/
			ts.setYear(time.substring(0,4));
			ts.setMonth(time.substring(4,6) - 1);
			ts.setDate(time.substring(6,8));
			ts.setHours(time.substring(8,10));
			ts.setMinutes(time.substring(10,12));
			ts.setSeconds(time.substring(12,14));
			return ts;
		},
	
		formatInternalTime : function(time) {
			if (!time) return null;
			
			/*var year = pad(""+time.getUTCFullYear(), 4, '0', STR_PAD_LEFT);
			var month = pad(""+(time.getUTCMonth() + 1), 2, '0', STR_PAD_LEFT);
			var day = pad(""+time.getUTCDate(), 2, '0', STR_PAD_LEFT);
			var hour = pad(""+time.getUTCHours(), 2, '0', STR_PAD_LEFT);
			var min = pad(""+time.getUTCMinutes(), 2, '0', STR_PAD_LEFT);
			var sec = pad(""+time.getUTCSeconds(), 2, '0', STR_PAD_LEFT);
			return year + month + day + hour + min + sec;*/
			//var timeUTC = new Date(Date.UTC(time.getYear(), time.getMonth(), time.getDay(), time.getHours(), time.getMinutes(), time.getSeconds()));
			return mollify.helpers.formatDateTime(time, 'yyyyMMddHHmmss');
		},
		
		mapByKey : function(list, key) {
			var byKey = {};
			if (!list) return byKey;
			for (var i=0,j=list.length; i<j; i++) {
				var r = list[i];
				if (!window.def(r)) continue;
				var v = r[key];
				if (!window.def(v)) continue;
				byKey[v] = r;
			}
			return byKey;
		},
		
		extractValue : function(list, key) {
			var l = [];
			for (var i=0,j=list.length; i<j; i++) { var r = list[i]; l.push(r[key]); }
			return l;
		},

		filter : function(list, f) {
			var result = [];
			$.each(list, function(i, it) { if (f(it)) result.push(it); });
			return result;
		},
		
		arrayize : function(i) {
			var a = [];
			if (!window.isArray(i)) {
				a.push(i);
			} else {
				return i;
			}
			return a;
		}
	};

	window.mollify = mollify;

	/* Common */
	
	window.isArray = function(o) {
		return Object.prototype.toString.call(o) === '[object Array]';
	}
	
	if(typeof String.prototype.trim !== 'function') {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, ''); 
		}
	}
	
	if(typeof String.prototype.startsWith !== 'function') {
		String.prototype.startsWith = function(s) {
			if (!s || s.length === 0) return false;
			return this.substring(0, s.length) == s; 
		}
	}
	
	window.def = function(o) {
		return (typeof(o) != 'undefined');
	}
	
	if (!Array.prototype.indexOf) { 
		Array.prototype.indexOf = function(obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) { return i; }
			}
			return -1;
		}
	}
	
	if (!Array.prototype.remove) { 
		Array.prototype.remove = function(from, to) {
			if (typeof(to) == 'undefined' && typeof(from) == 'object')
				from = this.indexOf(from);
			var rest = this.slice((to || from) + 1 || this.length);
			this.length = from < 0 ? this.length + from : from;
			return this.push.apply(this, rest);
		};
	}
	
	window.strpos = function(haystack, needle, offset) {
		// Finds position of first occurrence of a string within another  
		// 
		// version: 1109.2015
		// discuss at: http://phpjs.org/functions/strpos
		// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +   improved by: Onno Marsman    
		// +   bugfixed by: Daniel Esteban
		// +   improved by: Brett Zamir (http://brett-zamir.me)
		var i = (haystack + '').indexOf(needle, (offset || 0));
		return i === -1 ? false : i;
	}
	
	var STR_PAD_LEFT = 1;
	var STR_PAD_RIGHT = 2;
	var STR_PAD_BOTH = 3;
	
	function pad(str, len, padstr, dir) {
		if (typeof(len) == "undefined") { len = 0; }
		if (typeof(padstr) == "undefined") { padstr = ' '; }
		if (typeof(dir) == "undefined") { dir = STR_PAD_RIGHT; }
	
		if (len + 1 >= str.length) {
			switch (dir){
				case STR_PAD_LEFT:
					str = new Array(len + 1 - str.length).join(padstr) + str;
					break;
				case STR_PAD_BOTH:
					var padlen = len - str.length;
					var right = Math.ceil(padlen / 2);
					var left = padlen - right;
					str = new Array(left+1).join(padstr) + str + new Array(right+1).join(padstr);
					break;
				default:
					str = str + new Array(len + 1 - str.length).join(padstr);
					break;
			}
		}
		return str;
	}
	
	/**
	*
	*  Base64 encode / decode
	*  http://www.webtoolkit.info/
	*
	**/
	 
	window.Base64 = {
	 
		// private property
		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	 
		// public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;
	 
			input = window.Base64._utf8_encode(input);
	 
			while (i < input.length) {
	 
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);
	 
				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;
	 
				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}
	 
				output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
	 
			}
	 
			return output;
		},
	 
		// public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;
	 
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
	 
			while (i < input.length) {
	 
				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));
	 
				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;
	 
				output = output + String.fromCharCode(chr1);
	 
				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}
	 
			}
	 
			output = window.Base64._utf8_decode(output);
	 
			return output;
	 
		},
	 
		// private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
	 
			for (var n = 0; n < string.length; n++) {
	 
				var c = string.charCodeAt(n);
	 
				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
	 
			}
	 
			return utftext;
		},
	 
		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c = 0, c1 = 0, c2 = 0;
	 
			while ( i < utftext.length ) {
	 
				c = utftext.charCodeAt(i);
	 
				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					var c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
	 
			}
	 
			return string;
		}
	}
}(window.jQuery);
