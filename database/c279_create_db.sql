-- Generated using MySQL Workbench with some manual tweaks

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema c279
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `c279` DEFAULT CHARACTER SET utf8 ;
USE `c279` ;

-- -----------------------------------------------------
-- Table `c279`.`Users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Users` (
  `UserId` INT NOT NULL AUTO_INCREMENT,
  `Username` VARCHAR(45) NOT NULL UNIQUE,
  `RealName` VARCHAR(45) NULL,
  PRIMARY KEY (`UserId`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`UserCredentials`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`UserCredentials` (
  `Users_UserId` INT NOT NULL,
  `Password` VARCHAR(88) NOT NULL,
  `Salt` VARCHAR(88) NOT NULL,
  `PubKey` VARCHAR(88) NOT NULL,
  `EncryptedPrivKey` VARCHAR(88) NOT NULL,
  `EncryptedPrivKeyNonce` VARCHAR(88) NOT NULL,
  `ClientSymKdfSalt` VARCHAR(88) NOT NULL,
  INDEX `fk_UserCredentials_Users_idx` (`Users_UserId` ASC),
  PRIMARY KEY (`Users_UserId`),
  CONSTRAINT `fk_UserCredentials_Users`
    FOREIGN KEY (`Users_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Contacts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Contacts` (
  `ContactId` INT NOT NULL AUTO_INCREMENT,
  `Owning_UserId` INT NOT NULL,
  `Target_UserId` INT NOT NULL,
  `DateAdded` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ContactTypes_ContactTypeId` INT NOT NULL,
  PRIMARY KEY (`ContactId`),
  INDEX `fk_Contacts_Users2_idx` (`Owning_UserId` ASC),
  INDEX `fk_Contacts_Users1_idx` (`Target_UserId` ASC),
  INDEX `fk_Contacts_ContactTypes1_idx` (`ContactTypes_ContactTypeId` ASC),
  CONSTRAINT `fk_Contacts_Users2`
    FOREIGN KEY (`Owning_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Contacts_Users1`
    FOREIGN KEY (`Target_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Contacts_ContactTypes1`
    FOREIGN KEY (`ContactTypes_ContactTypeId`)
    REFERENCES `c279`.`ContactTypes` (`ContactTypeId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
    )
ENGINE = InnoDB;


-- STATIC DATA TABLE
CREATE TABLE IF NOT EXISTS `c279`.`ContactTypes` (
  `ContactTypeId` INT NOT NULL,
  `ContactType` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`ContactTypeId`))
ENGINE = InnoDB;

START TRANSACTION;
INSERT INTO ContactTypes(ContactTypeId, ContactType) VALUES(1, "Trusted Friend");
INSERT INTO ContactTypes(ContactTypeId, ContactType) VALUES(2, "Friend");
INSERT INTO ContactTypes(ContactTypeId, ContactType) VALUES(3, "Guest");
INSERT INTO ContactTypes(ContactTypeId, ContactType) VALUES(4, "Blocked");
COMMIT;


-- -----------------------------------------------------
-- Table `c279`.`Sessions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Sessions` (
  `SessionId` INT NOT NULL,
  `SessionType` VARCHAR(10) NOT NULL,
  `SessionStartDate` DATETIME NOT NULL,
  PRIMARY KEY (`SessionId`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`UserToSession`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`UserToSession` (
  `Sessions_SessionId` INT NOT NULL,
  `Users_UserId` INT NOT NULL,
  PRIMARY KEY (`Sessions_SessionId`, `Users_UserId`),
  INDEX `fk_Sessions_has_Users_Users1_idx` (`Users_UserId` ASC),
  INDEX `fk_Sessions_has_Users_Sessions1_idx` (`Sessions_SessionId` ASC),
  CONSTRAINT `fk_Sessions_has_Users_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Sessions_has_Users_Users1`
    FOREIGN KEY (`Users_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`DirectMessages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`DirectMessages` (
  `DirectMessageId` INT NOT NULL AUTO_INCREMENT,
  `EncryptedText` TEXT NOT NULL,
  `Sender_UserId` INT NOT NULL,
  `Receiver_UserId` INT NOT NULL,
  `Nonce` VARCHAR(88) NOT NULL,
  `DateSent` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`DirectMessageId`),
  INDEX `fk_DirectMessages_Users1_idx` (`Sender_UserId` ASC),
  INDEX `fk_DirectMessages_Users2_idx` (`Receiver_UserId` ASC),
  CONSTRAINT `fk_DirectMessages_Users1`
    FOREIGN KEY (`Sender_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_DirectMessages_Users2`
    FOREIGN KEY (`Receiver_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`GroupMessages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`GroupMessages` (
  `GroupMessageId` INT NOT NULL AUTO_INCREMENT,
  `Sessions_SessionId` INT NOT NULL,
  `EncryptedText` TEXT NOT NULL,
  `Sender_UserId` INT NOT NULL,
  `Nonce` VARCHAR(88) NOT NULL,
  `DateSent` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`GroupMessageId`),
  INDEX `fk_GroupMessages_Sessions1_idx` (`Sessions_SessionId` ASC),
  INDEX `fk_GroupMessages_Users1_idx` (`Sender_UserId` ASC),
  CONSTRAINT `fk_GroupMessages_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_GroupMessages_Users1`
    FOREIGN KEY (`Sender_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`Files`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`Files` (
  `FileId` INT NOT NULL AUTO_INCREMENT,
  `FileName` VARCHAR(100) NOT NULL,
  `EncryptedFileData` TEXT NOT NULL,
  `Nonce` VARCHAR(88) NOT NULL,
  `OwnerEncryptedHeader` VARCHAR(64) NOT NULL,
  `FileOwner_UserId` INT NOT NULL,
  PRIMARY KEY (`FileId`),
  INDEX `fk_Files_Users1_idx` (`FileOwner_UserId` ASC),
  CONSTRAINT `fk_Files_Users1`
    FOREIGN KEY (`FileOwner_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`FileEncryptionHeaderStore`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`FileEncryptionHeaderStore` (
  `HeaderId` INT NOT NULL AUTO_INCREMENT,
  `Files_FileId` INT NOT NULL,
  `Sharer_UserId` INT NOT NULL,
  `Sharee_UserId` INT NOT NULL,
  `encryptedEncryptionHeader` VARCHAR(88) NOT NULL,
  PRIMARY KEY (`HeaderId`),
  INDEX `fk_FileEncryptionHeaderStore_Files1_idx` (`Files_FileId` ASC),
  INDEX `fk_FileEncryptionHeaderStore_Users1_idx` (`Sharer_UserId` ASC),
  INDEX `fk_FileEncryptionHeaderStore_Users2_idx` (`Sharee_UserId` ASC),
  CONSTRAINT `fk_FileEncryptionHeaderStore_Files1`
    FOREIGN KEY (`Files_FileId`)
    REFERENCES `c279`.`Files` (`FileId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_FileEncryptionHeaderStore_Users1`
    FOREIGN KEY (`Sharer_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_FileEncryptionHeaderStore_Users2`
    FOREIGN KEY (`Sharee_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `c279`.`GroupSessionSymmetricKey`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `c279`.`GroupSessionSymmetricKey` (
  `SessionSymmetricKeyId` INT NOT NULL AUTO_INCREMENT,
  `Owner_UserId` INT NOT NULL,
  `Sessions_SessionId` INT NOT NULL,
  INDEX `fk_GroupSessionSymmetricKey_Sessions1_idx` (`Sessions_SessionId` ASC),
  INDEX `fk_GroupSessionSymmetricKey_Users1_idx` (`Owner_UserId` ASC),
  PRIMARY KEY (`SessionSymmetricKeyId`),
  CONSTRAINT `fk_GroupSessionSymmetricKey_Sessions1`
    FOREIGN KEY (`Sessions_SessionId`)
    REFERENCES `c279`.`Sessions` (`SessionId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_GroupSessionSymmetricKey_Users1`
    FOREIGN KEY (`Owner_UserId`)
    REFERENCES `c279`.`Users` (`UserId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
