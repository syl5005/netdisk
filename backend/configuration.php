<?php
     $CONFIGURATION = array(
         "db" => array(
            "type" => "mysql",
             "host" => "localhost",
             "database" => "mollify",
             "user" => "root",
             "password" => "syl5005",
             "table_prefix" => "mollify_"
         ),
		 "plugins" => array(
                        "Share" => array(
                                "uploader" => "PATH_TO_PUBLIC_UPLOADER"         // optional
                        )
                )


     );
?>