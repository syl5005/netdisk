<?php

	/**
	 * InstallerAuthentication.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	require_once("include/Authentication.class.php");
	
	class InstallerAuthentication extends Authentication {
		public function __construct($env) {
			parent::__construct($env);
		}
	}
?>