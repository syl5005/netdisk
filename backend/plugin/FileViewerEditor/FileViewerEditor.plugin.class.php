<?php

	/**
	 * FileViewerEditor.plugin.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class FileViewerEditor extends PluginBase {
		private $controller;
		
		public function setup() {
			$preview = $this->getSetting('enable_file_preview', TRUE);
			$view = $this->getSetting('enable_file_view', TRUE);
			$edit = $this->getSetting('enable_file_edit', TRUE);
			if (!$preview and !$view and !$edit) return;
			
			if ($view)
				$this->addService("view", "FileViewerEditorServices");
			if ($preview)
				$this->addService("preview", "FileViewerEditorServices");
			if ($edit)
				$this->addService("edit", "FileViewerEditorServices");
			
			require_once("FileViewerEditorController.class.php");
			
			$this->controller = new FileViewerEditorController($this, $view, $preview, $edit);
			$this->env->filesystem()->registerItemContextPlugin("plugin-fileviewereditor", $this->controller);
		}
		
		public function getController() {
			return $this->controller;
		}
		
		public function __toString() {
			return "FileViewerEditorPlugin";
		}
	}
?>