<?php

	/**
	 * page_current_installed.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	 include("install/installation_page.php");
	 
	 function version($ver) {
	 	return str_replace("_", ".", $ver);
	 }
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">

<html>
	<?php pageHeader("Mollify Update"); ?>
	
	<body id="page-mysql-current-installed">
		<?php pageBody("Update"); ?>
		<div class="content">
			<h2>No update is required.</h2>	
		</div>
		<?php pageFooter(); ?>
	</body>
</html>