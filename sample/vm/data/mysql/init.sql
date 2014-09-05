SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

DROP SCHEMA IF EXISTS `ravel_schema` ;
CREATE SCHEMA IF NOT EXISTS `ravel_schema` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin ;
USE `ravel_schema` ;

-- -----------------------------------------------------
-- Table `ravel_schema`.`registered_user`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ravel_schema`.`registered_user` ;

CREATE TABLE IF NOT EXISTS `ravel_schema`.`registered_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `auth_id` VARCHAR(150) NULL,
  `auth_provider` VARCHAR(50) NOT NULL,
  `preferred_email` VARCHAR(250) NOT NULL,
  `preferred_email_md5` VARCHAR(32) NULL,
  `display_name` VARCHAR(250) NULL,
  `given_name` VARCHAR(200) NULL,
  `family_name` VARCHAR(200) NULL,
  `middle_name` VARCHAR(200) NULL,
  `picture_url` VARCHAR(1024) NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT true,
  `default_workspace_id` BIGINT UNSIGNED NULL,
  `beta_key` VARCHAR(16) NULL,
  `last_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `preferred_email_UNIQUE` (`preferred_email` ASC),
  INDEX `fk_registered_user_1_idx` (`default_workspace_id` ASC),
  CONSTRAINT `fk_registered_user_1`
    FOREIGN KEY (`default_workspace_id`)
    REFERENCES `ravel_schema`.`workspace` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
COMMENT = 'Store auth_id as SHA-512 hash of OpenID.';


-- -----------------------------------------------------
-- Table `ravel_schema`.`workspace`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `ravel_schema`.`tag` ;

CREATE TABLE IF NOT EXISTS `ravel_schema`.`tag` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `creation_date` TIMESTAMP NOT NULL,
  `name` VARCHAR(250) NOT NULL,
  `owner_id` BIGINT UNSIGNED NOT NULL,
  `last_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_tag_registered_user_idx` (`owner_id` ASC),
  CONSTRAINT `fk_tag_registered_user`
    FOREIGN KEY (`owner_id`)
    REFERENCES `ravel_schema`.`registered_user` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;