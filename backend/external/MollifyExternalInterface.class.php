<?php

	/**
	 * MollifyExternalInterface.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	require_once("configuration.php");
	global $CONFIGURATION;
	if (!isset($CONFIGURATION)) die("Mollify not configured");
	
	function MollifyExternalInterface() {
		global $CONFIGURATION;
		return new MollifyExternalInterface($CONFIGURATION);
	}

	class VoidResponseHandler {
		public function addListener($l) {}
	}
	
	class MollifyExternalInterface {
		private $configuration;
		private $settings;
		private $authentication;
		private $session;
		
		public function __construct($conf) {
			require_once("include/Settings.class.php");
			require_once("include/session/Session.class.php");
			require_once("include/ServiceEnvironment.class.php");
			require_once("include/Util.class.php");
			require_once("db/DBConnectionFactory.class.php");
			require_once("include/configuration/ConfigurationDao.class.php");
			require_once("include/Logging.class.php");
			require_once("include/Version.info.php");
			require_once("include/Cookie.class.php");
			require_once("include/Features.class.php");
			require_once("include/Request.class.php");
		
			Logging::initialize($conf);

			$this->settings = new Settings($conf);
			$this->session = new Session(TRUE);
			
			$f = new DBConnectionFactory();
			$db = $f->createConnection($this->settings);
			$this->configuration = new ConfigurationDao($db);

			$env = new ServiceEnvironment($db, $this->session, new VoidResponseHandler(), $this->configuration, $this->settings);
			$env->initialize(new Request(TRUE));
			$this->authentication = $env->authentication();
		}

		public function logout() {
			$this->authentication->logout();
			$this->session->end();
		}
				
		public function authenticate($userId) {
			$this->authentication->setAuth($this->getUser($userId));
		}
		
		public function isAuthenticated() {
			return $this->authentication->isAuthenticated();
		} 
		
		public function getUserId() {
			return $this->session->userId();
		}

		public function getUsername() {
			return $this->session->username();
		}

		public function getAllUsers() {
			return $this->configuration->getAllUsers();
		}
		
		public function getUser($id) {
			return $this->configuration->getUser($id);
		}
		
		public function addUser($name, $pw, $email, $defaultPermission = "RO", $expiration = NULL) {
			return $this->configuration->addUser($name, $pw, $email, $defaultPermission, $expiration);
		}
		
		public function removeUser($id) {
			return $this->configuration->removeUser($id);
		}
		
		public function addFolder($name, $path) {
			return $this->configuration->addFolder($name, $path);
		}
		
		public function addUserFolder($userId, $folderId, $name = NULL) {
			return $this->configuration->addUserFolder($userId, $folderId, $name);
		}
		
		public function addItemPermission($id, $permission, $userId) {
			return $this->configuration->addItemPermission($id, $permission, $userId);
		}
	}
?>