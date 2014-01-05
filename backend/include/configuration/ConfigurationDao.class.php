<?php

	/**
	 * ConfigurationDao.class.php
	 *
	 * Copyright 2008- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */
	 
	 // TODO split this class into separate UserDao, FolderDao etc

	class ConfigurationDao {
		protected $db;
		protected $env;
		
		public function __construct($db) {
			$this->db = $db;
		}
		
		function initialize($env) {
			$this->env = $env;
		}
		
		public function internalTimestampFormat() {
			return "YmdHis";
		}
		
		public function formatTimestampInternal($ts) {
			return date($this->internalTimestampFormat(), $ts);
		}

		public function createTimestampFromInternal($val) {
			$str = "".$val;
			$str = sprintf("%s-%s-%s %s:%s:%s", substr($val, 0, 4), substr($val, 4, 2), substr($val, 6, 2), substr($val, 8, 2), substr($val, 10, 2), substr($val, 12, 2));
			$ts = strtotime($str);
			//Logging::logDebug("ts ".$val." => ".date("Y-m-d H:i:s", $ts));
			return $ts;
		}
		
		public function getInstalledVersion() {
			return $this->db->query("SELECT value FROM ".$this->db->table("parameter")." WHERE name='version'")->value();
		}
		
		public function checkProtocolVersion($version) {}
	
		//�û��Ƿ���ڻ����ظ�
		public function findUser($username, $allowEmail = FALSE, $expiration = FALSE) {
			$expirationCriteria = $expiration ? " AND (expiration is null or expiration > ".$this->formatTimestampInternal($expiration).")" : "";
  
			if ($allowEmail) {
				$result = $this->db->query(sprintf("SELECT id, name, lang, email FROM ".$this->db->table("user")." WHERE (name='%s' or email='%s')".$expirationCriteria, $this->db->string($username), $this->db->string($username)));
			} else {
				$result = $this->db->query(sprintf("SELECT id, name, lang, email FROM ".$this->db->table("user")." WHERE name='%s'".$expirationCriteria, $this->db->string($username)));
			}
			$matches = $result->count();
			
			if ($matches === 0) {
				Logging::logError("No user found with name [".$username."]");
				return NULL;
			}
			
			if ($matches > 1) {
				Logging::logError("Duplicate user found with name [".$username."] and password");
				return FALSE;
			}
			
			return $result->firstRow();
		}
		
		public function getUserAuth($id) {
			return $this->db->query(sprintf("SELECT user_id, type, hash, salt FROM ".$this->db->table("user_auth")." WHERE user_id=%s", $this->db->string($id, TRUE)))->firstRow();
		}
		
		public function storeUserAuth($id, $username, $type, $pw) {
			$this->db->startTransaction();
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_auth")." WHERE user_id=%s", $this->db->string($id, TRUE)));
			
			$hash = $this->env->passwordHash()->createHash($pw);
			$a1hash = md5($username.":".$this->env->authentication()->realm().":".$pw);
			
			$this->db->update(sprintf("INSERT INTO ".$this->db->table("user_auth")." (user_id, type, hash, salt, a1hash) VALUES (%s, %s, %s, %s, %s)", $this->db->string($id, TRUE), $this->db->string($type, TRUE), $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE)));
			$this->db->commit();
		}
		
		public function updateUserAuth($id, $username, $pw, $type=FALSE) {
			$hash = $this->env->passwordHash()->createHash($pw);
			$a1hash = md5($username.":".$this->env->authentication()->realm().":".$pw);
			if ($type !== FALSE)
				$this->db->update(sprintf("UPDATE ".$this->db->table("user_auth")." SET hash=%s, salt=%s, a1hash=%s, type=%s WHERE user_id=%s", $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE), $this->db->string($type, TRUE), $this->db->string($id, TRUE)));
			else
				$this->db->update(sprintf("UPDATE ".$this->db->table("user_auth")." SET hash=%s, salt=%s, a1hash=%s WHERE user_id=%s", $this->db->string($hash["hash"], TRUE), $this->db->string($hash["salt"], TRUE), $this->db->string($a1hash, TRUE), $this->db->string($id, TRUE)));
		}
		
		public function updateUserAuthType($id, $type) {
			$this->db->update(sprintf("UPDATE ".$this->db->table("user_auth")." SET type=%s WHERE user_id=%s", $this->db->string($type, TRUE), $this->db->string($id, TRUE)));
		}
		
		public function getUserLegacyPw($id) {
			return $this->db->query(sprintf("SELECT password FROM ".$this->db->table("user")." WHERE id=%s", $this->db->string($id, TRUE)))->value();
		}
		
		public function getUserByName($username, $expiration = FALSE) {
			$expirationCriteria = $expiration ? " AND (expiration is null or expiration > ".$this->formatTimestampInternal($expiration).")" : "";
			
			$result = $this->db->query(sprintf("SELECT id, name, lang, email FROM ".$this->db->table("user")." WHERE name='%s' and is_group=0".$expirationCriteria, $this->db->string($username)));
			$matches = $result->count();
			
			if ($matches === 0) {
				Logging::logError("No user found with name [".$username."]");
				return NULL;
			}
			
			if ($matches > 1) {
				Logging::logError("Duplicate user found with name [".$username."]");
				return FALSE;
			}
			
			return $result->firstRow();
		}

		public function getUserByNameOrEmail($name) {
			$result = $this->db->query(sprintf("SELECT id, name, lang, email FROM ".$this->db->table("user")." WHERE (name='%s' or email='%s') and is_group=0", $this->db->string($name), $this->db->string($name)));
			$matches = $result->count();
			
			if ($matches === 0) {
				Logging::logError("No user found with name or email[".$name."]");
				return NULL;
			}
			
			if ($matches > 1) {
				Logging::logError("Duplicate user found with name or email [".$name."]");
				return FALSE;
			}
			
			return $result->firstRow();
		}
		
		public function getAllUsers($groups = FALSE) {
			return $this->db->query("SELECT id, name, lang, email, permission_mode, expiration, is_group FROM ".$this->db->table("user")." where ".($groups ? "1=1" : "is_group = 0")." ORDER BY id ASC")->rows();
		}

		public function getUser($id, $expiration = FALSE) {
			$expirationCriteria = $expiration ? " AND (expiration is null or expiration > ".$this->formatTimestampInternal($expiration).")" : "";
			
			return $this->db->query(sprintf("SELECT id, name, lang, email, permission_mode, expiration FROM ".$this->db->table("user")." WHERE id='%s'".$expirationCriteria, $this->db->string($id)))->firstRow();
		}
		
		public function userQuery($rows, $start, $criteria, $sort = NULL) {
			$strFields = array("name", "email");
			$likeFields = array("name", "email");
			
			$db = $this->env->db();
			$query = "from ".$db->table("user")." where 1=1";
			
			foreach($criteria as $k => $v) {
				if (!in_array($k, $strFields)) {
					$query .= " and ".$k."=".$this->db->string($v);
				} else {
					if (!in_array($k, $likeFields)) {
						$query .= " and ".$k."=".$this->db->string($v, TRUE);
					} else {
						$query .= " and ".$k." like ".$this->db->string($v, TRUE);
					}
				}

			}
			
			$query .= ' order by ';
			if ($sort != NULL) {				
				$query .= $sort["id"].' '.($sort["asc"] == TRUE ? "asc" : "desc");
			} else {
				$query .= ' id asc';
			}
			
			$count = $db->query("select count(id) ".$query)->value(0);
			$result = $db->query("select id, name, lang, email, permission_mode, expiration, is_group ".$query." limit ".$rows." offset ".$start)->rows();
			
			return array("start" => $start, "count" => count($result), "total" => $count, "data" => $result);
		}
		
		public function addUser($name, $lang, $email, $permission, $expiration) {
			if (isset($email) and strlen($email) > 0)
				$matches = $this->db->query(sprintf("SELECT count(id) FROM ".$this->db->table("user")." WHERE (name='%s' or email='%s') and is_group=0", $this->db->string($name), $this->db->string($email)))->value();
			else
				$matches = $this->db->query(sprintf("SELECT count(id) FROM ".$this->db->table("user")." WHERE name='%s' and is_group=0", $this->db->string($name)))->value();
			
			if ($matches > 0)
				throw new ServiceException("INVALID_REQUEST", "Duplicate user found with name [".$name."] or email [".$email."]");

			$this->db->update(sprintf("INSERT INTO ".$this->db->table("user")." (name, lang, email, permission_mode, is_group, expiration) VALUES (%s, %s, %s, %s, 0, %s)", $this->db->string($name, TRUE), $this->db->string($lang, TRUE), $this->db->string($email, TRUE), $this->db->string($permission, TRUE), $this->db->string($expiration)));
			return $this->db->lastId();
		}
	
		public function updateUser($id, $name, $lang, $email, $permission, $expiration, $description = NULL) {
			$affected = $this->db->update(sprintf("UPDATE ".$this->db->table("user")." SET name='%s', lang=%s, email=%s, permission_mode='%s', expiration=%s, description='%s' WHERE id='%s'", $this->db->string($name), $this->db->string($lang, TRUE), $this->db->string($email, TRUE), $this->db->string($permission), $this->db->string($expiration), $this->db->string($description), $this->db->string($id)));
			return TRUE;
		}
		
		public function removeUser($userId, $transaction = FALSE) {
			$id = $this->db->string($userId);

			if (!$transaction) $this->db->startTransaction();
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_folder")." WHERE user_id='%s'", $id));
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_group")." WHERE user_id='%s'", $id));
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_permission")." WHERE user_id='%s'", $id));
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_auth")." WHERE user_id='%s'", $id));
			$affected = $this->db->update(sprintf("DELETE FROM ".$this->db->table("user")." WHERE id='%s'", $id));
			if ($affected === 0)
				throw new ServiceException("INVALID_REQUEST", "Invalid delete user request, user ".$id." not found");
			if (!$transaction) $this->db->commit();					
			return TRUE;
		}
		
		public function removeUsers($ids) {
			$this->db->startTransaction();
			foreach($ids as $id) $this->removeUser($id, TRUE);
			$this->db->commit();
			return TRUE;
		}

		public function getAllUserGroups() {
			return $this->db->query("SELECT id, name, description, is_group FROM ".$this->db->table("user")." where is_group = 1 ORDER BY id ASC")->rows();
		}

		public function getUserGroup($id) {
			return $this->getUser($id);
		}

		public function getUsersGroups($userId) {
			return $this->db->query("select id, name, description from ".$this->db->table("user")." where id in (SELECT user_group.group_id FROM ".$this->db->table("user")." as user, ".$this->db->table("user_group")." as user_group where user_group.user_id = user.id and user.id = '".$this->db->string($userId)."') ORDER BY id ASC")->rows();
		}
		
		public function addUsersGroups($userId, $groupIds) {
			$this->db->startTransaction();
			foreach($groupIds as $id) {
				$this->db->update("INSERT INTO ".$this->db->table("user_group")." (group_id, user_id) VALUES (".$this->db->string($id).",".$this->db->string($userId).")");
			}
			$this->db->commit();
			return TRUE;
		}
		
		public function removeUsersGroups($userId, $groupIds) {
			$this->db->update("DELETE FROM ".$this->db->table("user_group")." where group_id in (".$this->db->arrayString($groupIds).") and user_id=".$this->db->string($userId, TRUE));
			return TRUE;
		}

		public function getGroupUsers($id) {
			return $this->db->query("SELECT user.id as id, user.name as name, user.lang as lang, user.permission_mode, user.email as email FROM ".$this->db->table("user")." as user, ".$this->db->table("user_group")." as user_group where user_group.user_id = user.id and user_group.group_id = '".$this->db->string($id)."' ORDER BY user.id ASC")->rows();
		}

		public function addGroupUsers($groupId, $userIds) {
			$this->db->startTransaction();
			foreach($userIds as $id) {
				$this->db->update("INSERT INTO ".$this->db->table("user_group")." (group_id, user_id) VALUES (".$this->db->string($groupId).",".$this->db->string($id).")");
			}
			$this->db->commit();
			return TRUE;
		}

		public function removeGroupUsers($groupId, $userIds = NULL) {
			if ($userIds == NULL) $this->db->update("DELETE FROM ".$this->db->table("user_group")."  WHERE group_id = '".$this->db->string($groupId)."'");
			else $this->db->update("DELETE FROM ".$this->db->table("user_group")." WHERE group_id = '".$this->db->string($groupId)."' and user_id in (".$this->db->arrayString($userIds).")");
			return TRUE;
		}
		
		public function addUserGroup($name, $description) {
			$matches = $this->db->query(sprintf("SELECT count(id) FROM ".$this->db->table("user")." WHERE name='%s' and is_group=1", $this->db->string($name)))->value();
			if ($matches > 0)
				throw new ServiceException("INVALID_REQUEST", "Duplicate group found with name [".$name."]");

			$this->db->update(sprintf("INSERT INTO ".$this->db->table("user")." (name, description, permission_mode, is_group) VALUES ('%s', '%s', NULL, 1)", $this->db->string($name), $this->db->string($description)));
			return $this->db->lastId();
		}

		public function updateUserGroup($id, $name, $description) {
			return $this->updateUser($id, $name, NULL, NULL, NULL, NULL, $description);
		}
		
		public function removeUserGroup($id) {
			$this->db->startTransaction();
			$this->removeGroupUsers($id);
			$this->removeUser($id);
			$this->db->commit();
			return TRUE;
		}
	
		public function getFolders() {
			return $this->db->query("SELECT id, name, path FROM ".$this->db->table("folder")." ORDER BY id ASC")->rows();
		}

		public function getFolder($id) {
			return $this->db->query(sprintf("SELECT id, name, path FROM ".$this->db->table("folder")." where id='%s'", $this->db->string($id)))->firstRow();
		}
		
		public function getFolderUsers($id) {
			return $this->db->query("SELECT user.id as id, user.name as name, user.permission_mode as permission_mode, user.is_group as is_group FROM ".$this->db->table("user")." as user, ".$this->db->table("user_folder")." as user_folder where user_folder.user_id = user.id and user_folder.folder_id = '".$this->db->string($id)."' ORDER BY user.id ASC")->rows();
		}

		public function addFolderUsers($folderId, $userIds) {
			$this->db->startTransaction();
			foreach($userIds as $id) {
				$this->db->update("INSERT INTO ".$this->db->table("user_folder")." (folder_id, user_id) VALUES (".$this->db->string($folderId).",".$this->db->string($id).")");
			}
			$this->db->commit();
			return TRUE;
		}

		public function removeFolderUsers($folderId, $userIds) {
			$this->db->update("DELETE FROM ".$this->db->table("user_folder")." WHERE folder_id = '".$this->db->string($folderId)."' and user_id in (".$this->db->arrayString($userIds).")");
			return TRUE;
		}

		public function addFolder($name, $path) {
			$this->db->update(sprintf("INSERT INTO ".$this->db->table("folder")." (name, path) VALUES ('%s', '%s')", $this->db->string($name), $this->db->string($path)));
			return $this->db->lastId();
		}

		public function updateFolder($id, $name, $path) {
			$this->db->update(sprintf("UPDATE ".$this->db->table("folder")." SET name='%s', path='%s' WHERE id='%s'", $this->db->string($name), $this->db->string($path), $this->db->string($id)));
			return TRUE;
		}
		
		public function removeFolder($id) {
			$rootItem = $this->env->filesystem()->filesystemFromId($id, FALSE)->root();
			$rootLocation = str_replace("'", "\'", $rootItem->location());
			$rootId = $this->itemId($rootItem);
			$folderId = $this->db->string($id);
			
			$this->db->startTransaction();
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_folder")." WHERE folder_id='%s'", $folderId));
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_description")." WHERE item_id in (select id from ".$this->db->table("item_id")." where path like '%s%%')", $rootLocation));
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_permission")." WHERE item_id in (select id from ".$this->db->table("item_id")." where path like '%s%%')", $rootLocation));
			$affected = $this->db->update(sprintf("DELETE FROM ".$this->db->table("folder")." WHERE id='%s'", $folderId));
			if ($affected === 0)
				throw new ServiceException("INVALID_REQUEST","Invalid delete folder request, folder ".$rootId." not found");
			$this->db->commit();
			return TRUE;
		}

		public function getUserFolders($userId, $includeGroupFolders = FALSE) {
			$folderTable = $this->db->table("folder");
			$userFolderTable = $this->db->table("user_folder");
			$userTable = $this->db->table("user");
			
			$userIds = array($userId);
			if ($includeGroupFolders and $this->env->session()->hasUserGroups()) {
				foreach($this->env->session()->userGroups() as $g)
					$userIds[] = $g['id'];
			}
			$userQuery = sprintf("(uf.user_id in (%s))", $this->db->arrayString($userIds));

			$l = $this->db->query(sprintf("SELECT f.id as id, uf.name as name, f.name as default_name, f.path as path FROM ".$userFolderTable." uf, ".$folderTable." f, ".$userTable." u WHERE %s AND f.id = uf.folder_id AND u.id = uf.user_id ORDER BY u.is_group asc", $userQuery))->rows();
			return $l;
		}
		
		public function addUserFolders($userId, $folderIds) {
			foreach($folderIds as $id) $this->addUserFolder($userId, $id, NULL);
		}
		
		public function addUserFolder($userId, $folderId, $name) {
			if ($name != NULL) {
				$this->db->update(sprintf("INSERT INTO ".$this->db->table("user_folder")." (user_id, folder_id, name) VALUES ('%s', '%s', '%s')", $this->db->string($userId), $this->db->string($folderId), $this->db->string($name)));
			} else {
				$this->db->update(sprintf("INSERT INTO ".$this->db->table("user_folder")." (user_id, folder_id, name) VALUES ('%s', '%s', NULL)", $this->db->string($userId), $this->db->string($folderId)));
			}
						
			return TRUE;
		}
	
		public function updateUserFolder($userId, $folderId, $name) {
			if ($name != NULL) {
				$this->db->update(sprintf("UPDATE ".$this->db->table("user_folder")." SET name='%s' WHERE user_id='%s' AND folder_id='%s'", $this->db->string($name), $this->db->string($userId), $this->db->string($folderId)));
			} else {
				$this->db->update(sprintf("UPDATE ".$this->db->table("user_folder")." SET name = NULL WHERE user_id='%s' AND folder_id='%s'", $this->db->string($userId), $this->db->string($folderId)));
			}
	
			return TRUE;
		}
		
		public function removeUserFolder($userId, $folderId) {
			$this->db->update(sprintf("DELETE FROM ".$this->db->table("user_folder")." WHERE folder_id='%s' AND user_id='%s'", $this->db->string($folderId), $this->db->string($userId)));
			return TRUE;
		}
		
		public function getDefaultPermission($userId) {
			$mode = strtoupper($this->db->query(sprintf("SELECT permission_mode FROM ".$this->db->table("user")." WHERE id='%s'", $this->db->string($userId)))->value());
			$this->env->authentication()->assertPermissionValue($mode);
			return $mode;
		}
		
		function getItemDescription($item) {
			$result = $this->db->query(sprintf("SELECT description FROM ".$this->db->table("item_description")." WHERE item_id='%s'", $this->itemId($item)));
			if ($result->count() < 1) return NULL;
			return $result->value();
		}
				
		function setItemDescription($item, $description) {
			$id = $this->itemId($item);
			$desc = $this->db->string($description);
			$exists = $this->db->query(sprintf("SELECT COUNT(item_id) FROM ".$this->db->table("item_description")." WHERE item_id='%s'", $id))->value() > 0;
			
			if ($exists)
				$this->db->update(sprintf("UPDATE ".$this->db->table("item_description")." SET description='%s' WHERE item_id='%s'", $desc, $id));
			else
				$this->db->update(sprintf("INSERT INTO ".$this->db->table("item_description")." (item_id, description) VALUES ('%s','%s')", $id, $desc));
			return TRUE;
		}
	
		function removeItemDescription($item) {
			if (!$item->isFile()) {
				$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_description")." WHERE item_id in (select id from ".$this->db->table("item_id")." where path like '%s%%')", str_replace("'", "\'", $item->location())));
			} else {
				$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_description")." WHERE item_id='%s'", $this->itemId($item)));
			}
			return TRUE;
		}
		
		public function findItemsWithDescription($parent, $text = FALSE, $recursive = FALSE) {
			$p = $this->db->string(str_replace("\\", "\\\\", str_replace("'", "\'", $parent->location())));
			
		 	if ($recursive) {
			 	$pathFilter = "i.path like '".$p."%'";
		 	} else {
				if (strcasecmp("mysql", $this->env->db()->type()) == 0) {
					$pathFilter = "i.path REGEXP '^".$p."[^/\\\\]+[/\\\\]?$'";
				} else {
					$pathFilter = "REGEX(i.path, \"#^".$p."[^/\\\\]+[/\\\\]?$#\")";
				}
			}
			
			$query = "SELECT item_id, description from ".$this->db->table("item_description")." d, ".$this->db->table("item_id")." i where d.item_id = i.id AND ".$pathFilter;
			if ($text) $query .= " and description like '%".$this->db->string($text)."%'";
			
			return $this->db->query($query)->valueMap("item_id", "description");
		}
							
		function getItemPermission($item, $userId) {
			$mysql = (strcmp("mysql", $this->db->type()) == 0);
			$table = $this->db->table("item_permission");
			$id = $this->itemId($item);
			
			$userQuery = sprintf("(user_id = '%s')", $userId);
			$userIds = array(0, $userId);
			if ($this->env->session()->hasUserGroups()) {
				foreach($this->env->session()->userGroups() as $g)
					$userIds[] = $g['id'];
			}
			$userQuery = sprintf("(user_id in (%s))", $this->db->arrayString($userIds));
			
			// order within category into 1) user specific 2) group 3) item default
			if ($mysql) {
				$subcategoryQuery = sprintf("(IF(user_id = '%s', 1, IF(user_id = '0', 3, 2)))", $userId);
			} else {
				$subcategoryQuery = sprintf("case when user_id = '%s' then 1 when user_id = '0' then 3 else 2 end", $userId);
			}

			// item permissions
			$query = sprintf("SELECT permission, user_id, 1 AS 'category', %s AS 'subcategory' FROM ".$table." WHERE item_id = '%s' AND %s", $subcategoryQuery, $id, $userQuery);
					
			if ($item->isFile() or !$item->isRoot()) {
				$parentLocation = $item->parent()->location();
				$rootLocation = $item->root()->location();
				
				if ($mysql)
					$hierarchyQuery = "(i.path REGEXP '^".str_replace("'", "\'", str_replace("\\", "\\\\", $rootLocation));
				else
					$hierarchyQuery = "REGEX(i.path, '#^".str_replace("'", "\'", str_replace("\\", "\\\\", $rootLocation));
				
				$hierarchyQueryEnd = "";
				$parts = preg_split("/[\/\\\\]+/", substr($parentLocation, strlen($rootLocation)), -1, PREG_SPLIT_NO_EMPTY);
				//Logging::logDebug(Util::array2str($parts));
				foreach($parts as $part) {
					$hierarchyQuery .= "(".str_replace("'", "\'", $part).DIRECTORY_SEPARATOR;
					$hierarchyQueryEnd .= ")*";
				}
				if ($mysql)
					$hierarchyQuery .= $hierarchyQueryEnd."$')";
				else
					$hierarchyQuery .= $hierarchyQueryEnd."$#')";
			
				if ($mysql) {
					$subcategoryQuery = sprintf("(((%s - CHAR_LENGTH(i.path)) * 10) + IF(user_id = '%s', 0, IF(user_id = '0', 2, 1)))", strlen($parentLocation), $userId);
				} else {
					$subcategoryQuery = sprintf("((%s - LENGTH(i.path)) * 10) + (case when user_id = '%s' then 0 when user_id = '0' then 2 else 1 end)", strlen($parentLocation), $userId);
				}
				$query = sprintf("SELECT permission, user_id, case when i.id = '%s' then 1 else 2 end AS category, %s AS subcategory FROM ".$table." p, ".$this->db->table("item_id")." i WHERE p.item_id = i.id AND (i.id = '%s' OR %s) AND %s", $id, $subcategoryQuery, $id, $hierarchyQuery, $userQuery);
			}
			
			$query = "SELECT permission FROM (".$query.") as u ORDER BY u.category ASC, u.subcategory ASC, u.permission DESC";
			
			$result = $this->db->query($query);
			if ($result->count() < 1) return NULL;
			return $result->value();
		}
		
		public function getAllItemPermissions($parent, $userId) {
			$parentLocation = str_replace("'", "\'", str_replace("\\", "\\\\", $parent->location()));
			$table = $this->db->table("item_permission");
			$userIds = array($userId);
			if ($this->env->session()->hasUserGroups()) {
				foreach($this->env->session()->userGroups() as $g)
					$userIds[] = $g['id'];
			}
			$userIds[] = "0";
			$userQuery = sprintf("(user_id in (%s))", $this->db->arrayString($userIds));

			if (strcmp("mysql", $this->db->type()) == 0) {
				$itemFilter = "SELECT distinct item_id from ".$table." p, ".$this->db->table("item_id")." i where p.item_id = i.id and ".$userQuery." and i.path REGEXP '^".$parentLocation."[^/\\\\]+[/\\\\]?$'";
				$query = sprintf("SELECT item_id, permission, (IF(user_id = '%s', 1, IF(user_id = '0', 3, 2))) as ind from %s where %s and item_id in (%s) order by item_id asc, ind asc, permission desc", $userId, $table, $userQuery, $itemFilter);
			} else {
				$itemFilter = "SELECT distinct item_id from ".$table." p, ".$this->db->table("item_id")." i where p.item_id = i.id and ".$userQuery." and REGEX(i.path, \"#^".$parentLocation."[^/\\\\]+[/\\\\]?$#\")";
				$query = sprintf("SELECT item_id, permission, case when user_id = '%s' then 1 when user_id = '0' then 3 else 2 end as ind from %s where %s and item_id in (%s) order by item_id asc, ind asc, permission desc", $userId, $table, $userQuery, $itemFilter);
			}			
			
			$all = $this->db->query($query)->rows();
			$all[] = array(
				"item_id" => $parent->id(),
				"permission" => $this->getItemPermission($parent, $userId)
			);
			$k = array();
			$prev = NULL;
			foreach($all as $p) {
				$id = $p["item_id"];
				if ($id != $prev) $k[$id] = strtoupper($p["permission"]);
				$prev = $id;
			}
			return $k;
		}
	
		function getItemPermissions($item) {
			$id = $this->itemId($item);
			$rows = $this->db->query(sprintf("SELECT user.id as user_id, user.is_group as is_group, item_permission.permission as permission FROM ".$this->db->table("item_permission")." as item_permission LEFT OUTER JOIN ".$this->db->table("user")." as user ON user.id = item_permission.user_id WHERE item_permission.item_id = '%s'", $id))->rows();
			
			$list = array();
			foreach ($rows as $row) {
				if (!isset($row["user_id"]))
					$list[] = array("item_id" => $item->id(), "user_id" => '0', "is_group" => 0, "permission" => $row["permission"]);
				else
					$list[] = array("item_id" => $item->id(), "user_id" => $row["user_id"], "is_group" => $row["is_group"], "permission" => $row["permission"]);
			}
			return $list;
		}
			
		function updateItemPermissions($updates) {
			$new = $updates['new'];
			$modified = $updates['modified'];
			$removed = $updates['removed'];
			$mysql = (strcmp("mysql", $this->db->type()) == 0);
			
			if ($mysql) $this->db->startTransaction();
			if (count($new) > 0) $this->addItemPermissionValues($new);
			if (count($modified) > 0) $this->updateItemPermissionValues($modified);
			if (count($removed) > 0) $this->removeItemPermissionValues($removed);
			if ($mysql) $this->db->commit();
							
			return TRUE;
		}

		private function addItemPermissionValues($list) {
			$query = "INSERT INTO ".$this->db->table("item_permission")." (item_id, user_id, permission) VALUES ";
			$first = TRUE;
			
			foreach($list as $item) {
				$permission = $this->db->string(strtolower($item["permission"]));
				$id = $this->db->string($item["item_id"]);
				$user = '0';
				if ($item["user_id"] != NULL) $user = $this->db->string($item["user_id"]);
				
				if (!$first) $query .= ',';
				$query .= sprintf(" ('%s', '%s', '%s')", $id, $user, $permission);
				$first = FALSE;
			}
			
			$this->db->update($query);							
			return TRUE;
		}
		
		public function addItemPermission($id, $permission, $userId) {
			$permission = $this->db->string(strtolower($permission));
			$id = $this->db->string($id);
			$user = $this->db->string($userId);

			$query = sprintf("INSERT INTO ".$this->db->table("item_permission")." (item_id, user_id, permission) VALUES ('%s', '%s', '%s')", $id, $user, $permission);
			$this->db->update($query);							
			return TRUE;
		}
	
		private function updateItemPermissionValues($list) {
			foreach($list as $item) {
				$permission = $this->db->string(strtolower($item["permission"]));
				$id = $this->db->string($item["item_id"]);
				$user = '0';
				if ($item["user_id"] != NULL) $user = $this->db->string($item["user_id"]);
			
				$this->db->update(sprintf("UPDATE ".$this->db->table("item_permission")." SET permission='%s' WHERE item_id='%s' and user_id='%s'", $permission, $id, $user));
			}
							
			return TRUE;
		}
	
		private function removeItemPermissionValues($list) {
			foreach($list as $item) {
				$id = $this->db->string($item["item_id"]);
				$user = "user_id = '0'";
				if ($item["user_id"] != NULL) $user = sprintf("user_id = '%s'", $this->db->string($item["user_id"]));
				$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_permission")." WHERE item_id='%s' AND %s", $id, $user));
			}
							
			return TRUE;
		}

		function removeItemPermissions($item) {
			if (!$item->isFile()) {
				$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_permission")." WHERE item_id in (select id from ".$this->db->table("item_id")." where path like '%s%%')", str_replace("'", "\'", $item->location())));
			} else {
				$this->db->update(sprintf("DELETE FROM ".$this->db->table("item_permission")." WHERE item_id='%s'", $this->itemId($item)));
			}
			return TRUE;
		}
				
		private function itemId($item) {
			return $this->db->string($item->id());
		}
		
		function log() {}
		
		public function __toString() {
			return "ConfigurationDao";
		}
	}
?>
