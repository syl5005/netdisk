<?php

	/**
	 * ConfigurationServices.class.php
	 *
	 * Copyright 2008- Samuli J�rvel�
	 * Released under GPL License.
	 *
	 * License: http://www.mollify.org/license.php
	 */

	class ConfigurationServices extends ServicesBase {
		private static $ITEMS = array("settings", "users", "usergroups", "usersgroups", "folders");
				
		protected function isValidPath($method, $path) {
			if (count($path) == 0) return FALSE;
			if (!in_array($path[0], self::$ITEMS)) return FALSE;
			return TRUE;
		}
		
		public function processGet() {
			$this->env->authentication()->assertAdmin();
			
			switch($this->path[0]) {
				case 'settings':
					$this->processGetSettings();
					break;
				case 'users':
					$this->processGetUsers();
					break;
				case 'usergroups':
					$this->processGetUserGroups();
					break;
				case 'usersgroups':
					$this->processGetUsersAndGroups();
					break;
				case 'folders':
					$this->processGetFolders();
					break;
				default:
					throw $this->invalidRequestException();
			}
		}
		
		public function processPost() {
			$this->env->authentication()->assertAdmin();
			
			switch($this->path[0]) {
				case 'users':
					$this->processPostUsers();
					break;
				case 'usergroups':
					$this->processPostUserGroups();
					break;
				case 'folders':
					$this->processPostFolders();
					break;
				default:
					throw $this->invalidRequestException();
			}
		}
		
		public function processPut() {
			if (count(array_diff(array("users", "current", "password"), $this->path)) > 0)
				$this->env->authentication()->assertAdmin();
			
			switch($this->path[0]) {
				case 'users':
					$this->processPutUsers();
					break;
				case 'usergroups':
					$this->processPutUserGroups();
					break;
				case 'folders':
					$this->processPutFolders();
					break;
				default:
					throw $this->invalidRequestException();
			}
		}

		public function processDelete() {
			$this->env->authentication()->assertAdmin();
			
			switch($this->path[0]) {
				case 'users':
					$this->processDeleteUsers();
					break;
				case 'usergroups':
					$this->processDeleteUserGroups();
					break;
				case 'folders':
					$this->processDeleteFolders();
					break;
				default:
					throw $this->invalidRequestException();
			}
		}

		private function processGetSettings() {
			$this->response()->success(array(
				"authentication_methods" => $this->env->settings()->setting("authentication_methods"),
				"published_folders_root" => $this->env->settings()->setting("published_folders_root")
			));
		}	
		
		private function processGetUsersAndGroups() {
			if (count($this->path) == 1) {
				$this->response()->success(array(
					"users" => $this->env->configuration()->getAllUsers(),
					"groups" => $this->env->features()->isFeatureEnabled("user_groups") ? $this->env->configuration()->getAllUserGroups() : array()
				));
				return;
			}
			throw $this->invalidRequestException();
		}		
		
		private function processGetUsers() {
			if (count($this->path) == 1) {
				$this->response()->success($this->env->configuration()->getAllUsers());
				return;
			}
			$userId = $this->path[1];
			if (count($this->path) == 2) {
				$user = $this->env->configuration()->getUser($userId);
				$auth = $this->env->configuration()->getUserAuth($userId);
				$user["auth"] = $auth["type"];
				$this->response()->success($user);
				return;
			}
			if (count($this->path) == 3)
				switch($this->path[2]) {
					case 'groups':
						$this->response()->success($this->env->configuration()->getUsersGroups($userId));
						return;
					case 'folders':
						$this->response()->success($this->env->configuration()->getUserFolders($userId));
						return;
			}
			throw $this->invalidRequestException();
		}
		
		private function processUserQuery() {
			$data = $this->request->data;
			$rows = isset($data["count"]) ? $data["count"] : 50;
			$start = isset($data["start"]) ? $data["start"] : 0;
			
			$sort = NULL;
			$allowedFields = array("id", "name", "email", "permission_mode");

			if (isset($data["sort"]) and isset($data["sort"]["id"])) {
				$sort = $data["sort"];
				
				if (!in_array($sort["id"], $allowedFields))
					throw $this->invalidRequestException();
				
				if (isset($sort["asc"]) and $sort["asc"]) {
					$sort["asc"] = TRUE;	
				} else {
					$sort["asc"] = FALSE;
				}
			}
			$criteria = array();
			if (isset($data["criteria"]) and is_array($data["criteria"])) {
				foreach($data["criteria"] as $k => $v) {
					if (!isset($k) or !isset($v)) continue;
					if (!in_array($k, $allowedFields)) continue;
					$criteria[$k] = str_replace("*", "%", $v);
				}
			}
			$criteria["is_group"] = 0;
			
			return $this->env->configuration()->userQuery($rows, $start, $criteria, $sort);
		}
		
		private function processPostUsers() {
			if (!$this->request->hasData()) throw $this->invalidRequestException();
			
			// user
			if (count($this->path) == 1) {
				$user = $this->request->data;
				if (!isset($user['name']) or !isset($user['password']) or !isset($user['permission_mode'])) throw $this->invalidRequestException();
				$user['permission_mode'] = strtoupper($user['permission_mode']);
				$this->env->authentication()->assertPermissionValue($user['permission_mode']);
				
				$auths = $this->env->settings()->setting("authentication_methods");
				$auth = NULL;
				//TODO verify auth
				if (isset($user['auth']) and $user['auth'] != NULL) $auth = strtoupper($user['auth']);

				$expiration = NULL;
				if (isset($user['expiration']) and $user['expiration'] != NULL) {
					if (!is_numeric($user["expiration"])) throw $this->invalidRequestException("Invalid data type: expiration");
					$expiration = $user['expiration'];
				}
				
				$id = $this->env->configuration()->addUser($user['name'], isset($user['lang']) ? $user['lang'] : NULL, isset($user['email']) ? $user['email'] : NULL, $user['permission_mode'], $expiration);
				$this->env->configuration()->storeUserAuth($id, $user['name'], $auth, base64_decode($user['password']));
				$this->env->events()->onEvent(UserEvent::userAdded($id, $user['name'], isset($user['email']) ? $user['email'] : NULL));
				$this->response()->success(TRUE);
				return;
			}
			
			if (count($this->path) == 2 and $this->path[1] == "query") {
				$this->response()->success($this->processUserQuery());
				return;
			}
			
			if (count($this->path) == 3) {
				$userId = $this->path[1];
				
				switch ($this->path[2]) {
					// user/xx/groups
					case 'groups':
						$groups = $this->request->data;
						$this->response()->success($this->env->configuration()->addUsersGroups($userId, $groups));
						return;
						
					// user/xx/folders
					case 'folders':
						$folder = $this->request->data;
						if (!is_array($folder) and !isset($folder['id'])) throw $this->invalidRequestException("No folder data");
						
						if (is_array($folder)) {
							foreach($folder as $f)
								$this->env->configuration()->addUserFolder($userId, $f['id'], isset($f['name']) ? $f['name'] : NULL);
							$this->response()->success(TRUE);
							return;
						} else {						
							$this->env->configuration()->addUserFolder($userId, $folder['id'], isset($folder['name']) ? $folder['name'] : NULL);
							$this->response()->success(TRUE);
							return;
						}
				}
			}
			throw $this->invalidRequestException();
		}

		private function processPutUsers() {
			if (count($this->path) < 2 or !$this->request->hasData()) throw $this->invalidRequestException();
			$userId = $this->path[1];
			
			// users/xx
			if (count($this->path) == 2) {
				$user = $this->request->data;
				if (!isset($user['name']) or !isset($user['permission_mode'])) throw $this->invalidRequestException();
				$user['permission_mode'] = strtoupper($user['permission_mode']);
				$this->env->authentication()->assertPermissionValue($user['permission_mode']);
				
				$expiration = NULL;
				//TODO validate time
				if (isset($user['expiration']) and $user['expiration'] != NULL)
					$expiration = $user['expiration'];

				$this->env->configuration()->updateUser($userId, $user['name'], isset($user['lang']) ? $user['lang'] : NULL, isset($user['email']) ? $user['email'] : NULL, $user['permission_mode'], $expiration);
				$auth = NULL;
				if (isset($user['auth'])) {
					$auth = strtoupper($user['auth']);
					
					//TODO verify $auth	
					$this->env->configuration()->updateUserAuthType($userId, $auth);
				} else {
					$this->env->configuration()->updateUserAuthType($userId, NULL);
				}
				
				$this->response()->success(TRUE);
				return;
			}
			
			if (count($this->path) == 3) {
				$userId = $this->path[1];
				
				switch ($this->path[2]) {
					// users/xx/password
					case 'password':
						$this->env->features()->assertFeature("change_password");
						$username = NULL;
						
						$pw = $this->request->data;
						if (!isset($pw['new'])) throw $this->invalidRequestException();
						
						if ($userId === 'current') {
							if (!isset($pw['old'])) throw $this->invalidRequestException();
							$userId = $this->env->session()->userId();
							$username = $this->env->session()->username();
							if (!$this->env->authentication()->authenticate($userId, base64_decode($pw['old'])))
								throw new ServiceException("AUTHENTICATION_FAILED");
						} else {
							$user = $this->env->configuration()->getUser($userId);
							if (!$user) throw $this->invalidRequestException();
							$username = $user["name"];
						}
						
						$this->response()->success($this->env->configuration()->updateUserAuth($userId, $username, base64_decode($pw['new']), FALSE));
						return;
				}				
			}

			// users/xx/folders/xx
			if (count($this->path) == 4) {
				switch ($this->path[2]) {
					case 'folders':
						$folderId = $this->path[3];
						$folder = $this->request->data;
						
						$this->env->configuration()->updateUserFolder($userId, $folderId, isset($folder['name']) ? $folder['name'] : NULL);
						$this->response()->success(TRUE);
						return;
				}
			}
			throw $this->invalidRequestException();
		}

		private function processDeleteUsers() {
			if (count($this->path) < 1) throw $this->invalidRequestException();

			// configuration/users
			if (count($this->path) == 1) {
				$data = $this->request->data;
				if (!isset($data['ids'])) throw $this->invalidRequestException();
				$ids = $data['ids'];
				if (!$ids or !is_array($ids) or count($ids) == 0) throw $this->invalidRequestException();
				
				$this->env->configuration()->removeUsers($ids);
				foreach($ids as $id)
					$this->env->events()->onEvent(UserEvent::userRemoved($id));
				$this->response()->success(TRUE);
				
				return;	
			}
			
			$userId = $this->path[1];
			// configuration/users/xx
			if (count($this->path) == 2) {
				$this->env->configuration()->removeUser($userId);
				$this->env->events()->onEvent(UserEvent::userRemoved($userId));
				$this->response()->success(TRUE);
				return;
			}
			// configuration/users/xx/folders
			if (count($this->path) >= 3 and $this->path[2] === 'folders') {
				$ids = array();
				if (count($this->path) == 4) {
					// configuration/users/xx/folders/xx
					$ids[] = $this->path[3];
				} else {
					$data = $this->request->data;
					if (!isset($data['ids'])) throw $this->invalidRequestException();
					$ids = $data['ids'];
					if (!$ids or !is_array($ids) or count($ids) == 0) throw $this->invalidRequestException();
				}
				foreach($ids as $id)
					$this->env->configuration()->removeUserFolder($userId, $id);
					//TODO event
				$this->response()->success(TRUE);
				return;
			}
			if (count($this->path) >= 3 and $this->path[2] === 'groups') {
				$ids = array();
				if (count($this->path) == 4) {
					$ids[] = $this->path[3];
				} else {
					$data = $this->request->data;
					if (!isset($data['ids'])) throw $this->invalidRequestException();
					$ids = $data['ids'];
					if (!$ids or !is_array($ids) or count($ids) == 0) throw $this->invalidRequestException();
				}
				$this->env->configuration()->removeUsersGroups($userId, $ids);
				//TODO event
				$this->response()->success(TRUE);
				return;
			}
			throw $this->invalidRequestException();
		}

		private function processGetUserGroups() {
			// configuration/groups/
			if (count($this->path) == 1) {
				$this->response()->success($this->env->configuration()->getAllUserGroups());
				return;
			}
			
			// configuration/groups/xx/
			if (count($this->path) == 2) {
				$this->response()->success($this->env->configuration()->getUserGroup($this->path[1]));
				return;
			}
			
			// configuration/groups/xx/users/
			if (count($this->path) == 3) {
				if ($this->path[2] != 'users') throw $this->invalidRequestException();
				$this->response()->success($this->env->configuration()->getGroupUsers($this->path[1]));
				return;
			}
			
			throw $this->invalidRequestException();
		}
		
		private function processPostUserGroups() {
			if (!$this->request->hasData()) throw $this->invalidRequestException();
			
			if (count($this->path) == 1) {
				$group = $this->request->data;
				if (!isset($group['name'])) throw $this->invalidRequestException();
								
				$id = $this->env->configuration()->addUserGroup($group['name'], $group['description']);
				$this->env->events()->onEvent(UserEvent::groupAdded($id, $group['name']));
				$this->response()->success(TRUE);
				return;
			}
			
			if (count($this->path) == 3) {
				$id = $this->path[1];		
				$users = $this->request->data;
				
				switch ($this->path[2]) {
					case 'users':
						$this->env->configuration()->addGroupUsers($id, $users);
						$this->response()->success(TRUE);
						return;
					case 'remove_users':
						$this->env->configuration()->removeGroupUsers($id, $users);
						$this->response()->success(TRUE);
					return;
				}
			}
			throw $this->invalidRequestException();
		}

		private function processPutUserGroups() {
			if (count($this->path) != 2 or !$this->request->hasData()) throw $this->invalidRequestException();

			$id = $this->path[1];
			$group = $this->request->data;
			if (!isset($group['name'])) throw $this->invalidRequestException();

			$this->env->configuration()->updateUserGroup($id, $group['name'], $group['description']);
			$this->response()->success(TRUE);			
		}
		
		private function processDeleteUserGroups() {
			if (count($this->path) != 2) throw $this->invalidRequestException();

			$id = $this->path[1];
			$this->env->configuration()->removeUserGroup($id);
			$this->env->events()->onEvent(UserEvent::groupRemoved($id));
			$this->response()->success(TRUE);			
		}

		private function processGetFolders() {
			if (count($this->path) == 1) {
				$list = $this->env->configuration()->getFolders();
				$root = $this->env->settings()->setting("published_folders_root");				
				if ($root != NULL) {
					$root = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
					$i = 0;
					foreach($list as $f) {
						if (strpos($f["path"], $root) == 0)
							$list[$i]["path"] = substr($f["path"], strlen($root));
						$i++;
					}
				}
					
				$this->response()->success($list);
				return;
			}
			$folderId = $this->path[1];
			
			if (count($this->path) == 3) {
				switch ($this->path[2]) {
					case 'users':
						$this->response()->success($this->env->configuration()->getFolderUsers($folderId));
						return;
				}
			}

			throw $this->invalidRequestException();
		}
		
		private function processPostFolders() {
			if (!$this->request->hasData()) throw $this->invalidRequestException();
			
			if (count($this->path) == 1) {
				$folder = $this->request->data;
				
				$root = $this->env->settings()->setting("published_folders_root");
				if ($root != NULL) {
					if (strpos($folder['path'], "/") === 0 or strpos($folder['path'], ":\\") == 1)
						throw $this->invalidRequestException("Published folders root defined, absolute paths not allowed");
					$folder['path'] = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$folder['path'];
				}
				
				if (!isset($folder['name']) or !isset($folder['path'])) throw $this->invalidRequestException();
				$createNonExisting = (isset($folder['create']) and ($folder['create'] == "1" or strcasecmp("true", $folder['create']) == 0));
				
				if (!$createNonExisting) {
					$this->env->filesystem()->assertFilesystem($folder);
				} else {
					$fs = $this->env->filesystem()->filesystem($folder, FALSE);
					if (!$fs->exists()) {
						Logging::logDebug("Added folder does not exist, creating: ".$folder['path']);
						$fs->create();
					}
				}
				
				$this->env->configuration()->addFolder($folder['name'], $folder['path']);
				$this->response()->success(TRUE);
				return;
			}
			
			if (count($this->path) == 3) {
				$id = $this->path[1];		
				$users = $this->request->data;
				
				switch ($this->path[2]) {
					case 'users':
						$this->env->configuration()->addFolderUsers($id, $users);
						$this->response()->success(TRUE);
						return;
					case 'remove_users':
						$this->env->configuration()->removeFolderUsers($id, $users);
						$this->response()->success(TRUE);
					return;
				}
			}
			
			throw $this->invalidRequestException();
		}
		
		private function processPutFolders() {
			if (count($this->path) != 2 or !$this->request->hasData()) throw $this->invalidRequestException();
			
			$id = $this->path[1];
			$folder = $this->request->data;
			if (!isset($folder['name']) or !isset($folder['path'])) throw $this->invalidRequestException();
			$root = $this->env->settings()->setting("published_folders_root", TRUE);
			if ($root != NULL) {
				if (strpos($folder['path'], "/") == 0 or strpos($folder['path'], ":\\") == 1)
					throw $this->invalidRequestException("Published folders root defined, absolute paths not allowed");
				$folder['path'] = rtrim($root, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$folder['path'];
			}
			
			$this->env->filesystem()->assertFilesystem($folder);
			$this->env->configuration()->updateFolder($id, $folder['name'], $folder['path']);
			$this->response()->success(TRUE);	
		}
		
		private function processDeleteFolders() {
			if (count($this->path) < 1 or count($this->path) > 2) throw $this->invalidRequestException();
			$roots = $this->env->filesystem()->getRootFoldersByKey(TRUE);
			
			// configuration/folders
			if (count($this->path) == 1) {
				$data = $this->request->data;
				if (!isset($data['ids'])) throw $this->invalidRequestException();
				$ids = $data['ids'];
				if (!$ids or !is_array($ids) or count($ids) == 0) throw $this->invalidRequestException();
				
				foreach($ids as $id) {
					if (!array_key_exists($id, $roots)) throw $this->invalidRequestException("Invalid root ".$id);
					$folder = $roots[$id];
					$this->env->configuration()->removeFolder($id);
				}
				$this->response()->success(TRUE);
				
				return;	
			}

			$id = $this->path[1];

			if (!array_key_exists($id, $roots)) throw $this->invalidRequestException("Invalid root ".$id);
			$folder = $roots[$id];
			
			if ($this->request->hasParam("delete") and strcasecmp("true", $this->request->param("delete")) == 0)
				$this->env->filesystem()->delete($folder);

			$this->env->configuration()->removeFolder($id);
			$this->response()->success(TRUE);	
		}
		
		public function __toString() {
			return "ConfigurationServices";
		}
	}
?>