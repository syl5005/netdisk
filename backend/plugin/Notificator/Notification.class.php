<?php

	/**
	 * Notification.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	
	class Notification {
		private $id;
		private $name;
		private $title;
		private $msg;
		private $recipients;

		public function __construct($id, $name, $title, $msg, $recipients) {
			$this->id = $id;
			$this->name = $name;
			$this->title = $title;
			$this->msg = $msg;
			$this->recipients = $recipients;
		}

		public function id() {
			return $this->id;
		}

		public function getName() {
			return $this->name;
		}

		public function getTitle() {
			return $this->title;
		}
		
		public function getMessage() {
			return $this->msg;
		}
		
		public function getRecipients() {
			return $this->recipients;
		}
		
		public function __toString() {
			return "Notification [".$this->id."]";
		}
	}
?>