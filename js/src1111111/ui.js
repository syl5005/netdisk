/**
 * ui.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	//var t = mollify;
	
	/* TEXTS */
	mollify.ui.texts = {};
	var tt = mollify.ui.texts;
	
	tt.locale = null;
	tt._dict = {};
	tt._pluginTextsLoaded = [];
	
	tt.load = function(id) {
		var df = $.Deferred();
		if (tt.locale) {
			return df.resolve();
		}

		return tt._load("localization/texts_"+(id || 'en')+".json", df);
	};
	
	tt.clear = function() {
		tt.locale = null;
		tt._dict = {};
		tt._pluginTextsLoaded = [];		
	};

	tt.loadPlugin = function(pluginId) {
		if (tt._pluginTextsLoaded.indexOf(pluginId) >= 0) return $.Deferred().resolve();
		
		return tt._load(mollify.plugins.getLocalizationUrl(pluginId), $.Deferred()).done(function() {
			tt._pluginTextsLoaded.push(pluginId);
		});
	};
	
	tt._load = function(u, df) {
		var url = mollify.resourceUrl(u);
		if (!url) return df.resolve();
		
		$.ajax({
			type: "GET",
			dataType: 'text',
			url: url
		}).done(function(r) {
			if (!r || (typeof(r) != "string")) {
				df.reject();
				return;
			}
			var t = false;
			try {
				t = JSON.parse(r);
			} catch (e) {
				new mollify.ui.FullErrorView('<b>Localization file syntax error</b> (<code>'+url+'</code>)', '<code>'+e.message+'</code>').show();
				return;
			}
			if (!tt.locale)
				tt.locale = t.locale;
			else
				if (tt.locale != t.locale) {
					df.reject();
					return;
				}
			tt.add(t.locale, t.texts);
			df.resolve(t.locale);			
		}).fail(function(e) {
			if (e.status == 404) {
				new mollify.ui.FullErrorView('Localization file missing: <code>'+url+'</code>', 'Either create the file or use <a href="https://code.google.com/p/mollify/wiki/ClientResourceMap">client resource map</a> to load it from different location, or to ignore it').show();
				return;
			}
			df.reject();
		});
		return df;
	};
			
	tt.add = function(locale, t) {
		if (!locale || !t) return;
		
		if (!tt.locale) tt.locale = locale;
		else if (locale != tt.locale) return;
		
		for (var id in t) tt._dict[id] = t[id];
	};
	
	tt.get = function(id, p) {
		if (!id) return "";
		var t = tt._dict[id];
		if (!t) return "!"+tt.locale+":"+id;
		if (p) {
			if (!window.isArray(p)) p = [p];
			for (var i=0,j=p.length; i<j; i++)
				t = t.replace("{" + i + "}", p[i]);
		}
		return t;
	};
	
	tt.has = function(id) {
		return !!tt._dict[id];	
	};
	
	/* FORMATTERS */
	
	mollify.ui.formatters = {
		ByteSize : function(nf) {			
			this.format = function(b) {
				if (!window.def(b)) return "";
				
				var bytes = b;
				if (typeof(b) === "string") {
					bytes = parseInt(bytes, 10);
					if (isNaN(bytes)) return "";
				} else if (typeof(b) !== "number") return "";
				
				if (bytes < 1024)
					return (bytes == 1 ? mollify.ui.texts.get('sizeOneByte') : mollify.ui.texts.get('sizeInBytes', nf.format(bytes)));
		
				if (bytes < (1024 * 1024)) {
					var kilobytes = bytes / 1024;
					return (kilobytes == 1 ? mollify.ui.texts.get('sizeOneKilobyte') : mollify.ui.texts.get('sizeInKilobytes', nf.format(kilobytes)));
				}
		
				if (bytes < (1024 * 1024 * 1024)) {
					var megabytes = bytes / (1024 * 1024);
					return mollify.ui.texts.get('sizeInMegabytes', nf.format(megabytes));
				}
		
				var gigabytes = bytes / (1024 * 1024 * 1024);
				return mollify.ui.texts.get('sizeInGigabytes', nf.format(gigabytes));
			};
		},
		Timestamp : function(fmt) {
			this.format = function(ts) {
				if (ts == null) return "";
				if (typeof(ts) === 'string') ts = mollify.helpers.parseInternalTime(ts);
				return ts.toString(fmt);
			};
		},
		Number : function(precision, unit, ds) {
			this.format = function(n) {
				if (!window.def(n) || typeof(n) !== 'number') return "";
				
				var s = Math.pow(10, precision);
				var v = Math.floor(n * s) / s;
				var sv = v.toString();
				if (ds) sv = sv.replace(".", ds);
				if (unit) return sv + " " + unit;
				return sv;
			};
		}
	};
	
	/* UI */
	mollify.ui.uploader = false;
	mollify.ui.draganddrop = false;
	mollify.ui._activePopup = false;
	
	mollify.ui.initialize = function() {
		var list = [];		
		list.push(mollify.ui.initializeLang());
		
		// add invisible download frame
		$("body").append('<div style="width: 0px; height: 0px; overflow: hidden;"><iframe id="mollify-download-frame" src=""></iframe></div>');
		
		$(window).click(function(e) {
			// hide popups when clicked outside
			if (mollify.ui._activePopup) {
				if (e && e.toElement && mollify.ui._activePopup.element) {
					var popupElement = mollify.ui._activePopup.element();
					if (popupElement.has($(e.toElement)).length > 0) return;
				}
				mollify.ui.hideActivePopup();
			}
		});
		list.push(mollify.templates.load("dialogs.html"));
		
		if (!mollify.ui.draganddrop) mollify.ui.draganddrop = (window.Modernizr.draganddrop) ? new mollify.MollifyHTML5DragAndDrop() : new mollify.MollifyJQueryDragAndDrop();
		if (!mollify.ui.uploader) mollify.ui.uploader = new mollify.MollifyHTML5Uploader();
		if (!mollify.ui.clipboard) new mollify.ZeroClipboard(function(cb) {
			mollify.ui.clipboard = cb;
		});
		
		var df = $.Deferred();
		$.when.apply($, list).done(df.resolve).fail(df.reject);
		return df;
	};
	
	mollify.ui.initializeLang = function() {
		var df = $.Deferred();
		var lang = mollify.session.lang || mollify.settings.language["default"] || 'en';
		
		if (mollify.ui.texts.locale && mollify.ui.texts.locale == lang) return df.resolve();
		
		var pluginTextsLoaded = mollify.ui.texts._pluginTextsLoaded;
		if (mollify.ui.texts.locale) {
			mollify.App.getElement().removeClass("lang-"+mollify.ui.texts.locale);
			mollify.ui.texts.clear();
		}
		
		var list = [];
		list.push(mollify.ui.texts.load(lang).done(function(locale) {
			$("html").attr("lang", locale);
			mollify.App.getElement().addClass("lang-"+locale);
		}));
		
		if (pluginTextsLoaded) {
			$.each(pluginTextsLoaded, function(i, id) {
				list.push(mollify.ui.texts.loadPlugin(id));
			});
		}
		$.when.apply($, list).done(df.resolve).fail(df.reject);
		return df;
	};
	
	mollify.ui.hideActivePopup = function() {
		if (mollify.ui._activePopup) mollify.ui._activePopup.hide();
		mollify.ui._activePopup = false;
	};
	
	mollify.ui.activePopup = function(p) {
		if (p===undefined) return mollify.ui._activePopup;
		if (mollify.ui._activePopup) {
			if (p.parentPopupId && mollify.ui._activePopup.id == p.parentPopupId) return;
			mollify.ui._activePopup.hide();
		}
		mollify.ui._activePopup = p;
		if (!mollify.ui._activePopup.id) mollify.ui._activePopup.id = new Date().getTime();
		return mollify.ui._activePopup.id;
	};
	
	mollify.ui.isActivePopup = function(id) {
		return (mollify.ui._activePopup && mollify.ui._activePopup.id == id);
	};
	
	mollify.ui.removeActivePopup = function(id) {
		if (!id || !mollify.ui.isActivePopup(id)) return;
		mollify.ui._activePopup = false;
	};
	
	mollify.ui.download = function(url) {
		if (mollify.App.mobile)
			window.open(url);
		else
			$("#mollify-download-frame").attr("src", url);
	};
		
	mollify.ui.itemContext = function(o) {
		var ict = {};
		ict._activeItemContext = false;
		
		ict.open = function(spec) {
			var item = spec.item;
			var $e = spec.element;
			var $c = spec.viewport;
			var $t = spec.container;
			var folder = spec.folder;
			
			var popupId = "mainview-itemcontext-"+item.id;
			if (mollify.ui.isActivePopup(popupId)) {
				return;
			}
			
			var openedId = false;
			if (ict._activeItemContext) {
				openedId = ict._activeItemContext.item.id;
				ict._activeItemContext.close();
				ict._activeItemContext = false;
			}
			if (item.id == openedId) return;
			
			var $cont = $t || $e.parent();				
			var html = mollify.dom.template("mollify-tmpl-main-itemcontext", item, {})[0].outerHTML;
			$e.popover({
				title: item.name,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: '<div class="popover mollify-itemcontext-popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>',
				content: html,
				container: $cont
			}).bind("shown", function(e) {
				var api = { id: popupId, hide: function() { $e.popover('destroy'); } };
				api.close = api.hide;					
				mollify.ui.activePopup(api);

				var $el = $("#mollify-itemcontext-"+item.id);
				var $pop = $el.closest(".popover");
				var maxRight = $c.outerWidth();
				var popLeft = $pop.offset().left - $cont.offset().left;
				var popW = $pop.outerWidth();
				if (popLeft < 0)						
					popLeft = 0;
				else if ((popLeft + popW) > maxRight)
					popLeft = maxRight - popW - 10;
				$pop.css("left", popLeft + "px");
				
				var arrowPos = ($e.offset().left - $cont.offset().left) + ($e.outerWidth() / 2);
				arrowPos = Math.max(0, (arrowPos - popLeft));
				$pop.find(".arrow").css("left", arrowPos + "px");
				
				$pop.find(".popover-title").append($('<button type="button" class="close">×</button>').click(api.close));
				var $content = $el.find(".mollify-itemcontext-content");
				
				mollify.filesystem.itemDetails(item, mollify.plugins.getItemContextRequestData(item)).done(function(d) {
					if (!d) {
						$t.hide();
						return;
					}
					
					var ctx = {
						details: d,
						folder : spec.folder,
						folder_permission: spec.folder_permission
					};
					ict.renderItemContext(api, $content, item, ctx);
					//$e[0].scrollIntoView();
				});
			}).bind("hidden", function() {
				$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(popupId);
			});
			$e.popover('show');
		};
		
		ict.renderItemContext = function(cApi, $e, item, ctx) {
			var descriptionEditable = mollify.features.hasFeature("descriptions") && mollify.session.admin;
			var showDescription = descriptionEditable || !!ctx.details.description;
			
			var plugins = mollify.plugins.getItemContextPlugins(item, ctx);
			var actions = mollify.helpers.getPluginActions(plugins);
			var primaryActions = mollify.helpers.getPrimaryActions(actions);
			var secondaryActions = mollify.helpers.getSecondaryActions(actions);
			
			var o = {
				item:item,
				details:ctx.details,
				showDescription: showDescription,
				description: ctx.details.description || '',
				session: mollify.session,
				plugins: plugins,
				primaryActions : primaryActions
			};
			
			$e.removeClass("loading").empty().append(mollify.dom.template("mollify-tmpl-main-itemcontext-content", o, {
				title: function(o) {
					var a = o;
					if (a.type == 'submenu') a = a.primary;
					return a.title ? a.title : mollify.ui.texts.get(a['title-key']);
				}
			}));
			$e.click(function(e){
				// prevent from closing the popup when clicking the popup itself
				e.preventDefault();
				return false;
			});
			mollify.ui.process($e, ["localize"]);
			
			if (descriptionEditable) {
				mollify.ui.controls.editableLabel({element: $("#mollify-itemcontext-description"), hint: mollify.ui.texts.get('itemcontextDescriptionHint'), onedit: function(desc) { mollify.service.put("filesystem/"+item.id+"/description/", {description: desc}); }});
			}
			
			if (primaryActions) {
				var $pae = $e.find(".mollify-itemcontext-primary-action-button");
				$pae.each(function(i, $b){
					var a = primaryActions[i];
					if (a.type == 'submenu') {
						mollify.ui.controls.dropdown({
							element: $b,
							items: a.items,
							hideDelay: 0,
							style: 'submenu',
							parentPopupId: cApi.id,
							onItem: function() {
								cApi.hide();
							},
							onBlur: function(dd) {
								dd.hide();
							}
						});
					}
				});
				$pae.click(function(e) {
					var i = $pae.index($(this));
					var action = primaryActions[i];
					if (action.type == 'submenu') return;
					cApi.close();
					action.callback();
				});
			}
			
			if (plugins) {
				var $selectors = $("#mollify-itemcontext-details-selectors");
				var $content = $("#mollify-itemcontext-details-content");
				var contents = {};
				var onSelectDetails = function(id) {
					$(".mollify-itemcontext-details-selector").removeClass("active");
					$("#mollify-itemcontext-details-selector-"+id).addClass("active");
					$content.find(".mollify-itemcontext-plugin-content").hide();
					
					var $c = contents[id] ? contents[id] : false;
					if (!$c) {
						$c = $('<div class="mollify-itemcontext-plugin-content"></div>');
						plugins[id].details["on-render"](cApi, $c);
						contents[id] = $c;
						$content.append($c);
					}
											
					$c.show();
				};
				var firstPlugin = false;
				var selectorClick = function() {
					var s = $(this).tmplItem().data;
					onSelectDetails(s.id);
				};
				for (var id in plugins) {
					var plugin = plugins[id];
					if (!plugin.details) continue;
					
					if (!firstPlugin) firstPlugin = id;

					var title = plugin.details.title ? plugin.details.title : (plugin.details["title-key"] ? mollify.ui.texts.get(plugin.details["title-key"]) : id);
					var selector = mollify.dom.template("mollify-tmpl-main-itemcontext-details-selector", {id: id, title:title, data: plugin}).appendTo($selectors).click(selectorClick);
				}

				if (firstPlugin) onSelectDetails(firstPlugin);
			}
			
			mollify.ui.controls.dropdown({
				element: $e.find("#mollify-itemcontext-secondary-actions"),
				items: secondaryActions,
				hideDelay: 0,
				style: 'submenu',
				parentPopupId: cApi.id,
				onItem: function() {
					cApi.hide();
				},
				onBlur: function(dd) {
					dd.hide();
				}
			});
		}
		
		return {
			open : ict.open
		};
	};
	
	/**/
		
	mollify.ui.assign = function(h, id, c) {
		if (!h || !id || !c) return;
		if (!h.controls) h.controls = {};
		h.controls[id] = c;
	};
		
	mollify.ui.process = function($e, ids, handler) {
		$.each(ids, function(i, k) {
			if (mollify.ui.handlers[k]) mollify.ui.handlers[k]($e, handler);
		});
	};
				
	mollify.ui.handlers = {
		localize : function(p, h) {
			p.find(".localized").each(function() {
				var $t = $(this);
				var key = $t.attr('title-key');
				if (key) {
					$t.attr("title", mollify.ui.texts.get(key));
					$t.removeAttr('title-key');
				}
				
				key = $t.attr('text-key');
				if (key) {
					$t.prepend(mollify.ui.texts.get(key));
					$t.removeAttr('text-key');
				}
			});
			p.find("input.hintbox").each(function() {
				var $this = $(this);
				var hint = mollify.ui.texts.get($this.attr('hint-key'));
				$this.attr("placeholder", hint).removeAttr("hint-key");
			});//.placeholder();
		},
			
		center : function(p, h) {
			p.find(".center").each(function() {
				var $this = $(this);
				var x = ($this.parent().width() - $this.outerWidth(true)) / 2;
				$this.css({
					position: "relative",
					left: x
				});
			});
		},
		
		hover: function(p) {
			p.find(".hoverable").hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			});
		},
		
		bubble: function(p, h) {
			p.find(".bubble-trigger").each(function() {
				var $t = $(this);
				var b = mollify.ui.controls.bubble({element:$t, handler: h});
				mollify.ui.assign(h, $t.attr('id'), b);
			});
		},
		
		radio: function(p, h) {
			p.find(".mollify-radio").each(function() {
				var $t = $(this);
				var r = mollify.ui.controls.radio($t, h);
				mollify.ui.assign(h, $t.attr('id'), r);
			});
		}
	};
		
	mollify.ui.window = {
		open : function(url) {
			window.open(url);
		}
	};
	
	mollify.ui.preloadImages = function(a) {
		$.each(a, function(){
			$('<img/>')[0].src = this;
		});
	};
	
	mollify.ui.FullErrorView = function(title, msg) {
		this.show = function() {
			this.init(mollify.App.getElement());
		};
		
		this.init = function($c) {
			if (mollify.App._initialized)
				mollify.dom.template("mollify-tmpl-fullpage-error", {title: title, message: msg}).appendTo($c.empty());
			else {
				var err = '<h1>'+title+'</h1><p>'+msg+'</p>';
				$c.html(err);
			}
		};
	};
	
	/* CONTROLS */
	
	var processPopupActions = function(l) {
		$.each(l, function(i, item){
			if (item.type == 'submenu') {
				processPopupActions(item.items);
				return;
			}
			if (item.title) return;
			if (item["title-key"]) item.title = mollify.ui.texts.get(item['title-key']);
		});
	};
	var createPopupItems = function(itemList) {
		var list = itemList||[];
		processPopupActions(list);
		return mollify.dom.template("mollify-tmpl-popupmenu", {items:list});
	};
	var initPopupItems = function($p, l, onItem) {
		$p.find(".dropdown-item").click(function() {
			var $e = $(this);
			var $top = $p.find(".dropdown-menu");
			var path = [];
			while (true) {
				if (!$e.hasClass("dropdown-menu"))
					path.push($e.index());
				$e = $e.parent();
				if ($e[0] == $top[0]) break;
			}
			var item = false;
			var parent = l;
			$.each(path.reverse(), function(i, ind) {
				item = parent[ind];
				if (item.type == 'submenu') parent = item.items;
			});
			if (onItem) onItem(item, item.callback ? item.callback() : null);
			else if (item.callback) item.callback();
			return false;
		});
	};
			
	mollify.ui.controls = {
		dropdown : function(a) {
			var $e = $(a.element);
			var $mnu = false;
			var popupId = false;
			var popupItems = a.items;
			//$e.addClass('dropdown');
			var hidePopup = function() {
				if (!$mnu) return;
				if (a.onHide) a.onHide();
				$mnu.parent().removeClass("open");
				mollify.ui.removeActivePopup(popupId);
			};
			var onItem = function(i, cbr) {
				hidePopup();
				if (a.onItem) a.onItem(i, cbr);
			};

			var api = {
				hide: hidePopup,
				items: function(items) {
					$mnu.remove();
					$mnu = createPopupItems(items);
					$e.removeClass("loading").append($mnu);
					initPopupItems($e, items, onItem);
					popupItems = items;
				}
			};
			if (a.parentPopupId) api.parentPopupId = a.parentPopupId;
			
			var $toggle = $e.find(".dropdown-toggle");
			if ($toggle.length != 1) return;
			
			$toggle.parent().append(createPopupItems(a.items));
			
			$toggle.dropdown({
				onshow: function($p) {
					if (!$mnu) $mnu = $($p.find(".dropdown-menu")[0]);
					if (!a.parentPopupId)
						popupId = mollify.ui.activePopup(api);
					if (!popupItems) $mnu.addClass("loading");
					if (a.onShow) a.onShow(api, popupItems);
				},
				onhide: function() {
					hidePopup();
					if (a.dynamic) popupItems = false;
				}
			});
			initPopupItems($e, a.items, onItem);
		},
		
		popupmenu : function(a) {
			var popupId = false;
			var $e = $(a.element);
			var pos = $e.offset();
			var $mnu = $('<div class="mollify-popupmenu" style="position: absolute; top: '+(pos.top + $e.outerHeight())+'px; left:'+pos.left+'px;"></div>');
			var popupitems = a.items;
			var hidePopup = function() {
				if (a.onHide) a.onHide();
				$mnu.remove();
				mollify.ui.removeActivePopup(popupId);
			};
			var onItem = function(i, cbr) {
				hidePopup();
				if (a.onItem) a.onItem(i, cbr);
			};
			
			if (!a.items) $mnu.addClass("loading");
			$mnu.append(createPopupItems(a.items).css("display", "block"));
			if (a.style) $mnu.addClass(a.style);
			mollify.App.getElement().append($mnu);//.on('click', hidePopup);
			
			var api = {
				hide: hidePopup,
				items: function(items) {
					$mnu.empty().removeClass("loading").append(createPopupItems(items).css("display", "block"));
					initPopupItems($mnu, items, onItem);
				}
			};
			if (a.items) initPopupItems($mnu, a.items, onItem);
			popupId = mollify.ui.activePopup(api);
			return api;
		},
		
		bubble: function(o) {
			var $e = o.element;
			var actionId = $e.attr('id');
			if (!actionId) return;
			
			var content = $("#" + actionId + '-bubble');
			if (!content || content.length === 0) return;

			var html = content.html();
			content.remove();

			var $tip = false;
			var rendered = false;
			var api = {
				hide: function() {
					$e.popover('hide');
				},
				close: this.hide
			};
			var $el = $('<div class="popover mollify-bubble-popover"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>');
			$e.popover({
				title: false,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: $el,
				content: html
			}).bind("shown", function(e) {
				$tip = $el;
				mollify.ui.activePopup(api);
				/*$tip.click(function(e) {
					e.preventDefault();
					return false;
				});*/
				if (!rendered) {
					if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(actionId, api);
					rendered = true;
				}
				if (o.handler && o.handler.onShowBubble) o.handler.onShowBubble(actionId, api);
			}).bind("hidden", function() {
				//$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(api.id);
			});
			$e.click(function(e){
				e.preventDefault();
				$e.popover('show');
				return false;
			});
		},

		dynamicBubble: function(o) {
			var $e = o.element;
			
			var bubbleHtml = function(c) {
				if (!c) return "";
				if (typeof(c) === 'string') return c;
				return $("<div/>").append(c).html();
			};
			var html = o.content ? bubbleHtml(o.content) : '<div class="loading"></div>';
			var $tip = false;
			var $cnt = o.container || $e.parent();
			var $vp = o.viewport || $cnt;
			var pos = function() {
				var $pop = $el.closest(".popover");
				var maxRight = $vp.outerWidth();
				var popLeft = $pop.offset().left - $cnt.offset().left;
				var popW = $pop.outerWidth();
				if (popLeft < 0)
					popLeft = 0;
				else if ((popLeft + popW) > maxRight)
					popLeft = maxRight - popW - 10;
				$pop.css("left", popLeft + "px");
				
				var arrowPos = ($e.offset().left - $cnt.offset().left) + ($e.outerWidth() / 2) - 10;
				arrowPos = Math.max(0, (arrowPos - popLeft));
				$pop.find(".arrow").css("left", arrowPos + "px");
			};
			var api = {
				show: function() {
					$e.popover('show');
				},
				hide: function(dontDestroy) {
					if (dontDestroy) $tip.hide();
					else $e.popover('destroy');
				},
				element : function() {
					return $tip;
				},
				getContent: function() {
					return $tip.find('.popover-content');	
				},
				content: function(c) {
					var $c = $tip.find('.popover-content');
					if (typeof(c) === 'string') $c.html(c);
					else $c.empty().append(c);
					pos();
				},
				position: pos
			};
			api.close = api.hide;
			var $el = $('<div class="popover mollify-bubble-popover"><div class="arrow"></div>' + (o.title ? '<h3 class="popover-title"></h3>' : '') + '<div class="popover-content"></div></div>');

			$e.popover({
				title: o.title ? o.title : false,
				html: true,
				placement: 'bottom',
				trigger: 'manual',
				template: $el,
				content: html,
				container: $cnt
			}).bind("shown", function(e) {
				$tip = $el;
				
				mollify.ui.activePopup(api);
				$tip.click(function(e) {
					e.stopPropagation();
				});
				if (o.title)
					$tip.find(".popover-title").append($('<button type="button" class="close">×</button>').click(function() { api.close(); }));
				mollify.ui.handlers.localize($tip);
				if (o.handler && o.handler.onRenderBubble) o.handler.onRenderBubble(api);
			}).bind("hidden", function() {
				$e.unbind("shown").unbind("hidden");
				mollify.ui.removeActivePopup(api.id);
			});
			$e.popover('show');
			
			return api;
		},
		
		table: function(id, o) {
			var $e = (typeof(id) == 'string') ? $("#"+id) : $(id);
			if ($e.length === 0 || !o.columns) return false;

			var selectionChangedCb = $.Callbacks();
			$e.addClass("mollify-table");
			if (o.id) $e.addClass("mollify-table-" + o.id);
			if (o.onSelectionChanged) selectionChangedCb.add(o.onSelectionChanged);
			$e.addClass("table");
			if (o.narrow) $e.addClass("table-condensed");
			if (o.hilight) $e.addClass("hilight");
			var dataInfo = false;
			var $pagingControls = false;
			var perPageMax = (o.remote && o.remote.paging ? o.remote.paging.max || 50 : 50);
			
			var refreshPagingControls = function() {
				var $p = $pagingControls.find("ul").empty();				
				var pages = dataInfo ? Math.ceil(dataInfo.total / perPageMax) : 0;
				if (pages < 2) return;
				
				var current = dataInfo ? (Math.floor(dataInfo.start / perPageMax) + 1) : 0;
				var mid = current + Math.floor((pages-current) / 2);
				var getNrBtn = function(nr) {
					return $('<li class="page-btn page-nr'+((current == nr) ? ' active' : '')+'"><a href="javascript:void(0);">'+nr+'</a></li>');
				};
				
				$p.append($('<li class="page-btn page-prev'+((current <= 1) ? ' disabled' : '')+'"><a href="javascript:void(0);">&laquo;</a></li>'));
				if (pages <= 10) {
					for (var i=1; i<=pages; i++) {
						$p.append(getNrBtn(i));
					}
				} else {
					if (current != 1) $p.append(getNrBtn(1));
					if (current > 2) $p.append(getNrBtn(2));					
					if (current > 3) $p.append("<li class='page-break'>...</li>");

					if (current > 4) $p.append(getNrBtn(current-2));					
					if (current > 3) $p.append(getNrBtn(current-1));
					$p.append(getNrBtn(current));
					if (current < (pages-2)) $p.append(getNrBtn(current+1));
					if (current < (pages-1)) $p.append(getNrBtn(current+2));
					
					/*if (current > 4 && current < (pages-3)) {
						$p.append("<li class='page-break'>...</li>");
						$p.append(getNrBtn(mid-1));
						$p.append(getNrBtn(mid));
						$p.append(getNrBtn(mid+1));
					}*/
					
					if (current < (pages-2)) $p.append("<li class='page-break'>...</li>");					
					if (current < (pages-1)) $p.append(getNrBtn(pages-1));
					if (current != pages) $p.append(getNrBtn(pages));
				}
				$p.append($('<li class="page-btn page-next'+((current >= pages) ? ' disabled' : '')+'"><a href="javascript:void(0);">&raquo;</a></li>'));
			};
			if (o.remote && o.remote.paging) {
				var $ctrl = o.remote.paging.controls || $("<div class='mollify-table-pager'></div>").insertAfter($e);
				$pagingControls = $('<div class="pagination"><ul></ul></div>').appendTo($ctrl);
				$ctrl.delegate(".page-btn > a", "click", function(e) {
					if (!dataInfo) return;
					
					var $t = $(this);
					var $p = $t.parent();
					if ($p.hasClass("disabled")) return;
					
					var page = Math.floor(dataInfo.start / perPageMax) + 1;
					var pages = Math.ceil(dataInfo.total / perPageMax);
					if ($p.hasClass("page-next")) page++;
					else if ($p.hasClass("page-prev")) page--;
					else {
						page = parseInt($t.text(), 10);
					}
					if (page < 1 || page > pages) return;
					dataInfo.start = (page-1) * perPageMax;
					api.refresh();
				});
				refreshPagingControls();
			}
			
			var findRow = function(item) {
				var found = false;
				$l.find("tr").each(function() {
					var $row = $(this);
					var rowItem = $row[0].data;
					if (item == rowItem) {
						found = $row;
						return false;
					}
				});
				return found;
			};
			var getSelectedRows = function() {
				var sel = [];
				$e.find(".mollify-tableselect:checked").each(function(i, e){
					var item = $(e).parent().parent()[0].data;
					sel.push(item);
				});
				return sel;
			};
			var setRowSelected = function(item, sel) {
				var $row = findRow(item);
				$row.find(".mollify-tableselect").prop("checked", sel);
				selectionChangedCb.fire();
			};
			var updateSelectHeader = function() {
				var count = $l.children().length;
				var all = (count > 0 && getSelectedRows().length == count);
				if (all)
					$e.find(".mollify-tableselect-header").prop("checked", true);
				else
					$e.find(".mollify-tableselect-header").prop("checked", false);
			};
			selectionChangedCb.add(updateSelectHeader);
			var selectAll = function(s) {
				$e.find(".mollify-tableselect").prop("checked", s);
			};
			var $h = $("<tr></tr>").appendTo($("<thead></thead>").appendTo($e));
			var firstSortable = false;
			var thClick = function(e) {
				var count = $l.children().length;
				var all = (count > 0 && getSelectedRows().length == count);
				selectAll(!all);
				selectionChangedCb.fire();
			};
			for (var i=0,j=o.columns.length; i<j; i++) {
				var $th;
				var col = o.columns[i];
				if (col.type == 'selectrow') {
					$th = $('<input class="mollify-tableselect-header" type="checkbox"></input>').click(thClick);
				} else {
					$th = $("<th>"+(col.type == 'action' ? "" : (col.title ? col.title : ""))+"</th>");
					$th[0].colId = col.id;
					if (col.sortable) {
						$th.append("<span class='mollify-tableheader-sort'></span>").addClass("sortable");
						if (!firstSortable) firstSortable = col.id;
					}
				}

				if (col.id) $th.addClass("col-"+col.id);
				$th.appendTo($h);
			}			
			var sortKey = false;
			if (firstSortable) sortKey = { id: firstSortable, asc: true };
			if (o.defaultSort) sortKey = o.defaultSort;
			var updateSort = function() {
				$e.find("th.sortable > .mollify-tableheader-sort").empty();
				if (!sortKey) return;
				var $col = $("th.col-"+sortKey.id+" > .mollify-tableheader-sort");
				$col.html("<i class='"+(sortKey.asc ? "icon-caret-up" : "icon-caret-down")+ "'></i>");
			};
			$e.delegate("th.sortable", "click", function(e) {
				var $t = $(this);

				var id = $t[0].colId;
				if (sortKey && sortKey.id == id) {
					sortKey.asc = !sortKey.asc;
				} else {
					sortKey = { id: id, asc: true };
				}
				updateSort();
				api.refresh();
			});
			updateSort();

			var $l = $("<tbody></tbody>").appendTo($e);
			var $eh = false;
			if (o.emptyHint) $eh = $("<tr class='mollify-table-empty-hint'><td colspan='"+o.columns.length+"'>"+o.emptyHint+"</td></tr>");
			$e.delegate(".mollify-tableselect", "change", function(e) { selectionChangedCb.fire(); return false; });
			$e.delegate("a.mollify-tableaction", "click", function(e) {
				var $cell = $(this).parent();
				var $row = $cell.parent();
				var colId = $cell[0].colId;
				var item = $row[0].data;
				
				e.stopPropagation();
				if (o.onRowAction) o.onRowAction(colId, item);
				return false;
			});
			if (o.hilight) {
				$e.delegate("tr", "click", function(e) {
					if (e.target && $(e.target).hasClass("mollify-tableselect")) return;

					var $t = $(this);
					var item = $t[0].data;
					if (!item) return;
					if ($t.hasClass("info")) {
						$t.removeClass("info");
						$t.find(".mollify-tableselect").prop("checked", false);
						item = null;
					} else {
						$e.find("tr").removeClass("info");
						selectAll(false);
						$t.find(".mollify-tableselect").prop("checked", true);
						$t.addClass("info");
					}
					selectionChangedCb.fire();
					if (o.onHilight) o.onHilight(item);
				});
			}
			
			var setCellValue = function($cell, col, item) {
				$cell[0].colId = col.id;
				var v = item[col.id];
				if (col.cellClass) $cell.addClass(col.cellClass);
				if (col.type == 'selectrow') {
					var $sel = $('<input class="mollify-tableselect" type="checkbox"></input>').appendTo($cell);
				} else if (col.type == 'action') {
					var html = col.content;
					if (col.valueMapper) html = col.valueMapper(item, v);
					if (html) $("<a class='mollify-tableaction' title='"+col.title+"'></a>").html(html).appendTo($cell);
				} else if (col.type == "input") {
					var $s = $('<input type="text"></input>').appendTo($cell).change(function() {
						var v = $s.val();
						$cell[0].ctrlVal = v;
						if (o.selectOnEdit) setRowSelected(item, true);
						if (col.onChange) col.onChange(item, v);
					});
					$cell[0].ctrl = $s;
					var sv = v;
					if (col.valueMapper) sv = col.valueMapper(item, v);
					$s.val(sv);
				} else if (col.type == "select") {
					var $sl = mollify.ui.controls.select($("<select></select>").appendTo($cell), {
						values: col.options,
						title : "title",
						onChange: function(v) {
							$cell[0].ctrlVal = v;
							if (o.selectOnEdit) setRowSelected(item, true);
							if (col.onChange) col.onChange(item, v);
						}
					});
					$cell[0].ctrl = $sl;
					var sv2 = v;
					if (col.valueMapper) sv2 = col.valueMapper(item, v);
					$sl.select(sv2);
				} else if (col.type == 'static') {
					$cell.html(col.content || '');
				} else {
					if (col.renderer) col.renderer(item, v, $cell);
					else if (col.valueMapper) $cell.html(col.valueMapper(item, v));
					else if (col.formatter) $cell.html(col.formatter.format(v));
					else $cell.html(v);
				}
			};
			var addItem = function(item) {
				if ($eh) $eh.detach();
				var $row = $("<tr></tr>").appendTo($l);
				$row[0].data = item;
				if (o.onRow) o.onRow($row, item);
				
				for (var i=0,j=o.columns.length; i<j; i++) {
					var $cell = $("<td></td>").appendTo($row);
					setCellValue($cell, o.columns[i], item);
				}
			};
			var updateRow = function($row) {
				$row.find("td").each(function() {
					var $cell = $(this);
					var index = $cell.index();
					setCellValue($cell, o.columns[index], $row[0].data);
				});
			};
			var updateHint = function() {
				if (!$eh) return;
				var count = $l.find("tr").length;
				if (count === 0) $eh.appendTo($l);
				else $eh.hide();
			};
			
			var api = {
				findByKey : function(k) {
					if (!o.key) return false;
					var found = false;
					$l.find("tr").each(function() {
						var item = $(this)[0].data;
						if (item[o.key] == k) {
							found = item;
							return false;
						}
					});
					return found;
				},
				onSelectionChanged : function(cb) {
					selectionChangedCb.add(cb);
				},
				getSelected : function() {
					return getSelectedRows();
				},
				getValues : function() {
					var values = {};
					$l.find("td").each(function() {
						var $cell = $(this);
						var ctrlVal = $cell[0].ctrlVal;
						if (!ctrlVal) return;
						
						var $row = $cell.parent();
						var item = $row[0].data;
						var key = item[o.key];
						if (!values[key]) values[key] = {};
						values[key][$cell[0].colId] = ctrlVal;
					});
					return values;	
				},
				set : function(items) {
					if ($eh) $eh.detach();
					$l.empty();
					$.each(items, function(i, item) { addItem(item); });
					updateHint();
					selectionChangedCb.fire();
				},
				add : function(item) {
					if (!item) return;
					
					if (window.isArray(item)) {
						for (var i=0,j=item.length; i<j; i++) addItem(item[i]);
					} else {
						addItem(item);
					}
					updateHint();
				},
				update : function(item) {
					if (!item) return;
					var $row = findRow(item);
					if (!$row) return;
					updateRow($row);
				},
				remove : function(item) {
					if (!item) return;
					var $row = findRow(item);
					if (!$row) return;
					$row.remove();
					updateHint();
				},
				refresh: function() {
					var df = $.Deferred();
					if (!o.remote || !o.remote.path) return df.resolve();
					var queryParams = { count: perPageMax, start: dataInfo ? dataInfo.start : 0, sort: sortKey };
					if (o.remote.queryParams) {
						var p = o.remote.queryParams(dataInfo);
						if (p) queryParams = $.extend(queryParams, p);
					}
					var pr = mollify.service.post(o.remote.path, queryParams).done(function(r) {
						if (o.remote.paging) {
							dataInfo = { start: r.start, count: r.count, total: r.total };
							refreshPagingControls();
						} else dataInfo = false;
						api.set(r.data);
						df.resolve();
					}).fail(df.reject);
					if (o.remote.onLoad) o.remote.onLoad(pr);
					return df;
				}
			};
			return api;
		},
		
		select: function(e, o) {				
			var $e = (typeof(e) === "string") ? $("#"+e) : e;
			if (!$e || $e.length === 0) return false;

			var addItem = function(item) {
				var $row = $("<option></option>").appendTo($e);
				if (item == o.none) {
					$row.html(item);
				} else {
					if (o.renderer) o.renderer(item, $row);
					else {
						var c;
						if (typeof(item) === "string" || !o.title) {
							c = item;
							if (o.valueMapper) c = o.valueMapper(item);
						} else {
							c = item[o.title];
						}
						$row.html(c);
					}
				}
				$row[0].data = item;
			};
			
			var getSelected = function() {
				var s = $e.find('option:selected');
				if (!s || s.length === 0) return null;
				var item = s[0].data;
				if (item == o.none) return null;
				return item;
			}
			
			if (o.onChange) {
				$e.change(function() {
					o.onChange(getSelected());
				});
			}
			
			var api = {
				add : function(item) {
					if (!item) return;
					
					if (window.isArray(item)) {
						for (var i=0,j=item.length; i<j; i++) addItem(item[i]);
					} else {
						addItem(item);
					}	
				},
				select : function(item) {
					var $c = $e.find("option");
					
					if (typeof(item) === 'number') {
						if ($c.length >= item) return;
						$($c[item]).prop("selected", true);
						return;	
					}
					
					var find = item;
					if (o.none && !find) find = o.none;
					
					for (var i=0,j=$c.length; i<j; i++) {
						if ($c[i].data == find) {
							$($c[i]).prop("selected", true);
							return;
						}
					}
				},
				get : getSelected,
				set : this.select,
				selected : getSelected
			};
			if (o.none) api.add(o.none);
			if (o.values) api.add(o.values);
			return api;
		},
		
		radio: function(e, h) {
			var rid = e.addClass("btn-group").attr('id');
			var items = e.find("button");
			
			var select = function(item) {
				items.removeClass("active");
				item.addClass("active");
			}
			
			items.click(function() {
				var i = $(this);
				var ind = items.index(i);
				select(i);
				
				var id = i.attr('id');
				if (h && rid && h.onRadioChanged) h.onRadioChanged(rid, id, ind);
			});
			
			return {
				set: function(ind) {
					select($(items[ind]));
				}
			};
		},
		
		datepicker: function(e, o) {
			if (!e) return false;
			if (!o) o = {};
			var $e = (typeof(e) === "string") ? $("#"+e) : e;
			if (!$.fn.datetimepicker.dates.mollify) {
				$.fn.datetimepicker.dates.mollify = {
					days: mollify.ui.texts.get('days'),
					daysShort: mollify.ui.texts.get('daysShort'),
					daysMin: mollify.ui.texts.get('daysMin'),
					months: mollify.ui.texts.get('months'),
					monthsShort: mollify.ui.texts.get('monthsShort'),
					today: mollify.ui.texts.get('today'),
					weekStart: mollify.ui.texts.get('weekStart')
				};
			}
			var val = o.value || null;
			var fmt = o.format || mollify.ui.texts.get('shortDateTimeFormat');
			fmt = fmt.replace(/\b[h]\b/, "hh");
			fmt = fmt.replace(/\b[M]\b/, "MM");
			fmt = fmt.replace(/\b[d]\b/, "dd");
			fmt = fmt.replace("tt", "PP");
			var $dp = $e.datetimepicker({
				format: fmt,
				language: "mollify",
				pickTime: o.time || true,
				pickSeconds: (fmt.indexOf('s') >= 0)
			}).on("changeDate", function(ev) {
				val = ev.date;
			});
			
			var picker = $dp.data('datetimepicker');
			if (val) picker.setDate(val);
			
			var api = {
				get: function() {
					if (val)
						return new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), val.getUTCHours(), val.getUTCMinutes(), val.getUTCSeconds());
					return val;
				},
				set: function(d) {
					val = (d != null ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())) : null);
					picker.setDate(val);
				}
			};
			$dp.data("mollify-datepicker", api);
			return api;
		},
		
		editableLabel: function(o) {
			var $e = $(o.element);
			var id = $e.attr('id');
			var originalValue = o.value || $e.html().trim();
			if (!id) return;
			
			$e.addClass("editable-label").hover(function() {
				$e.addClass("hover");
			}, function() {
				$e.removeClass("hover");
			});
			
			var $label = $("<label></label>").appendTo($e.empty());
			var $editor = $("<input></input>").appendTo($e);
			var ctrl = {
				value: function(v) {
					originalValue = v;
					if (originalValue || !o.hint) {
						$e.removeClass("hint");
						$label.html(originalValue);
					} else {
						$e.addClass("hint");
						$label.html(o.hint);
					}
					$editor.val(originalValue);	
				}
			};
			ctrl.value(originalValue);
			
			var onFinish = function() {
				var v = $editor.val();
				if (o.isvalid && !o.isvalid(v)) return;
				
				$editor.hide();
				$label.show();
				if (originalValue != v) {
					if (o.onedit) o.onedit(v);
					ctrl.value(v);
				}
			};
			var onCancel = function() {
				$editor.hide();
				$label.show();
				ctrl.value(originalValue);
			};

			$editor.hide().bind("blur", onFinish).keyup(function(e) {
				if (e.which == 13) onFinish();
				else if (e.which == 27) onCancel();
			});
			
			$label.bind("click", function() {
				$label.hide();
				$editor.show().focus();
			});
			
			return ctrl;
		},
		
		slidePanel : function($e, o) {
			if (!$e) return;
			var $p = mollify.dom.template("mollify-tmpl-slidepanel").appendTo($e);
			if (o.relative) $p.addClass("relative");
			var $content = $p.find(".mollify-slidepanel-content");
			if (o.resizable) {
				$p.resizable({
					handles: "n"
				}).bind("resize", function (e, ui) {
					$(this).css("top", "auto");
				});
			}
			
			var api = {
				getContentElement : function() { return $content; },
				show: function($c, h) {
					if ($c) $content.empty().append($c);
					$content.parent().scrollTop(0);
					$p.animate({
						"height" : h+"px"
					}, 500);
				},
				hide: function() {
					$p.animate({"height": "0px"}, 500);
				},
				remove: function() { $p.remove(); }
			};
			$p.find(".close").click(api.hide);
			return api;
		}
	};
	
	/* DIALOGS */
	
	mollify.ui.dialogs = {};
	var dh = mollify.ui.dialogs;
			
	dh._dialogDefaults = {
		title: "Mollify"
	};
	
	dh.closeActiveDialog = function() {
		if (!dh._activeDialog) return;
		dh._activeDialog.close();
	};
			
	dh.info = function(spec) {
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-info").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback) spec.callback();
			}
		});
		/*var dlg = $("#mollify-tmpl-dialog-info").tmpl($.extend(spec, dialogDefaults)).dialog({
			modal: true,
			resizable: false,
			height: 'auto',
			minHeight: 50
		});
		mollify.ui.handlers.localize(dlg);
		dlg.find("#mollify-info-dialog-close-button").click(function() { dlg.dialog('destroy'); dlg.remove(); });*/
	};
	
	dh.showActionDeniedMessage = function(title, reasons) {
		//TODO template
		var msg = '<p>'+title+'</p><p><ul>';
		for (var i=0,j=reasons.length;i<j;i++) {
			msg = msg + "<li>" + reasons[i] + "</li>";
		}
		msg = msg + "</ul></p>";
		mollify.ui.dialogs.error({
			title: mollify.ui.texts.get('errorDialogTitle'),
			message: msg
		});
	}
	
	dh.confirmActionAccept = function(title, reasons, confirmCb, cancelCb) {
		//TODO template
		var msg = '<p>'+title+'</p><p><ul>';
		for (var i=0,j=reasons.length;i<j;i++) {
			msg = msg + "<li>" + reasons[i] + "</li>";
		}
		msg = msg + "</ul></p>";
		dh.custom({
			title: mollify.ui.texts.get('errorDialogTitle'),
			content: msg,
			buttons: [
				{ id: "yes", "title-key": "yes", cls:"btn-primary" },
				{ id: "no", "title-key": "no" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (btn.id === 'yes') if (confirmCb) confirmCb();
				else if (cancelCb) cancelCb();
			}
		});
	}
	
	dh.showError = function(error) {
		var msg = 'errorDialogMessage_'+error.code;
		if (!mollify.ui.texts.has(msg)) msg = 'errorDialogUnknownError';
		if (mollify.session.admin && error.trace) {
			dh.custom({
				title: mollify.ui.texts.get('errorDialogTitle'),
				content: $("#mollify-tmpl-dialog-error-debug").tmpl({
					title: mollify.ui.texts.get('errorDialogTitle'),
					message: mollify.ui.texts.get(msg),
					debug: error.trace.join("<br/>")}
				),
				buttons: [
					{ id: "ok", "title-key": "ok", cls:"btn-primary" }
				],
				"on-button": function(btn, d) {
					d.close();
				}
			});
		} else {
			mollify.ui.dialogs.error({
				title: mollify.ui.texts.get('errorDialogTitle'),
				message: mollify.ui.texts.get(msg)
			});
		}
	};
	
	dh.select = function(spec) {
		var table = false;
		dh.custom({
			title: spec.title,
			initSize: spec.initSize,
			content: $("#mollify-tmpl-dialog-select").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" },
				{ id: "cancel", "title-key": "dialogCancel" }
			],
			"on-button": function(btn, d) {
				var sel;
				if (btn.id == "ok") {
					sel = table.getSelected();
					if (!sel || sel.length === 0) return;
				}
				d.close();
				if (btn.id == "ok" && spec.onSelect) {
					spec.onSelect(sel, table.getValues());
				}
			},
			"on-show": function(h, $dlg) {
				var $table = $($dlg.find(".mollify-selectdialog-table")[0]);
				table = mollify.ui.controls.table($table, {
					key: spec.key,
					selectOnEdit: true,
					columns: [{ type:"selectrow" }].concat(spec.columns)
				});
				table.set(spec.list);
			}
		});
	};

	dh.error = function(spec) {
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-error").tmpl({message: spec.message}),
			buttons: [
				{ id: "ok", "title-key": "ok", cls:"btn-primary" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback) spec.callback();
			}
		});
	};
	
	dh.confirmation = function(spec) {
		dh.custom({
			title: spec.title,
			content: spec.message,
			buttons: [
				{ id: "yes", "title-key": "yes" },
				{ id: "no", "title-key": "no" }
			],
			"on-button": function(btn, d) {
				d.close();
				if (spec.callback && btn.id === 'yes') spec.callback();
			}
		});
	};
	
	dh.input = function(spec) {
		var $input = false;
		dh.custom({
			title: spec.title,
			content: $("#mollify-tmpl-dialog-input").tmpl({message: spec.message}),
			buttons: [
				{ id: "yes", "title": spec.yesTitle, cls:"btn-primary" },
				{ id: "no", "title": spec.noTitle }
			],
			"on-button": function(btn, d) {
				if (btn.id === 'yes') {
					if (!spec.handler || !spec.handler.isAcceptable) return;
					if (!spec.handler.isAcceptable($input.val())) return;
				}
				d.close();
				if (btn.id === 'yes') spec.handler.onInput($input.val());
			},
			"on-show": function(h, $dlg) {
				$input = $dlg.find(".mollify-inputdialog-input");
				if (spec.defaultValue) $input.val(spec.defaultValue);
				$input.focus();
			}
		});
	};
	
	dh.wait = function(spec) {
		var $trg = (spec && spec.target) ? $("#"+spec.target) : $("body");
		var w = mollify.dom.template("mollify-tmpl-wait", $.extend(spec, dh._dialogDefaults)).appendTo($trg).show();
		return {
			close: function() {
				w.remove();
			}
		};
	};
	
	dh.notification = function(spec) {
		if (mollify.App.activeView && mollify.App.activeView.onNotification && mollify.App.activeView.onNotification(spec)) return;
		
		var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#"+spec.target) : spec.target) : $("#mollify-notification-container");
		if ($trg.length === 0) $trg = $("body");
		var notification = mollify.dom.template("mollify-tmpl-notification", $.extend(spec, dh._dialogDefaults)).hide().appendTo($trg).fadeIn(300);
		setTimeout(function() {
			notification.fadeOut(300);
			if (spec["on-finish"]) spec["on-finish"]();
		}, spec.time | 3000);
	};
	
	dh.custom = function(spec) {
		var center = function($d) {
			$d.css("margin-left", -$d.outerWidth()/2);
			$d.css("margin-top", -$d.outerHeight()/2);
			$d.css("top", "50%");
			$d.css("left", "50%");
		};
		var s = spec;
		if (s['title-key']) s.title = mollify.ui.texts.get(s['title-key']);
		
		var $dlg = $("#mollify-tmpl-dialog-custom").tmpl($.extend(dh._dialogDefaults, s), {
			getContent: function() {
				if (spec.html) return spec.html;
				if (spec.content) {
					var c = spec.content;
					if (typeof c === 'string') return c;
					return $("<div/>").append(c.clone()).html();
				}
				return "";
			},
			getButtonTitle: function(b) {
				if (b.title) return b.title;
				if (b["title-key"]) return mollify.ui.texts.get(b["title-key"]);
				return "";
			}
		});
		if (spec.element) $dlg.find(".modal-body").append(spec.element);
		
		mollify.ui.handlers.localize($dlg);
		$dlg.on('hidden', function(e) {
			if (e.target != $dlg[0]) return;
			$dlg.remove();
		}).modal({
			backdrop: 'static', //!!spec.backdrop,
			show: true,
			keyboard: true
		});
		var h = {
			close: function() {
				$dlg.modal('hide');
				dh._activeDialog = false;
			},
			center: function() {
				center($dlg);
			}
		};
		$dlg.find(".modal-footer .btn").click(function(e) {
			e.preventDefault();
			var data = $(this).tmplItem().data;
			var btn = data.buttons[$(this).index()];
			if (spec["on-button"]) spec["on-button"](btn, h);
		});
		if (spec.resizable) {
			var $header = $dlg.find(".modal-header");
			var $body = $dlg.find(".modal-body");
			var $footer = $dlg.find(".modal-footer");
			var magicNr = 30;//$body.css("padding-top") + $body.css("padding-bottom");	//TODO??
			
			$body.css({
				"max-height": "none",
				"max-width": "none"
			});
			
			var onResize = function() {
				center($dlg);
				var h = $dlg.innerHeight() - $header.outerHeight() - $footer.outerHeight() - magicNr;
				$body.css("height", h);
			}
			
			$dlg.css({
				"max-height": "none",
				"max-width": "none",
				"min-height": $dlg.outerHeight()+"px",
				"min-width": $dlg.outerWidth()+"px"
			}).on("resize", onResize).resizable();
			if (spec.initSize) {
				$dlg.css({
					"width": spec.initSize[0]+"px",
					"height": spec.initSize[1]+"px"
				});
			}
			onResize();
		}
		if (spec["on-show"]) spec["on-show"](h, $dlg);
		dh._activeDialog = h;
		return h;
	};
	
	dh.folderSelector = function(spec) {
		var selectedFolder = false;
		var content = $("#mollify-tmpl-dialog-folderselector").tmpl({message: spec.message});
		var $selector = false;
		var loaded = {};
		
		var load = function($e, parent) {
			if (loaded[parent ? parent.id : "root"]) return;
			
			$selector.addClass("loading");
			mollify.filesystem.folders(parent).done(function(l) {
				$selector.removeClass("loading");
				loaded[parent ? parent.id : "root"] = true;
				
				if (!l || l.length === 0) {
					if ($e) $e.find(".mollify-folderselector-folder-indicator").empty();
					return;
				}
				
				var level = 0;
				var levels = [];
				if (parent) {
					var matches = parent.path.match(/\//g);
					if (matches) level = matches.length + 1;
					else level = 1;
					
					//generate array for template to iterate
					for(var i=0;i<level;i++) levels.push({});
				}
				var c = $("#mollify-tmpl-dialog-folderselector-folder").tmpl(l, {cls:(level === 0 ? 'root' : ''),levels:levels});
				if ($e) {
					$e.after(c);
					$e.addClass("loaded");
					if ($e) $e.find(".mollify-folderselector-folder-indicator").find("i").removeClass("icon-caret-right").addClass("icon-caret-down");
				} else {
					$selector.append(c);
				}
				if (!parent && l.length == 1) {
					load($(c[0]), l[0]);
				}
			});
		};
		
		dh.custom({
			title: spec.title,
			content: content,
			buttons: [
				{ id: "action", "title": spec.actionTitle, cls:"btn-primary" },
				{ id: "cancel", "title-key": "dialogCancel" }
			],
			"on-button": function(btn, d) {
				if (btn.id === 'action') {
					if (!selectedFolder || !spec.handler || !spec.handler.canSelect(selectedFolder)) return;	
				}
				d.close();
				if (btn.id === 'action') spec.handler.onSelect(selectedFolder);
				
			},
			"on-show": function(h, $dlg) {
				$selector = $dlg.find(".mollify-folderselector-tree");
				$selector.on("click", ".mollify-folderselector-folder-indicator", function(e) {
					var $e = $(this).parent();
					var p = $e.tmplItem().data;
					load($e, p);
					return false;
				});
				$selector.on("click", ".mollify-folderselector-folder", function(e) {
					var $e = $(this);
					var p = $(this).tmplItem().data;
					if (spec.handler.canSelect(p)) {
						selectedFolder = p;
						$(".mollify-folderselector-folder").removeClass("selected");
						$e.addClass("selected");
					}
				});
				load(null, null);
			}
		});
	};

	dh.tableView = function(o) {
		mollify.ui.dialogs.custom({
			resizable: true,
			initSize: [600, 400],
			title: o.title,
			content: mollify.dom.template("mollify-tmpl-tableview"),
			buttons: o.buttons,
			"on-button": function(btn, d) {
				o.onButton(btn, d);
			},
			"on-show": function(h, $d) {
				var $content = $d.find("#mollify-tableview-content");

				h.center();
				var table = mollify.ui.controls.table("mollify-tableview-list", {
					key: o.table.key,
					columns: o.table.columns,
					onRowAction: function(id, obj) {
						if (o.onTableRowAction) o.onTableRowAction(h, table, id, obj);
					}
				});

				o.onRender(h, $content, table);
			}
		});
	};
	
	/* DRAG&DROP */
	
	mollify.MollifyHTML5DragAndDrop = function() {
		var t = this;
		t.dragObj = false;
		t.dragEl = false;
		t.dragListener = false;
		
		var endDrag = function(e) {
			if (t.dragEl) {
				t.dragEl.removeClass("dragged");
				if (t.dragListener && t.dragListener.onDragEnd) t.dragListener.onDragEnd(t.dragEl, e);
				t.dragEl = false;
			}
			t.dragObj = false;
			t.dragListener = false;
		};
		
		$("body").bind('dragover', function(e) {
			if (e.preventDefault) e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = "none";
			return false;
		});

		// preload drag images		
		setTimeout(function(){
			var dragImages = [];
			for (var key in mollify.settings.dnd.dragimages) {
				if (!mollify.settings.dnd.dragimages.hasOwnProperty(key)) continue;
				var img = mollify.settings.dnd.dragimages[key];
				if (!img) continue;
				if (dragImages.indexOf(img) >= 0) continue;
				dragImages.push(img);
			}
			if (dragImages) mollify.ui.preloadImages(dragImages);
		}, 0);
		
		var api = {
			enableDragToDesktop: function(item, e) {
				if (!item) return;
				var info = mollify.getItemDownloadInfo(item);
				if (info) e.originalEvent.dataTransfer.setData('DownloadURL',['application/octet-stream', info.name, info.url].join(':'));
			},
				
			enableDrag : function($e, l) {
				$e.attr("draggable","true").bind('dragstart', function(e) {
					t.dragObj = false;
					e.originalEvent.dataTransfer.effectAllowed = "none";
					if (!l.onDragStart) return false;
					
					t.dragObj = l.onDragStart($(this), e);
					if (!t.dragObj) return false;
					
					var dragImageType = t.dragObj.type;
					
					if (t.dragObj.type == 'filesystemitem') {
						var pl = t.dragObj.payload;
						if (!window.isArray(pl) || pl.length == 1) {
							var item = window.isArray(pl) ? pl[0] : pl;
							
							if (!item.is_file) dragImageType = "filesystemitem-folder";
							else dragImageType = "filesystemitem-file";
						} else {
							dragImageType = "filesystemitem-many";
						}
						api.enableDragToDesktop(pl, e);
					}
					t.dragEl = $(this);
					t.dragListener = l;
					t.dragEl.addClass("dragged");
					e.originalEvent.dataTransfer.effectAllowed = "copyMove";

					if (mollify.settings.dnd.dragimages[dragImageType]) {
						var img = document.createElement("img");
						img.src = mollify.settings.dnd.dragimages[dragImageType];
						e.originalEvent.dataTransfer.setDragImage(img, 0, 0);
					}
					return;
				}).bind('dragend', function(e) {
					endDrag(e);
				});
			},
			enableDrop : function($e, l) {
				$e.addClass("droppable").bind('drop', function(e) {
					if (e.stopPropagation) e.stopPropagation();
					if (!l.canDrop || !l.onDrop || !t.dragObj) return;
					var $t = $(this);
					if (l.canDrop($t, e, t.dragObj)) {
						l.onDrop($t, e, t.dragObj);
						$t.removeClass("dragover");
					}
					endDrag(e);
				}).bind('dragenter', function(e) {
					if (!l.canDrop || !t.dragObj) return false;
					var $t = $(this);
					if (l.canDrop($t, e, t.dragObj)) {
						$t.addClass("dragover");
					}
				}).bind('dragover', function(e) {
					if (e.preventDefault) e.preventDefault();
					
					var fx = "none";
					if (l.canDrop && l.dropType && t.dragObj) {
						var $t = $(this);
						if (l.canDrop($t, e, t.dragObj)) {
							var tp = l.dropType($t, e, t.dragObj);
							if (tp) fx = tp;
						}
					}
					
					e.originalEvent.dataTransfer.dropEffect = fx;
					return false;
				}).bind('dragleave', function(e) {
					var $t = $(this);
					$t.removeClass("dragover");
					t.dragTarget = false;
				});
			}
		};
		return api;
	};

	mollify.MollifyJQueryDragAndDrop = function() {
		return {
			enableDragToDesktop: function (item, e) {
				//not supported
			},
			
			enableDrag : function($e, l) {
				$e.draggable({
					revert: "invalid",
					distance: 10,
					addClasses: false,
					zIndex: 2700,
					start: function(e) {
						if (l.onDragStart) l.onDragStart($(this), e);
					}
				});
			}
		};
	};
	
	mollify.ZeroClipboard = function(cb) {
		if (!cb || !window.ZeroClipboard) return false;
		window.ZeroClipboard.setDefaults({
			moviePath: 'js/lib/ZeroClipboard.swf',
			hoverClass: 'hover',
			activeClass: 'active',
			forceHandCursor: true
		});
		
		var $testclip = $('<div id="zeroclipboard-test" style="width=0px; height=0px;"></div>').appendTo($("body"));
		var clip = new window.ZeroClipboard($testclip[0]);
		clip.on('load', function(client) {
			var api = {
				enableCopy : function($e, text, l) {
					var clip = $e.data("mollify-zeroclipboard");
					if (!clip) {
						clip = new window.ZeroClipboard($e);
						$e.data("mollify-zeroclipboard", clip);
						if (l) $e.data("mollify-zeroclipboard-listener", l);
					}
					if (text) $e.data("mollify-zeroclipboard-text", text);
				}
			};
			cb(api);
		});
		clip.on('dataRequested', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			var copied = false;
			if (l && l.onGetText)
				copied = l.onGetText($t);
			if (!copied)
				copied = $t.data("mollify-zeroclipboard-text");
			if (copied) clip.setText(copied);
		});
		clip.on('mouseover', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onMouseOver) l.onMouseOver($t, clip);
		});
		clip.on('mouseout', function() {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onMouseOut) l.onMouseOut($t);
		});
		clip.on('complete', function(client, args) {
			var $t = $(this);
			var l = $t.data("mollify-zeroclipboard-listener");
			if (l && l.onCopy) l.onCopy($t, args.text);
		});
	};
}(window.jQuery, window.mollify);
