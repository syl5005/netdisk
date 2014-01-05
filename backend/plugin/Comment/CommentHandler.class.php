<?php

	/**
	 * CommentHandler.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	require_once("dao/CommentDao.class.php");
	
	class CommentHandler {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;			
		}
				
		public function getDetail($item, $key) {
			return $this->getDao()->getCommentCount($item);
		}
		
		public function getItemContextData($item, $details, $key, $data) {
			return array(
				"count" => $this->getDao()->getCommentCount($item)
			);
		}
		
		public function onEvent($e) {
			if (strcmp(FilesystemController::EVENT_TYPE_FILE, $e->type()) != 0) return;
			$type = $e->subType();			
			if ($type === FileEvent::DELETE)
				$this->getDao()->deleteComments($e->item());
		}
		
		public function getCommentCount($item) {
			return $this->getDao()->getCommentCount($item);
		}

		public function getComments($item) {
			return $this->getDao()->getComments($item);
		}
		
		public function addComment($user, $item, $comment) {
			$this->getDao()->addComment($user, $item, time(), $comment);
		}
		
		public function removeComment($item, $commentId) {
			$user = $this->env->session()->userId();
			if ($this->env->authentication()->isAdmin()) $user = NULL;
			$this->getDao()->removeComment($item, $commentId, $user);
		}
						
		public function getRequestData($parent, $items, $key, $dataRequest) {
			if ($parent != NULL)
				return $this->getDao()->getCommentCountForChildren($parent);
			
			//not under same parent, get comment count for each item separately
			return $this->getDao()->getCommentCountForItems($items);
		}
		
		private function getDao() {
			return new CommentDao($this->env);
		}
				
		public function __toString() {
			return "CommentHandler";
		}
	}
?>