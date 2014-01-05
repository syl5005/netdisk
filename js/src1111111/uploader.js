/**
 * uploader.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;

	mollify.MollifyHTML5Uploader = function() {
		var t = this;
		
		// prevent default file drag&drop		
		$(document).bind('drop dragover', function (e) {
			e.preventDefault();
			return false;
		});
		
		/*this.open = function(folder) {
			var $d = mollify.dom.template("mollify-tmpl-uploader-dlg");
			mollify.ui.dialogs.custom({
				element: $d,
				"title-key": 'fileUploadDialogTitle',
				buttons: [
					{ id:0, "title-key": "upload" },
					{ id:1, "title-key": "cancel" }
				],
				"on-button": function(btn, dlg) {
					if (btn.id == 1)
						dlg.close();
					else t.onUpload($d, dlg,folder);
				},
				"on-show": function(dlg) { t.onOpen($d, dlg, folder); }
			});
		};*/
		
		/*this.onOpen = function($d, dlg, folder) {
			//var $form = $d.find(".mollify-uploader-form");//.attr("action", );
			var $input = $d.find("input").on('change', function() {
				//if (!this.files || this.files.length == 0) return;
				//if (this.files.length == 1) alert(this.files[0].name);
				//else alert(this.files.length);
			}).fileupload({
				url: mollify.service.url("filesystem/"+folder.id+'/files/'),
				dataType: 'json',
				dropZone: $d.find(".mollify-uploader").bind("dragover", function(e) { e.stopPropagation(); }),
				drop: function (e, data) {
					alert('Dropped: ' + data.files.length);	//TODO
				},
				progressall: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					console.log(progress);	//TODO
				},
				done: function(e, data) {
	
				}
			});	
		};*/
		
		this._getUploaderSettings = function() {
			return mollify.settings["html5-uploader"] || {};	
		};
		
		this._initDropZoneEffects = function($e) {
			$e.bind('dragover', function (e) {
				e.stopPropagation();
				var dropZone = $e
				var timeout = window.dropZoneTimeout;
				
				if (!timeout)
					dropZone.addClass('in');
				else
					clearTimeout(timeout);

				if (e.target === dropZone[0])
					dropZone.addClass('hover');
				else
					dropZone.removeClass('hover');

				window.dropZoneTimeout = setTimeout(function () {
					window.dropZoneTimeout = null;
					dropZone.removeClass('in hover');
				}, 100);
			});
		};
		
		this.initWidget = function($e, o) {
			var $d = mollify.dom.template("mollify-tmpl-uploader-widget").appendTo($e);
			mollify.ui.handlers.localize($e);
			var $dropZone = o.dropElement || $e;
			var started = false;
			var l = o.handler;
			
			var $input = $d.find("input").fileupload($.extend({
				url: o.url,
				dataType: 'json',
				dropZone: $dropZone,
				add: function (e, data) {
					if (!started && l.start)
						l.start(data.originalFiles, function() {
							data.submit();
						});
					else
						data.submit();
					started = true;
				},
				progressall: function (e, data) {
					if (!l.progress) return;
					
					var progress = parseInt(data.loaded / data.total * 100, 10);
					l.progress(progress, data.bitrate || false);
				},
				done: function(e, data) {					
					if (l.finished) l.finished();
					started = false;
				},
				fail: function(e, data) {
					if (l.failed) l.failed();
					started = false;
				}
			}, t._getUploaderSettings()));
			
			if ($dropZone) t._initDropZoneEffects($dropZone);
		};
		
		return {
			initUploadWidget : function($e, o) {
				mollify.templates.load("mollify-uploader", mollify.templates.url("uploader.html")).done(function() {
					t.initWidget($e, o);
				});
			},
			initDragAndDropUploader : function(h) {
				var $p = h.container;
				var $container = $('<div style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo($p);
				var $form = $('<form enctype="multipart/form-data"></form>').appendTo($container);
				var started = false;
				var $dndUploader = $('<input type="file" class="mollify-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"></input>').appendTo($form).fileupload($.extend({
					url: '',
					dataType: 'json',
					dropZone: h.dropElement,
					add: function (e, data) {
						if (!started && h.handler.start)
							h.handler.start(data.originalFiles, function() {
								data.submit();
							});
						else
							data.submit();
						started = true;
					},
					progressall: function (e, data) {
						if (!h.handler.progress) return;
						
						var progress = parseInt(data.loaded / data.total * 100, 10);
						h.handler.progress(progress, data.bitrate || false);
					},
					done: function(e, data) {
						if (h.handler.finished) h.handler.finished();
						started = false
					},
					fail: function(e, data) {
						if (h.handler.failed) h.handler.failed();
						started = false
					}
				}, t._getUploaderSettings())).fileupload('disable');
				t._initDropZoneEffects(h.dropElement);
				
				return {
					destroy: function() {
						if ($dndUploader) $dndUploader.fileupload("destroy");
						$dndUploader = false;
					},
					setUrl : function(url) {
						if (!$dndUploader) return;
						if (!url) {
							$dndUploader.fileupload('disable');
							return;
						}
						$dndUploader.fileupload('enable').fileupload('option', 'url', url);
					}
				};
			}
		};
	}
}(window.jQuery, window.mollify);