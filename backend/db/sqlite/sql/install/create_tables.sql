CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  lang char(2) NULL,
  description varchar(255) NOT NULL DEFAULT '',
  permission_mode char(2) NULL,
  email varchar(128) NULL,
  auth varchar(8) NULL,
  is_group TINYINT(1) NOT NULL,
  expiration bigint(11) NULL
);
CREATE TABLE user_auth (
  user_id INTEGER PRIMARY KEY,
  type varchar(8) NULL,
  salt char(128) NOT NULL,
  hash char(128) NOT NULL,
  a1hash char(128) NULL,
  FOREIGN KEY(user_id) REFERENCES user(id)
);
CREATE TABLE user_group (
  user_id int(11) NOT NULL,
  group_id int(11) NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY(user_id) REFERENCES user(id)
  FOREIGN KEY(group_id) REFERENCES user(id)
);
CREATE TABLE folder (
  id INTEGER PRIMARY KEY,
  name varchar(255) NOT NULL,
  path varchar(255) NOT NULL
);
CREATE TABLE item_description (
  item_id char(255) NOT NULL,
  description varchar(512) NOT NULL,
  PRIMARY KEY (item_id)
);
CREATE TABLE item_id (
  id char(13) NOT NULL,
  path char(255) NOT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE item_permission (
  user_id int(11) NULL DEFAULT 0,
  item_id char(255) NOT NULL,
  permission char(2) NOT NULL,
  PRIMARY KEY (user_id,item_id)
);
CREATE TABLE user_folder (
  user_id int(11) NOT NULL,
  folder_id int(11) NOT NULL,
  name varchar(255) NULL,
  PRIMARY KEY (user_id,folder_id),
  FOREIGN KEY(folder_id) REFERENCES folder(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
);
CREATE TABLE parameter (
  name char(255) NOT NULL,
  value char(255) NOT NULL,
  PRIMARY KEY (name)
);
CREATE TABLE event_log (
  id INTEGER PRIMARY KEY,
  time bigint(11) NOT NULL,
  user varchar(128) NULL,
  ip varchar(128) NULL,
  type varchar(128) NOT NULL,
  item varchar(512) NULL,
  details varchar(1024) NULL
);
CREATE TABLE session (
  id char(32) NOT NULL,
  user_id int(11) NOT NULL,
  time bigint(11) NOT NULL,
  last_access bigint(11) NOT NULL,
  ip varchar(128) NULL,
  PRIMARY KEY (id)
);
CREATE TABLE session_data (
  session_id char(32) NOT NULL,
  name char(64) NOT NULL,
  value varchar(128) NULL,
  PRIMARY KEY (session_id,name),
  FOREIGN KEY(session_id) REFERENCES session(id)
);