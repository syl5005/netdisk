<?php

	/**
	 * FileViewerEditorServices.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class FileViewerEditorServices extends ServicesBase {
		protected function isValidPath($method, $path) {
			return count($path) > 1;
		}
		
		public function processGet() {
			$item = $this->item($this->path[0]);
			
			if ($this->id === 'preview') {
				if ($this->path[1] === 'info') {
					$this->response()->success($this->env->plugins()->getPlugin("FileViewerEditor")->getController()->getPreview($item));
					return;
				}
				if ($this->path[1] === 'content') {
					$this->env->filesystem()->view($item);
					return;
				}
			} else if ($this->id === 'view') {
				if ($this->path[1] === 'data') {
					$this->env->plugins()->getPlugin("FileViewerEditor")->getController()->processDataRequest($item, array_slice($this->path, 2));
					return;
				}
				if ($this->path[1] === 'content') {
					$this->env->filesystem()->view($item);
					return;
				}
			} else if ($this->id === 'edit') {
				$this->env->plugins()->getPlugin("FileViewerEditor")->getController()->processEditRequest($item, array_slice($this->path, 1));
				return;
			}
			throw $this->invalidRequestException();
		}
		
		public function __toString() {
			return "FileViewerServices";
		}
	}
?>