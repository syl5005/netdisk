<?php

	/**
	 * PreviewerBase.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	abstract class PreviewerBase {
		protected $env;
		protected $id;
		
		public function __construct($env, $id) {
			$this->env = $env;
			$this->id = $id;
		}
		
		public function getPreview($item) {
			return array("html" => $this->getPreviewHtml($item));
		}
		
		protected abstract function getPreviewHtml($item);
		
		protected function response() {
			return $this->env->response();
		}
		
		public function getUrl($item) {
			return $this->env->getServiceUrl("preview", array($item->id(), "info"), TRUE);
		}
				
		public function getContentUrl($item) {
			return $this->env->getServiceUrl("preview", array($item->id(), "content"), TRUE);
		}
		
		public function getSettings() {
			return $this->env->getViewerSettings($this->id);
		}
		
		protected function invalidRequestException($details = NULL) {
			return new ServiceException("INVALID_REQUEST", "Invalid ".get_class($this)." request: ".strtoupper($this->env->request()->method())." ".$this->env->request()->URI().($details != NULL ? (" ".$details): ""));
		}
	}
?>