<?php

	/**
	 * EventHandler.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class EventHandler {
		private $listeners = array();
		private $types = array();
		private $env;

		public function __construct($env) {
			$this->env = $env;
		}
		
		public function register($type, $listener) {
			if (Logging::isDebug()) Logging::logDebug("EVENT HANDLER: registering '".$type."': ".get_class($listener));
			
			if (!array_key_exists($type, $this->listeners)) $this->listeners[$type] = array();
			$list = $this->listeners[$type];
			$list[] = $listener;
			$this->listeners[$type] = $list;
		}
		
		public function registerEventType($type, $subType, $name) {
			$this->types[$type."/".$subType] = $name;
		}
		
		public function onEvent($e) {
			if ($this->env->authentication()->isAuthenticated()) {
				$e->setUser(array(
					'user_id' => $this->env->session()->userId(),
					'username' => $this->env->session()->username(),
				));
			} else {
				$e->setUser(NULL);
			}

			$e->setIp($this->env->request()->ip());
			
			if (Logging::isDebug()) Logging::logDebug("EVENT HANDLER: onEvent: '".$e->type()."'");
			
			foreach($this->listeners as $type => $listeners) {
				if (strcasecmp($type, '*') == 0 or strpos($e->typeId(), $type) === 0) {
					foreach($listeners as $listener)
						$listener->onEvent($e);
				}
			}	
		}
		
		public function getTypes() {
			return $this->types;
		}
		
		public function __toString() {
			return "EventHandler";
		}
	}
	
	abstract class Event {
		private $time;
		protected $user = NULL;
		protected $ip = NULL;
		private $type;
		private $subType;
		
		public function __construct($time, $type, $subType) {
			$this->time = $time;
			$this->type = $type;
			$this->subType = $subType;
		}

		public function time() {
			return $this->time;
		}

		public function user() {
			return $this->user;
		}

		public function ip() {
			return $this->ip;
		}
						
		public function type() {
			return $this->type;
		}

		public function subType() {
			return $this->subType;
		}
		
		public function typeId() {
			return $this->type."/".$this->subType;
		}
				
		public function itemToStr() { return ""; }
		
		public function details() { return ""; }
		
		public function setUser($user) {
			$this->user = $user;
		}
		
		public function setIp($ip) {
			$this->ip = $ip;
		}
		
		public function values($formatter) {
			$values = array(
				"ip" => $this->ip(),
				"event_type" => $this->typeId(),
				"event_main_type" => $this->type,
				"event_sub_type" => $this->subType,
				"event_time" => $formatter->formatDateTime($this->time)
			);
			if ($this->user != NULL) {
				$values["user_id"] = $this->user["user_id"];
				$values["username"] = $this->user["username"];
			}
			return $values;
		}
		
		public function __toString() {
			return "Event ".$this->typeId();
		}
	}
?>