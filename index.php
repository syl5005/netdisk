<?php
$a=3;

?>
<!DOCTYPE html>
<html>
	<head>
		<title>��哈哈特点</title>		
		<meta http-equiv="content-type" content="text/html; charset=UTF-8">
		<meta http-equiv="X-UA-Compatible" content="IE=Edge">
		
		<link rel="stylesheet" href="css/mollify.css">

		<!-- "Full" includes mollify, jQuery and all the other libs required -->
		<!--script type="text/javascript" language="javascript" src="js/mollify.full.min.js"></script-->
		<!-- If you don't want to use full package, you can load them separately -->
		<script type="text/javascript" language="javascript" src="js/lib/jquery.min.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/json.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/jquery.tmpl.min.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/jquery-ui.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/jquery-file-uploader.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/jquery-singledoubleclick.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/bootstrap.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/bootstrap-lightbox.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/bootstrap-datetimepicker.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/ZeroClipboard.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/modernizr.js"></script>
		<script type="text/javascript" language="javascript" src="js/lib/date.js"></script>
		<script type="text/javascript" language="javascript" src="js/mollify.js"></script>
		
		<script type="text/javascript">
			$(document).ready(function(){	
				mollify.App.init({
					"language": {default: "zh"},
					"list-view-columns": {
						"name": { width: 250 },
						"type": {},
						"size": {},
						"share-info": {},
						"file-modified": { width: 150 },}
					}, [
						new mollify.plugin.ItemDetailsPlugin({
							"jpg,tiff": {
								"last-modified" : {},
								"size": {},
								"exif": {},
							},
							"*": {
								"last-modified" : {},
								"size": {}
							}
						}),
						new mollify.plugin.FileViewerEditorPlugin()
						,new mollify.plugin.DropboxPlugin()
						,new mollify.plugin.SharePlugin()
						
					]
				);
			});
		</script>
	</head>

	<body>
		<div id="mollify"></div>
	</body>
</html>
